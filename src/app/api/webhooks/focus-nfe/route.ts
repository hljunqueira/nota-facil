import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { downloadFocusNfeDocument, getFocusMasterToken } from "@/lib/services/focusNfe";
import { uploadInvoicePdf, uploadInvoiceXml } from "@/lib/storage";
import { sendInvoiceNotification } from "@/lib/services/notification";
import { parseNfeXml } from "@/lib/services/xmlParser";
import { StatusNota, TipoNota } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "online",
    endpoint: "Nota Fácil Focus NFe Webhook v2.0",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // 1. Identifica se é evento de NFe Recebida (MDe / Entrada)
    if (payload.cnpj_destinatario && (payload.event === "nfe_recebida" || payload.tipo === "nfe_recebida")) {
      return await handleNfeRecebidaEvent(payload);
    }

    // 2. Trata eventos de Emissão (Autorização, Cancelamento, Rejeição)
    return await handleNfeEmissaoEvent(payload);
  } catch (err: any) {
    console.error("[Webhook Focus NFe] Erro ao processar payload:", err);
    return NextResponse.json(
      { error: "Erro interno no processamento do webhook" },
      { status: 500 }
    );
  }
}

/**
 * Trata o retorno de emissão de NF-e (Autorizada, Rejeitada, Cancelada)
 */
