import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { downloadFocusNfeDocument, getFocusBaseUrl } from "@/lib/services/focusNfe";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathParts = params.path || [];
  const relativeKey = pathParts.join("/");

  if (!relativeKey) {
    return new NextResponse("Arquivo não especificado", { status: 400 });
  }

  // 1. Tenta carregar do disco local (public/storage/...)
  const localFilePath = path.join(process.cwd(), "public", "storage", relativeKey);
  const isPdf = relativeKey.endsWith(".pdf");
  const isXml = relativeKey.endsWith(".xml");
  const isZip = relativeKey.endsWith(".zip");

  if (fs.existsSync(localFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(localFilePath);
      const isBufferValidPdf = isPdf && fileBuffer.slice(0, 5).toString() === "%PDF-";
      const isBufferValidXml = isXml && fileBuffer.slice(0, 1).toString() === "<";
      const isBufferValidOther = !isPdf && !isXml && fileBuffer.length > 0;

      if (isBufferValidPdf || isBufferValidXml || isBufferValidOther) {
        const contentType = isPdf
          ? "application/pdf"
          : isXml
          ? "application/xml"
          : isZip
          ? "application/zip"
          : "application/octet-stream";

        const filename = path.basename(relativeKey);

        return new Response(new Uint8Array(fileBuffer), {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "public, max-age=3600",
          },
        });
      } else {
        // Cache corrompido ou JSON salvo no lugar do binário
        try { fs.unlinkSync(localFilePath); } catch (_) {}
      }
    } catch (readErr) {
      console.warn("[Storage Route] Falha ao ler arquivo do disco local:", readErr);
    }
  }

  // 2. Se o arquivo não estiver no disco local (ou cache inválido), busca na Focus NFe sob demanda
  if (isPdf || isXml) {
    const filename = path.basename(relativeKey, path.extname(relativeKey));
    const cleanChave = filename.replace(/\D/g, "");

    const invoice = await prismaAdmin.invoice.findFirst({
      where: {
        OR: [
          { chaveAcesso: filename },
          ...(cleanChave ? [{ chaveAcesso: cleanChave }] : []),
          ...(cleanChave.length >= 44 ? [{ chaveAcesso: { contains: cleanChave.substring(cleanChave.length - 44) } }] : []),
          { focusNfeRef: filename },
          { idempotencyKey: filename },
        ],
      },
      include: { tenant: true },
    });

    if (invoice && invoice.tenant) {
      const tenant = invoice.tenant;
      const token =
        tenant.ambiente === "PRODUCAO"
          ? tenant.focusNfeTokenProducao
          : tenant.focusNfeTokenHomologacao;

      if (token) {
        const raw = (invoice.rawJson as any) || {};
        let caminhoDanfe = raw.caminho_danfe || raw.ultimaConsultaFocus?.caminho_danfe || raw.webhookPayload?.caminho_danfe;
        let caminhoXml = raw.caminho_xml_nota_fiscal || raw.ultimaConsultaFocus?.caminho_xml_nota_fiscal || raw.webhookPayload?.caminho_xml_nota_fiscal;

        // Se não tiver os caminhos gravados, consulta na Focus NFe via ref
        if ((isPdf && !caminhoDanfe) || (isXml && !caminhoXml)) {
          if (invoice.focusNfeRef) {
            try {
              const { getNfeStatusFromFocus } = await import("@/lib/services/focusNfe");
              const statusRes = await getNfeStatusFromFocus({
                ref: invoice.focusNfeRef,
                token,
                ambiente: tenant.ambiente,
              });
              if (statusRes.success && statusRes.data) {
                caminhoDanfe = statusRes.data.caminho_danfe || caminhoDanfe;
                caminhoXml = statusRes.data.caminho_xml_nota_fiscal || caminhoXml;
              }
            } catch (statusErr) {
              console.warn("[Storage Route] Erro ao consultar caminhos na Focus:", statusErr);
            }
          }
        }

        const candidatePaths: string[] = [];
        if (isPdf && caminhoDanfe) candidatePaths.push(caminhoDanfe);
        if (isXml && caminhoXml) candidatePaths.push(caminhoXml);

        for (const fPath of candidatePaths) {
          const docRes = await downloadFocusNfeDocument(fPath, token, tenant.ambiente);
          if (docRes.success && docRes.buffer) {
            const buf = docRes.buffer;
            const isValid =
              (isPdf && buf.slice(0, 5).toString() === "%PDF-") ||
              (isXml && buf.slice(0, 1).toString() === "<");

            if (isValid) {
              // Salva em cache local no disco
              try {
                const dir = path.dirname(localFilePath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(localFilePath, buf);
              } catch (writeErr) {
                console.warn("[Storage Route] Aviso ao salvar em cache:", writeErr);
              }

              const extension = isPdf ? "pdf" : "xml";
              return new Response(new Uint8Array(buf), {
                status: 200,
                headers: {
                  "Content-Type": isPdf ? "application/pdf" : "application/xml",
                  "Content-Disposition": `inline; filename="${filename}.${extension}"`,
                  "Cache-Control": "public, max-age=3600",
                },
              });
            }
          }
        }
      }
    }
  }

  return new NextResponse("Arquivo não encontrado", { status: 404 });
}
