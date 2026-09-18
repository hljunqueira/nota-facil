"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { parseNfeXml } from "@/lib/services/xmlParser";
import {
  prepareInvoiceInversion,
  buildFocusNfePayload,
  InvertedItem,
} from "@/lib/services/inversion";
import { uploadInvoiceXml, uploadInvoicePdf } from "@/lib/storage";
import {
  getFocusBaseUrl,
  cancelNfeInFocus,
  getNfeStatusFromFocus,
  downloadFocusNfeDocument,
} from "@/lib/services/focusNfe";
import { TipoNota, StatusNota } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function requireTenantSession() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.tenantId) {
    throw new Error("Sessão expirada ou acesso restrito a oficinas.");
  }
  const tenantId = session.user.tenantId;
  const tenantPrisma = createTenantPrisma(tenantId);
  return { session, tenantId, tenantPrisma };
}

/**
 * Retorna as notas fiscais do tenant com filtros opcionais
 */
export async function getInvoicesAction(filters?: {
  tipo?: string;
  status?: string;
  search?: string;
}) {
  const { tenantPrisma } = await requireTenantSession();

  const where: any = {};

  if (filters?.tipo && filters.tipo !== "ALL") {
    where.tipo = filters.tipo as TipoNota;
  }

  if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status as StatusNota;
  }

  if (filters?.search && filters.search.trim() !== "") {
    const q = filters.search.trim();
    where.OR = [
      { chaveAcesso: { contains: q } },
      { partner: { razaoSocial: { contains: q, mode: "insensitive" } } },
    ];
  }

  const invoices = await tenantPrisma.invoice.findMany({
    where,
    orderBy: { dataEmissao: "desc" },
    include: {
      partner: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          cnpj: true,
        },
      },
    },
  });

  return invoices;
}

/**
 * Importa e registra uma NF-e de entrada a partir do arquivo XML da fábrica
 */
export async function importNfeXmlAction(xmlContent: string) {
  const { tenantId, tenantPrisma } = await requireTenantSession();

  if (!xmlContent || !xmlContent.includes("<nfeProc") && !xmlContent.includes("<NFe")) {
    return { success: false, error: "Arquivo XML de NF-e inválido." };
  }

  try {
    const parsed = parseNfeXml(xmlContent);

    if (!parsed.chaveAcesso) {
      return { success: false, error: "Não foi possível identificar a Chave de Acesso no XML." };
    }

    // 1. Verifica duplicidade
    const existing = await prismaAdmin.invoice.findUnique({
      where: { chaveAcesso: parsed.chaveAcesso },
    });

    if (existing) {
      return {
        success: false,
        error: `Esta nota fiscal já está cadastrada no sistema (Nº ${parsed.numero}).`,
        invoiceId: existing.id,
      };
    }

    // 2. Cadastra ou vincula o parceiro (Fábrica)
    let partner = await tenantPrisma.partner.findFirst({
      where: { cnpj: parsed.emitente.cnpj.replace(/\D/g, "") },
    });

    if (!partner) {
      partner = await tenantPrisma.partner.create({
        data: {
          tenantId,
          razaoSocial: parsed.emitente.razaoSocial,
          nomeFantasia: parsed.emitente.nomeFantasia || null,
          cnpj: parsed.emitente.cnpj.replace(/\D/g, ""),
        },
      });
    }

    // 3. Salva XML no Storage
    let xmlUrl: string | null = null;
    try {
      xmlUrl = await uploadInvoiceXml(tenantId, parsed.chaveAcesso, xmlContent);
    } catch (storageErr) {
      console.warn("Aviso ao salvar XML no storage:", storageErr);
    }

    // 4. Cria o registro de entrada da Invoice
    const invoice = await tenantPrisma.invoice.create({
      data: {
        tenantId,
        numero: parsed.numero,
        serie: parsed.serie,
        chaveAcesso: parsed.chaveAcesso,
        tipo: TipoNota.ENTRADA,
        finalidade: parsed.naturezaOperacao,
        status: StatusNota.AUTORIZADA,
        valorTotal: parsed.valorTotal,
        dataEmissao: parsed.dataEmissao,
        xmlUrl,
        partnerId: partner.id,
        idempotencyKey: `import_${tenantId}_${parsed.chaveAcesso}`,
        rawJson: {
          emitente: parsed.emitente,
          destinatario: parsed.destinatario,
          itens: parsed.itens,
        },
      },
    });

    await tenantPrisma.auditLog.create({
      data: {
        tenantId,
        actorType: "USER",
        actorId: tenantId,
        acao: "IMPORTACAO_XML_ENTRADA",
        entidade: "Invoice",
        entidadeId: invoice.id,
        detalhe: {
          numero: parsed.numero,
          chaveAcesso: parsed.chaveAcesso,
          fabrica: parsed.emitente.razaoSocial,
          totalItens: parsed.itens.length,
        },
      },
    });

    revalidatePath("/notas");
    revalidatePath("/");

    return {
      success: true,
      invoiceId: invoice.id,
      numero: parsed.numero,
    };
  } catch (err: any) {
    console.error("[importNfeXmlAction] Erro:", err);
    return { success: false, error: err.message || "Erro ao processar XML de entrada." };
  }
}