async function handleNfeEmissaoEvent(payload: any) {
  const ref = payload.ref;
  const chaveNfe = payload.chave_nfe;
  const status = payload.status; // "autorizado" | "cancelado" | "erro_autorizacao"

  if (!ref && !chaveNfe) {
    return NextResponse.json({ error: "Payload sem ref ou chave_nfe" }, { status: 400 });
  }

  // Busca a nota fiscal correspondente
  const invoice = await prismaAdmin.invoice.findFirst({
    where: {
      OR: [
        ...(ref ? [{ focusNfeRef: ref }, { idempotencyKey: ref }] : []),
        ...(chaveNfe ? [{ chaveAcesso: chaveNfe }] : []),
      ],
    },
    include: {
      tenant: true,
      partner: true,
    },
  });

  if (!invoice) {
    console.warn(`[Webhook Focus NFe] Nota com ref "${ref}" ou chave "${chaveNfe}" não encontrada.`);
    return NextResponse.json({ received: true, warning: "Invoice not found" });
  }

  const tenant = invoice.tenant;
  const token =
    tenant.ambiente === "PRODUCAO"
      ? tenant.focusNfeTokenProducao || getFocusMasterToken("PRODUCAO")
      : tenant.focusNfeTokenHomologacao || getFocusMasterToken("HOMOLOGACAO");

  // CASO A: NOTA AUTORIZADA PELA SEFAZ
  if (status === "autorizado") {
    let pdfUrl = invoice.pdfUrl;
    let xmlUrl = invoice.xmlUrl;
    let pdfBuffer: Buffer | undefined;
    let xmlBuffer: Buffer | undefined;

    const chaveFinal = chaveNfe || invoice.chaveAcesso || ref;

    // 1. Download e Backup do DANFE PDF
    const caminhoDanfe = payload.caminho_danfe || `/v2/nfe/${ref}.pdf`;
    try {
      const pdfDownload = await downloadFocusNfeDocument(caminhoDanfe, token, tenant.ambiente);
      if (pdfDownload.success && pdfDownload.buffer) {
        pdfBuffer = pdfDownload.buffer;
        pdfUrl = await uploadInvoicePdf(tenant.id, chaveFinal, pdfBuffer);
      }
    } catch (pdfErr) {
      console.error("[Webhook Focus NFe] Erro ao baixar PDF:", pdfErr);
    }

    // 2. Download e Backup do XML
    const caminhoXml = payload.caminho_xml_nota_fiscal || `/v2/nfe/${ref}.xml`;
    try {
      const xmlDownload = await downloadFocusNfeDocument(caminhoXml, token, tenant.ambiente);
      if (xmlDownload.success && xmlDownload.buffer) {
        xmlBuffer = xmlDownload.buffer;
        xmlUrl = await uploadInvoiceXml(tenant.id, chaveFinal, xmlBuffer);
      }
    } catch (xmlErr) {
      console.error("[Webhook Focus NFe] Erro ao baixar XML:", xmlErr);
    }

    // 3. Atualiza status no banco
    await prismaAdmin.invoice.update({
      where: { id: invoice.id },
      data: {
        status: StatusNota.AUTORIZADA,
        chaveAcesso: chaveFinal,
        pdfUrl,
        xmlUrl,
        rawJson: {
          ...(invoice.rawJson as any),
          webhookPayload: payload,
          autorizadoEm: new Date().toISOString(),
        },
      },
    });

    await prismaAdmin.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "SYSTEM",
        actorId: "FOCUS_NFE_WEBHOOK",
        acao: "NFE_AUTORIZADA_SEFAZ",
        entidade: "Invoice",
        entidadeId: invoice.id,
        detalhe: {
          chaveNfe: chaveFinal,
          numero: invoice.numero,
          protocolo: payload.protocolo,
          statusSefaz: payload.status_sefaz,
        },
      },
    });

    // 4. Disparo Automático da Mensageria (WhatsApp + Fallback E-mail)
    try {
      // Notifica a fábrica parceira se houver contato
      if (invoice.partner) {
        await sendInvoiceNotification({
          tenantId: tenant.id,
          invoiceId: invoice.id,
          razaoSocialEmitente: tenant.razaoSocial,
          numeroNota: invoice.numero,
          serieNota: invoice.serie,
          chaveAcesso: chaveFinal,
          valorTotal: Number(invoice.valorTotal),
          destinatarioNome: invoice.partner.razaoSocial,
          destinatarioTelefone: invoice.partner.telefone,
          destinatarioEmail: invoice.partner.email,
          danfePdfBuffer: pdfBuffer,
          danfePdfUrl: pdfUrl || undefined,
          xmlContent: xmlBuffer,
          xmlUrl: xmlUrl || undefined,
        });
      }

      // Notifica destinatários adicionais cadastrados no tenant (ex: Contador, Alerta Interno)
      const recipients = await prismaAdmin.notificationRecipient.findMany({
        where: { tenantId: tenant.id, ativo: true },
      });

      for (const rec of recipients) {
        await sendInvoiceNotification({
          tenantId: tenant.id,
          invoiceId: invoice.id,
          razaoSocialEmitente: tenant.razaoSocial,
          numeroNota: invoice.numero,
          serieNota: invoice.serie,
          chaveAcesso: chaveFinal,
          valorTotal: Number(invoice.valorTotal),
          destinatarioNome: rec.nome,
          destinatarioTelefone: rec.canal === "WHATSAPP" ? rec.telefone : undefined,
          destinatarioEmail: rec.email,
          danfePdfBuffer: pdfBuffer,
          danfePdfUrl: pdfUrl || undefined,
          xmlContent: xmlBuffer,
          xmlUrl: xmlUrl || undefined,
        });
      }
    } catch (notifErr) {
      console.error("[Webhook Focus NFe] Erro ao disparar notificações:", notifErr);
    }

    return NextResponse.json({ success: true, action: "nfe_autorizada" });
  }

  // CASO B: NOTA CANCELADA
  if (status === "cancelado") {
    await prismaAdmin.invoice.update({
      where: { id: invoice.id },
      data: {
        status: StatusNota.CANCELADA,
        rawJson: {
          ...(invoice.rawJson as any),
          cancelamentoPayload: payload,
          canceladoEm: new Date().toISOString(),
        },
      },
    });

    await prismaAdmin.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "SYSTEM",
        actorId: "FOCUS_NFE_WEBHOOK",
        acao: "NFE_CANCELADA_SEFAZ",
        entidade: "Invoice",
        entidadeId: invoice.id,
        detalhe: {
          justificativa: payload.justificativa,
          statusSefaz: payload.status_sefaz,
        },
      },
    });

    return NextResponse.json({ success: true, action: "nfe_cancelada" });
  }

  // CASO C: REJEIÇÃO DA SEFAZ
  if (status === "erro_autorizacao") {
    await prismaAdmin.invoice.update({
      where: { id: invoice.id },
      data: {
        status: StatusNota.REJEITADA,
        rawJson: {
          ...(invoice.rawJson as any),
          rejeicaoPayload: payload,
          mensagemSefaz: payload.mensagem_sefaz,
        },
      },
    });

    await prismaAdmin.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "SYSTEM",
        actorId: "FOCUS_NFE_WEBHOOK",
        acao: "NFE_REJEITADA_SEFAZ",
        entidade: "Invoice",
        entidadeId: invoice.id,
        detalhe: {
          statusSefaz: payload.status_sefaz,
          mensagemSefaz: payload.mensagem_sefaz,
          erros: payload.erros,
        },
      },
    });

    return NextResponse.json({ success: true, action: "nfe_rejeitada" });
  }

  return NextResponse.json({ received: true, status });
}

