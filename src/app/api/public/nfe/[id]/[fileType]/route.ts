import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { downloadFocusNfeDocument } from "@/lib/services/focusNfe";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
    fileType: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id, fileType } = params;
  const isPdf = fileType.toLowerCase() === "pdf";
  const isXml = fileType.toLowerCase() === "xml";

  if (!isPdf && !isXml) {
    return NextResponse.json(
      { error: "Tipo de arquivo inválido. Use 'pdf' ou 'xml'." },
      { status: 400 }
    );
  }

  // 1. Busca a nota fiscal pelo ID interno ou Chave de Acesso
  const cleanId = id.trim();
  const invoice = await prismaAdmin.invoice.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { chaveAcesso: cleanId },
        ...(cleanId.length >= 44
          ? [{ chaveAcesso: { contains: cleanId.substring(cleanId.length - 44) } }]
          : []),
      ],
    },
    include: { tenant: true },
  });

  if (!invoice) {
    return NextResponse.json(
      { error: "Nota Fiscal não encontrada ou link expirado." },
      { status: 404 }
    );
  }

  const tenant = invoice.tenant;
  const cleanChave = (invoice.chaveAcesso || "").replace(/\D/g, "");
  const baseFilename = invoice.numero
    ? `NF-e-${invoice.numero}`
    : cleanChave
    ? `NF-e-${cleanChave.slice(-8)}`
    : `NF-e-${invoice.id}`;

  let fileBuffer: Buffer | null = null;

  // 2. Tenta carregar do disco local (public/storage/invoices/...)
  if (cleanChave && invoice.tenantId) {
    const ext = isPdf ? "pdf" : "xml";
    const localFilePath = path.join(
      process.cwd(),
      "public",
      "storage",
      "invoices",
      invoice.tenantId,
      `${cleanChave}.${ext}`
    );

    if (fs.existsSync(localFilePath)) {
      try {
        const buf = fs.readFileSync(localFilePath);
        const isValid =
          (isPdf && buf.slice(0, 5).toString() === "%PDF-") ||
          (isXml && buf.slice(0, 1).toString() === "<");
        if (isValid) {
          fileBuffer = buf;
        }
      } catch (readErr) {
        console.warn("[Public Download] Erro ao ler arquivo do disco local:", readErr);
      }
    }
  }

  // 3. Tenta carregar da URL pública prévia (R2 ou storage HTTP)
  const targetUrl = isPdf ? invoice.pdfUrl : invoice.xmlUrl;
  if (!fileBuffer && targetUrl && targetUrl.startsWith("http")) {
    try {
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const isValid =
          (isPdf && buf.slice(0, 5).toString() === "%PDF-") ||
          (isXml && buf.slice(0, 1).toString() === "<");
        if (isValid) {
          fileBuffer = buf;
        }
      }
    } catch (fetchErr) {
      console.warn("[Public Download] Erro ao buscar da URL de storage:", fetchErr);
    }
  }

  // 4. Se ainda não tiver o arquivo, baixa sob demanda da Focus NFe
  if (!fileBuffer && tenant) {
    const token =
      tenant.ambiente === "PRODUCAO"
        ? tenant.focusNfeTokenProducao
        : tenant.focusNfeTokenHomologacao;

    if (token) {
      const raw = (invoice.rawJson as any) || {};
      let caminhoDanfe =
        raw.caminho_danfe ||
        raw.ultimaConsultaFocus?.caminho_danfe ||
        raw.webhookPayload?.caminho_danfe;
      let caminhoXml =
        raw.caminho_xml_nota_fiscal ||
        raw.ultimaConsultaFocus?.caminho_xml_nota_fiscal ||
        raw.webhookPayload?.caminho_xml_nota_fiscal;

      // Se não tiver os caminhos gravados e tiver focusNfeRef, consulta a Focus
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
            console.warn("[Public Download] Falha ao consultar caminhos na Focus:", statusErr);
          }
        }
      }

      const candidatePath = isPdf ? caminhoDanfe : caminhoXml;
      if (candidatePath) {
        const docRes = await downloadFocusNfeDocument(candidatePath, token, tenant.ambiente);
        if (docRes.success && docRes.buffer) {
          const buf = docRes.buffer;
          const isValid =
            (isPdf && buf.slice(0, 5).toString() === "%PDF-") ||
            (isXml && buf.slice(0, 1).toString() === "<");

          if (isValid) {
            fileBuffer = buf;

            // Salva em cache local para as próximas requisições
            if (cleanChave && invoice.tenantId) {
              try {
                const ext = isPdf ? "pdf" : "xml";
                const cachePath = path.join(
                  process.cwd(),
                  "public",
                  "storage",
                  "invoices",
                  invoice.tenantId,
                  `${cleanChave}.${ext}`
                );
                fs.mkdirSync(path.dirname(cachePath), { recursive: true });
                fs.writeFileSync(cachePath, buf);
              } catch (writeErr) {
                console.warn("[Public Download] Falha ao salvar cache no disco:", writeErr);
              }
            }
          }
        }
      }
    }
  }

  // 5. Se o arquivo não pôde ser obtido
  if (!fileBuffer) {
    return NextResponse.json(
      {
        error: `O arquivo ${isPdf ? "DANFE (PDF)" : "XML"} desta nota fiscal ainda não está disponível para download. Tente novamente em instantes.`,
      },
      { status: 404 }
    );
  }

  // 6. Retorno com cabeçalhos apropriados de download ou visualização inline
  const shouldForceDownload = request.nextUrl.searchParams.get("download") === "true" || isXml;
  const contentType = isPdf ? "application/pdf" : "application/xml";
  const extension = isPdf ? "pdf" : "xml";
  const dispositionType = shouldForceDownload ? "attachment" : "inline";
  const filename = `${baseFilename}.${extension}`;

  return new Response(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${dispositionType}; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