/**
 * Carrega a prévia calculada de inversão para exibição no modal
 */
export async function getInversionPreviewAction(invoiceId: string) {
  const { tenantId } = await requireTenantSession();
  return prepareInvoiceInversion(tenantId, invoiceId);
}

/**
 * Dispara a emissão da NF-e de retorno invertida para a SEFAZ via Focus NFe
 */
export async function executeInversionAction({
  invoiceEntradaId,
  chaveAcessoEntrada,
  itensRetorno,
  cobrarServico,
  valorServicoPorPeca,
  quantidadePecasServico,
  observacoesFiscais,
}: {
  invoiceEntradaId: string;
  chaveAcessoEntrada: string;
  itensRetorno: InvertedItem[];
  cobrarServico?: boolean;
  valorServicoPorPeca?: number;
  quantidadePecasServico?: number;
  observacoesFiscais?: string;
}) {
  const { tenantId, tenantPrisma } = await requireTenantSession();

  // Busca dados completos do Tenant e do Partner
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { success: false, error: "Oficina não encontrada." };
  }

  if (tenant.statusConta === "SUSPENSO_PAGAMENTO") {
    return {
      success: false,
      error:
        "Emissão fiscal suspensa por pendência financeira. Acesse o menu Minha Assinatura para regularizar sua mensalidade.",
    };
  }

  if (tenant.statusConta === "SUSPENSO_ADMIN") {
    return {
      success: false,
      error: "Emissão fiscal bloqueada por suspensão administrativa da conta.",
    };
  }

  const invoiceEntrada = await tenantPrisma.invoice.findUnique({
    where: { id: invoiceEntradaId },
    include: { partner: true },
  });

  if (!invoiceEntrada || !invoiceEntrada.partner) {
    return { success: false, error: "Nota de entrada ou fábrica parceira não encontrada." };
  }

  // Gera Chave de Idempotência Única
  const idempotencyKey = `nf_${tenantId}_ret_${invoiceEntrada.numero}_${Date.now()}`;

  // Monta Payload Oficial da Focus NFe v2
  const payload = buildFocusNfePayload({
    tenant,
    partner: invoiceEntrada.partner,
    chaveAcessoEntrada,
    itensRetorno,
    cobrarServico,
    valorServicoPorPeca,
    quantidadePecasServico,
    observacoesFiscais,
  });

  // Calcula valor total da nota
  let valorTotalNota = itensRetorno.reduce((acc, it) => acc + it.valorTotal, 0);
  if (cobrarServico && valorServicoPorPeca && quantidadePecasServico) {
    valorTotalNota += valorServicoPorPeca * quantidadePecasServico;
  }

  // Transmissão para a Focus NFe
  const baseUrl = getFocusBaseUrl(tenant.ambiente);
  const token = tenant.ambiente === "PRODUCAO"
    ? tenant.focusNfeTokenProducao
    : tenant.focusNfeTokenHomologacao;

  if (!token) {
    return {
      success: false,
      error: `Token da Focus NFe (${tenant.ambiente}) não configurado para esta oficina. Acesse Configurações > Integração Focus NFe para cadastrar suas credenciais.`,
    };
  }

  const basicAuth = Buffer.from(`${token}:`).toString("base64");

  try {
    const focusRes = await fetch(`${baseUrl}/v2/nfe?ref=${idempotencyKey}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });

    const focusData = await focusRes.json();

    if (!focusRes.ok) {
      return {
        success: false,
        error: focusData.mensagem || focusData.erros || "Erro ao transmitir NF-e para a Focus NFe.",
      };
    }

    // Cria registro de Retorno no Postgres em estado PENDENTE (será atualizado via webhook)
    const newInvoice = await prismaAdmin.invoice.create({
      data: {
        tenantId,
        numero: tenant.proximoNumero,
        serie: tenant.serieNfe,
        chaveAcesso: focusData.chave_nfe || null,
        tipo: TipoNota.SAIDA,
        finalidade: "Retorno de Industrializacao",
        status: StatusNota.PENDENTE,
        valorTotal: valorTotalNota,
        dataEmissao: new Date(),
        focusNfeRef: idempotencyKey,
        idempotencyKey,
        partnerId: invoiceEntrada.partnerId,
        rawJson: {
          chaveAcessoEntrada,
          focusResponse: focusData,
          payloadEnviado: payload,
        },
      },
    });

    // Incrementa o número da próxima nota
    await prismaAdmin.tenant.update({
      where: { id: tenantId },
      data: { proximoNumero: { increment: 1 } },
    });

    await tenantPrisma.auditLog.create({
      data: {
        tenantId,
        actorType: "USER",
        actorId: tenantId,
        acao: "INVERSAO_NFE_TRANSMITIDA",
        entidade: "Invoice",
        entidadeId: newInvoice.id,
        detalhe: {
          numeroRetorno: tenant.proximoNumero,
          chaveEntrada: chaveAcessoEntrada,
          focusNfeRef: idempotencyKey,
          valorTotal: valorTotalNota,
        },
      },
    });

    revalidatePath("/notas");
    revalidatePath("/");

    return {
      success: true,
      invoiceId: newInvoice.id,
      numero: tenant.proximoNumero,
      status: focusData.status || "processando_autorizacao",
    };
  } catch (err: any) {
    console.error("[executeInversionAction] Falha:", err);
    return {
      success: false,
      error: err.message || "Falha de conexão com a Focus NFe na transmissão da nota.",
    };
  }
}

/**
 * Cancela uma NF-e de saída com justificativa obrigatória (mínimo 15 caracteres)
 */
export async function cancelInvoiceAction(input: {
  invoiceId: string;
  justificativa: string;
}) {
  const { tenantId, tenantPrisma } = await requireTenantSession();
  const justificativa = input.justificativa?.trim() || "";

  if (justificativa.length < 15) {
    return {
      success: false,
      error: "A justificativa deve ter no mínimo 15 caracteres conforme exigido pela SEFAZ.",
    };
  }

  const invoice = await tenantPrisma.invoice.findFirst({
    where: { id: input.invoiceId, tenantId },
  });

  if (!invoice) {
    return { success: false, error: "Nota fiscal não encontrada." };
  }

  if (invoice.tipo !== TipoNota.SAIDA) {
    return {
      success: false,
      error: "Apenas notas de saída (retorno emitido) podem ser canceladas.",
    };
  }

  if (invoice.status === StatusNota.CANCELADA) {
    return { success: false, error: "Esta nota já se encontra cancelada." };
  }

  // Busca dados de autenticação fiscal do tenant
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { success: false, error: "Oficina não encontrada." };
  }

  const token =
    tenant.ambiente === "PRODUCAO"
      ? tenant.focusNfeTokenProducao
      : tenant.focusNfeTokenHomologacao;

  if (!token) {
    return {
      success: false,
      error: `Token da Focus NFe (${tenant.ambiente}) não configurado para esta oficina. Acesse Configurações > Integração Focus NFe para cadastrar suas credenciais.`,
    };
  }

  // Se a nota possui referência Focus NFe, envia o cancelamento para a SEFAZ
  if (invoice.focusNfeRef) {
    const focusRes = await cancelNfeInFocus({
      ref: invoice.focusNfeRef,
      justificativa,
      token,
      ambiente: tenant.ambiente,
    });

    if (!focusRes.success) {
      return {
        success: false,
        error: focusRes.error || "A SEFAZ rejeitou o cancelamento desta nota fiscal.",
      };
    }
  }

  // Atualiza a nota fiscal para CANCELADA no banco
  const updatedInvoice = await tenantPrisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: StatusNota.CANCELADA,
      rawJson: {
        ...(invoice.rawJson as any),
        cancelamento: {
          justificativa,
          dataCancelamento: new Date().toISOString(),
        },
      },
    },
  });

  // Registra no AuditLog
  await tenantPrisma.auditLog.create({
    data: {
      tenantId,
      actorType: "USER",
      actorId: tenantId,
      acao: "NFE_CANCELADA",
      entidade: "Invoice",
      entidadeId: invoice.id,
      detalhe: {
        numero: invoice.numero,
        serie: invoice.serie,
        chaveAcesso: invoice.chaveAcesso,
        justificativa,
        focusNfeRef: invoice.focusNfeRef,
      },
    },
  });

  revalidatePath("/notas");
  revalidatePath("/");

  return {
    success: true,
    message: `NF-e #${invoice.numero} cancelada com sucesso na SEFAZ.`,
    status: updatedInvoice.status,
  };
}