/**
 * Trata o evento de NF-e Recebida (MDe / Entrada de fábrica parceira)
 */
async function handleNfeRecebidaEvent(payload: any) {
  const cnpjDestinatario = (payload.cnpj_destinatario || "").replace(/\D/g, "");
  const chaveAcesso = payload.chave_nfe || payload.chave;

  if (!cnpjDestinatario || !chaveAcesso) {
    return NextResponse.json({ error: "Payload incompleto para nfe_recebida" }, { status: 400 });
  }

  // Localiza o tenant destinatário da nota
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { cnpj: cnpjDestinatario },
  });

  if (!tenant) {
    console.warn(`[handleNfeRecebidaEvent] Tenant com CNPJ ${cnpjDestinatario} não encontrado.`);
    return NextResponse.json({ received: true, warning: "Tenant not found" });
  }

  // Verifica duplicidade
  const existingInvoice = await prismaAdmin.invoice.findUnique({
    where: { chaveAcesso },
  });

  if (existingInvoice) {
    return NextResponse.json({ received: true, message: "Nota já importada anteriormente" });
  }

  // Cadastra ou localiza fábrica parceira emitente
  let partnerId: string | null = null;
  const cnpjEmitente = (payload.cnpj_emitente || "").replace(/\D/g, "");

  if (cnpjEmitente) {
    let partner = await prismaAdmin.partner.findFirst({
      where: {
        tenantId: tenant.id,
        cnpj: cnpjEmitente,
      },
    });

    if (!partner) {
      partner = await prismaAdmin.partner.create({
        data: {
          tenantId: tenant.id,
          razaoSocial: payload.nome_emitente || "Fábrica Parceira",
          cnpj: cnpjEmitente,
        },
      });
    }

    partnerId = partner.id;
  }

  // Cria o registro da NF-e de entrada
  const newInvoice = await prismaAdmin.invoice.create({
    data: {
      tenantId: tenant.id,
      numero: parseInt(payload.numero || "0", 10),
      serie: parseInt(payload.serie || "1", 10),
      chaveAcesso,
      tipo: TipoNota.ENTRADA,
      finalidade: "Remessa para Industrializacao por Encomenda",
      status: StatusNota.AUTORIZADA,
      valorTotal: parseFloat(payload.valor_total || payload.valor || "0"),
      dataEmissao: payload.data_emissao ? new Date(payload.data_emissao) : new Date(),
      partnerId,
      idempotencyKey: `mde_${tenant.id}_${chaveAcesso}`,
      rawJson: payload,
    },
  });

  await prismaAdmin.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorType: "SYSTEM",
      actorId: "FOCUS_NFE_MDE",
      acao: "NFE_RECEBIDA_MDE_IMPORTADA",
      entidade: "Invoice",
      entidadeId: newInvoice.id,
      detalhe: {
        chaveAcesso,
        fabrica: payload.nome_emitente,
        numero: payload.numero,
      },
    },
  });

  return NextResponse.json({
    success: true,
    action: "nfe_recebida_importada",
    invoiceId: newInvoice.id,
  });
}