/**
 * Consulta manual de status da NF-e junto à Focus NFe / SEFAZ
 */
export async function checkInvoiceStatusAction(invoiceId: string) {
  const { tenantId, tenantPrisma } = await requireTenantSession();

  const invoice = await tenantPrisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
  });

  if (!invoice) {
    return { success: false, error: "Nota fiscal não encontrada." };
  }

  if (!invoice.focusNfeRef) {
    return {
      success: true,
      status: invoice.status,
      message: `Status atual no sistema: ${invoice.status}`,
    };
  }

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { success: false, error: "Oficina não encontrada." };
  }

  const token =
    tenant.ambiente === "PRODUCAO"
      ? tenant.focusNfeTokenProducao
      : tenant.focusNfeTokenHomologacao;

  if (!token) {
    return {
      success: false,
      error: `Token da Focus NFe (${tenant.ambiente}) não configurado para esta oficina. Acesse Configurações > Integração Focus NFe para cadastrar suas credenciais.`,
    };
  }

  const focusRes = await getNfeStatusFromFocus({
    ref: invoice.focusNfeRef,
    token,
    ambiente: tenant.ambiente,
  });

  if (!focusRes.success) {
    return {
      success: false,
      error: focusRes.error || "Não foi possível consultar a Focus NFe no momento.",
    };
  }

  const data = focusRes.data;
  let novoStatus = invoice.status;
  let pdfUrl = invoice.pdfUrl;
  let xmlUrl = invoice.xmlUrl;

  if (data.status === "autorizado") {
    novoStatus = StatusNota.AUTORIZADA;

    // Se ainda não tiver os links no storage, tenta baixar e salvar
    if (!pdfUrl && data.caminho_danfe) {
      try {
        const pdfDownload = await downloadFocusNfeDocument(data.caminho_danfe, token, tenant.ambiente);
        if (pdfDownload.success && pdfDownload.buffer) {
          pdfUrl = await uploadInvoicePdf(tenantId, data.chave_nfe || invoice.id, pdfDownload.buffer);
        }
      } catch (err) {
        console.warn("[checkInvoiceStatusAction] Aviso ao baixar PDF:", err);
      }
    }

    if (!xmlUrl && data.caminho_xml_nota_fiscal) {
      try {
        const xmlDownload = await downloadFocusNfeDocument(data.caminho_xml_nota_fiscal, token, tenant.ambiente);
        if (xmlDownload.success && xmlDownload.buffer) {
          xmlUrl = await uploadInvoiceXml(tenantId, data.chave_nfe || invoice.id, xmlDownload.buffer.toString("utf-8"));
        }
      } catch (err) {
        console.warn("[checkInvoiceStatusAction] Aviso ao baixar XML:", err);
      }
    }
  } else if (data.status === "cancelado") {
    novoStatus = StatusNota.CANCELADA;
  } else if (data.status === "erro_autorizacao") {
    novoStatus = StatusNota.REJEITADA;
  }

  // Atualiza no banco
  await tenantPrisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: novoStatus,
      chaveAcesso: data.chave_nfe || invoice.chaveAcesso,
      pdfUrl,
      xmlUrl,
      rawJson: {
        ...(invoice.rawJson as any),
        ultimaConsultaFocus: data,
      },
    },
  });

  // Registra auditoria
  await tenantPrisma.auditLog.create({
    data: {
      tenantId,
      actorType: "USER",
      actorId: tenantId,
      acao: "NFE_STATUS_CONSULTADO",
      entidade: "Invoice",
      entidadeId: invoice.id,
      detalhe: {
        numero: invoice.numero,
        statusAnterior: invoice.status,
        novoStatus,
        mensagemSefaz: data.mensagem_sefaz,
      },
    },
  });

  revalidatePath("/notas");
  revalidatePath("/");

  return {
    success: true,
    status: novoStatus,
    message: data.mensagem_sefaz || `Status verificado com a SEFAZ: ${novoStatus}`,
    chaveAcesso: data.chave_nfe || invoice.chaveAcesso,
  };
}
