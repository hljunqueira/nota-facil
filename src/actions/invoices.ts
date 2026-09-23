"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { parseNfeXml, ParsedNfe } from "@/lib/services/xmlParser";
import { parseDanfePdf } from "@/lib/services/danfePdfParser";
import { parseEspelhoPdf, ParsedEspelho } from "@/lib/services/espelhoPdfParser";
import {
  prepareInvoiceInversion,
  prepareBatchInvoiceInversion,
  buildFocusNfePayload,
  buildFocusNfeCobrancaPayload,
  InvertedItem,
} from "@/lib/services/inversion";
import { uploadInvoiceXml, uploadInvoicePdf, getFileFromStorage } from "@/lib/storage";
import {
  getFocusBaseUrl,
  cancelNfeInFocus,
  getNfeStatusFromFocus,
  downloadFocusNfeDocument,
} from "@/lib/services/focusNfe";
import { sendInvoiceEmail } from "@/lib/services/email";
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
          modoEmissao: true,
          modeloEspelho: true,
        },
      },
    },
  });

  return invoices;
}

/**
 * Importa e registra uma NF-e de entrada a partir do arquivo XML ou DANFE PDF
 */
export async function importInvoiceFileAction(formData: FormData) {
  const { tenantId, tenantPrisma } = await requireTenantSession();
  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "Nenhum arquivo enviado para importação." };
  }

  const fileName = file.name.toLowerCase();
  const isPdf = fileName.endsWith(".pdf") || file.type === "application/pdf";
  const isXml = fileName.endsWith(".xml") || file.type === "text/xml" || file.type === "application/xml";

  if (!isPdf && !isXml) {
    return { success: false, error: "Formato inválido. Por favor envie um arquivo PDF (DANFE) ou XML da NF-e." };
  }

  try {
    let parsed: ParsedNfe;
    let pdfUrl: string | null = null;
    let xmlUrl: string | null = null;

    const currentTenant = await prismaAdmin.tenant.findUnique({
      where: { id: tenantId },
      select: { cnpj: true, razaoSocial: true, inscricaoEstadual: true },
    });

    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      parsed = await parseDanfePdf(
        buffer,
        currentTenant
          ? {
              cnpj: currentTenant.cnpj,
              razaoSocial: currentTenant.razaoSocial,
              ie: currentTenant.inscricaoEstadual,
            }
          : undefined
      );

      try {
        pdfUrl = await uploadInvoicePdf(tenantId, parsed.chaveAcesso, buffer);
      } catch (storageErr) {
        console.warn("Aviso ao salvar PDF no storage:", storageErr);
      }
    } else {
      const xmlContent = await file.text();
      parsed = parseNfeXml(xmlContent);

      try {
        xmlUrl = await uploadInvoiceXml(tenantId, parsed.chaveAcesso, xmlContent);
      } catch (storageErr) {
        console.warn("Aviso ao salvar XML no storage:", storageErr);
      }
    }

    if (!parsed.chaveAcesso) {
      return { success: false, error: "Não foi possível extrair a Chave de Acesso da nota fiscal." };
    }

    // 1. Verifica duplicidade
    const existing = await prismaAdmin.invoice.findUnique({
      where: { chaveAcesso: parsed.chaveAcesso },
    });

    if (existing) {
      return {
        success: false,
        error: `Esta nota fiscal já foi importada anteriormente (Nº ${parsed.numero}).`,
        invoiceId: existing.id,
      };
    }

    // 2. Cadastra ou vincula a fábrica parceira (Partner)
    const cleanEmitCnpj = parsed.emitente.cnpj.replace(/\D/g, "");
    let partner = await tenantPrisma.partner.findFirst({
      where: { cnpj: cleanEmitCnpj },
    });

    if (!partner) {
      partner = await tenantPrisma.partner.create({
        data: {
          tenantId,
          razaoSocial: parsed.emitente.razaoSocial,
          nomeFantasia: parsed.emitente.nomeFantasia || null,
          cnpj: cleanEmitCnpj,
          telefone: parsed.emitente.telefone?.replace(/\D/g, "") || null,
        },
      });
    }

    // 3. Cria a Invoice de Entrada
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
        pdfUrl,
        partnerId: partner.id,
        idempotencyKey: `import_${tenantId}_${parsed.chaveAcesso}`,
        rawJson: {
          emitente: parsed.emitente,
          destinatario: parsed.destinatario,
          itens: parsed.itens,
          transporte: parsed.transporte,
        },
      },
    });

    // 4. Grava AuditLog
    await tenantPrisma.auditLog.create({
      data: {
        tenantId,
        actorType: "USER",
        actorId: tenantId,
        acao: isPdf ? "IMPORTACAO_PDF_ENTRADA" : "IMPORTACAO_XML_ENTRADA",
        entidade: "Invoice",
        entidadeId: invoice.id,
        detalhe: {
          numero: parsed.numero,
          serie: parsed.serie,
          chaveAcesso: parsed.chaveAcesso,
          fabrica: parsed.emitente.razaoSocial,
          totalItens: parsed.itens.length,
          valorTotal: parsed.valorTotal,
          formato: isPdf ? "PDF" : "XML",
        },
      },
    });

    revalidatePath("/notas");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return {
      success: true,
      invoiceId: invoice.id,
      numero: parsed.numero,
      totalItens: parsed.itens.length,
      valorTotal: parsed.valorTotal,
    };
  } catch (err: any) {
    console.error("[importInvoiceFileAction] Erro:", err);
    return { success: false, error: err.message || "Erro ao processar arquivo de nota fiscal." };
  }
}

/**
 * Importa múltiplas notas fiscais de entrada (PDFs de WhatsApp ou XMLs) em lote
 */
export async function importInvoiceBatchAction(formData: FormData) {
  const { tenantId, tenantPrisma } = await requireTenantSession();
  let files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    const single = formData.get("file") as File | null;
    if (single) files = [single];
  }

  if (!files || files.length === 0) {
    return {
      success: false,
      error: "Nenhum arquivo enviado para importação.",
      totalRecebidos: 0,
      totalImportados: 0,
      totalDuplicados: 0,
      totalErros: 0,
      resultados: [],
    };
  }

  const currentTenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
    select: { cnpj: true, razaoSocial: true, inscricaoEstadual: true },
  });

  const resultados: Array<{
    fileName: string;
    success: boolean;
    numero?: number;
    invoiceId?: string;
    error?: string;
    duplicada?: boolean;
  }> = [];

  let totalImportados = 0;
  let totalDuplicados = 0;
  let totalErros = 0;

  for (const file of files) {
    const fileName = file.name || "arquivo";
    const nameLower = fileName.toLowerCase();
    const isPdf = nameLower.endsWith(".pdf") || file.type === "application/pdf";
    const isXml = nameLower.endsWith(".xml") || file.type === "text/xml" || file.type === "application/xml";

    if (!isPdf && !isXml) {
      totalErros++;
      resultados.push({
        fileName,
        success: false,
        error: "Formato não suportado (apenas PDF e XML).",
      });
      continue;
    }

    try {
      let parsed: ParsedNfe;
      let pdfUrl: string | null = null;
      let xmlUrl: string | null = null;

      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        parsed = await parseDanfePdf(
          buffer,
          currentTenant
            ? {
                cnpj: currentTenant.cnpj,
                razaoSocial: currentTenant.razaoSocial,
                ie: currentTenant.inscricaoEstadual,
              }
            : undefined
        );

        try {
          pdfUrl = await uploadInvoicePdf(tenantId, parsed.chaveAcesso, buffer);
        } catch (storageErr) {
          console.warn("Aviso ao salvar PDF no storage:", storageErr);
        }
      } else {
        const xmlContent = await file.text();
        parsed = parseNfeXml(xmlContent);

        try {
          xmlUrl = await uploadInvoiceXml(tenantId, parsed.chaveAcesso, xmlContent);
        } catch (storageErr) {
          console.warn("Aviso ao salvar XML no storage:", storageErr);
        }
      }

      if (!parsed.chaveAcesso) {
        totalErros++;
        resultados.push({
          fileName,
          success: false,
          error: "Não foi possível extrair a Chave de Acesso da nota fiscal.",
        });
        continue;
      }

      // 1. Verifica duplicidade
      const existing = await prismaAdmin.invoice.findUnique({
        where: { chaveAcesso: parsed.chaveAcesso },
      });

      if (existing) {
        totalDuplicados++;
        resultados.push({
          fileName,
          success: false,
          duplicada: true,
          numero: parsed.numero,
          invoiceId: existing.id,
          error: `Nota fiscal Nº ${parsed.numero} já importada anteriormente.`,
        });
        continue;
      }

      // 2. Cadastra ou vincula a fábrica parceira (Partner)
      const cleanEmitCnpj = parsed.emitente.cnpj.replace(/\D/g, "");
      let partner = await tenantPrisma.partner.findFirst({
        where: { cnpj: cleanEmitCnpj },
      });

      if (!partner) {
        partner = await tenantPrisma.partner.create({
          data: {
            tenantId,
            razaoSocial: parsed.emitente.razaoSocial,
            nomeFantasia: parsed.emitente.nomeFantasia || null,
            cnpj: cleanEmitCnpj,
            telefone: parsed.emitente.telefone?.replace(/\D/g, "") || null,
          },
        });
      }

      // 3. Cria a Invoice de Entrada
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
          pdfUrl,
          partnerId: partner.id,
          idempotencyKey: `import_${tenantId}_${parsed.chaveAcesso}`,
          rawJson: {
            emitente: parsed.emitente,
            destinatario: parsed.destinatario,
            itens: parsed.itens,
            transporte: parsed.transporte,
          },
        },
      });

      // 4. Grava AuditLog
      await tenantPrisma.auditLog.create({
        data: {
          tenantId,
          actorType: "USER",
          actorId: tenantId,
          acao: isPdf ? "IMPORTACAO_PDF_ENTRADA" : "IMPORTACAO_XML_ENTRADA",
          entidade: "Invoice",
          entidadeId: invoice.id,
          detalhe: {
            numero: parsed.numero,
            serie: parsed.serie,
            chaveAcesso: parsed.chaveAcesso,
            fabrica: parsed.emitente.razaoSocial,
            totalItens: parsed.itens.length,
            valorTotal: parsed.valorTotal,
            formato: isPdf ? "PDF" : "XML",
            emLote: true,
          },
        },
      });

      totalImportados++;
      resultados.push({
        fileName,
        success: true,
        numero: parsed.numero,
        invoiceId: invoice.id,
      });
    } catch (err: any) {
      console.error(`[importInvoiceBatchAction] Erro no arquivo ${fileName}:`, err);
      totalErros++;
      resultados.push({
        fileName,
        success: false,
        error: err.message || "Erro ao processar arquivo.",
      });
    }
  }

  revalidatePath("/notas");
  revalidatePath("/dashboard");
  revalidatePath("/");

  return {
    success: totalImportados > 0 || (totalDuplicados > 0 && totalErros === 0),
    totalRecebidos: files.length,
    totalImportados,
    totalDuplicados,
    totalErros,
    resultados,
  };
}

/**
 * Importa e registra uma NF-e de entrada a partir do arquivo XML da fábrica (compatibilidade retroativa)
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
 * Carrega a prévia calculada de inversão agrupando múltiplas remessas de entrada
 */
export async function getBatchInversionPreviewAction(invoiceIds: string[]) {
  const { tenantId } = await requireTenantSession();
  return prepareBatchInvoiceInversion(tenantId, invoiceIds);
}

/**
 * Dispara a emissão da NF-e de retorno invertida para a SEFAZ via Focus NFe
 */
export async function executeInversionAction({
  invoiceEntradaId,
  chaveAcessoEntrada,
  chavesAcessoEntrada,
  itensRetorno,
  cobrarServico,
  valorServicoPorPeca,
  quantidadePecasServico,
  observacoesFiscais,
  cfopRetorno,
  transporteInfo,
}: {
  invoiceEntradaId: string;
  chaveAcessoEntrada: string;
  chavesAcessoEntrada?: string[];
  itensRetorno: InvertedItem[];
  cobrarServico?: boolean;
  valorServicoPorPeca?: number;
  quantidadePecasServico?: number;
  observacoesFiscais?: string;
  cfopRetorno?: string;
  transporteInfo?: any;
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

  const rawData: any = invoiceEntrada.rawJson || {};
  const emitenteInfo = rawData.emitente || {};
  const transportePadrao = transporteInfo || rawData.transporte || undefined;

  // Gera Chave de Idempotência Única
  const idempotencyKey = `nf_${tenantId}_ret_${invoiceEntrada.numero}_${Date.now()}`;

  // Monta Payload Oficial da Focus NFe v2 com Transporte e CFOP selecionado
  const payload = buildFocusNfePayload({
    tenant,
    partner: invoiceEntrada.partner,
    chaveAcessoEntrada,
    chavesAcessoEntrada,
    itensRetorno,
    cobrarServico,
    valorServicoPorPeca,
    quantidadePecasServico,
    observacoesFiscais,
    emitenteInfo,
    cfopRetornoOverride: cfopRetorno,
    transporteInfo: transportePadrao,
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

    // Verifica se a nota já foi autorizada imediatamente de forma síncrona
    const isAutorizadoSync = focusData.status === "autorizado" && focusData.chave_nfe;
    const initialStatus = isAutorizadoSync ? StatusNota.AUTORIZADA : StatusNota.PENDENTE;
    const chaveEmitida = focusData.chave_nfe || null;
    let pdfUrl: string | null = null;
    let xmlUrl: string | null = null;

    if (isAutorizadoSync) {
      if (focusData.caminho_danfe) {
        try {
          const pdfDoc = await downloadFocusNfeDocument(focusData.caminho_danfe, token, tenant.ambiente);
          if (pdfDoc.success && pdfDoc.buffer && pdfDoc.buffer.slice(0, 5).toString() === "%PDF-") {
            pdfUrl = await uploadInvoicePdf(tenantId, chaveEmitida, pdfDoc.buffer);
          }
        } catch (_) {}
      }
      if (focusData.caminho_xml_nota_fiscal) {
        try {
          const xmlDoc = await downloadFocusNfeDocument(focusData.caminho_xml_nota_fiscal, token, tenant.ambiente);
          if (xmlDoc.success && xmlDoc.buffer && xmlDoc.buffer.slice(0, 1).toString() === "<") {
            xmlUrl = await uploadInvoiceXml(tenantId, chaveEmitida, xmlDoc.buffer.toString("utf-8"));
          }
        } catch (_) {}
      }
    }

    const modalidade = cobrarServico ? "CONJUNTA" : "RETORNO_MERCADORIA";
    const finalidadeDesc = cobrarServico
      ? "RETORNO E INDUSTRIALIZAÇÃO (CONJUNTA)"
      : "RETORNO DE MERCADORIA POR ENCOMENDA";

    const newInvoice = await prismaAdmin.invoice.create({
      data: {
        tenantId,
        numero: tenant.proximoNumero,
        serie: tenant.serieNfe,
        chaveAcesso: chaveEmitida,
        tipo: TipoNota.SAIDA,
        finalidade: finalidadeDesc,
        modalidadeEmissao: modalidade,
        chaveNfeReferenciada:
          chavesAcessoEntrada && chavesAcessoEntrada.length > 0
            ? chavesAcessoEntrada.join(", ")
            : chaveAcessoEntrada,
        status: initialStatus,
        valorTotal: valorTotalNota,
        dataEmissao: new Date(),
        pdfUrl,
        xmlUrl,
        focusNfeRef: idempotencyKey,
        idempotencyKey,
        partnerId: invoiceEntrada.partnerId,
        rawJson: {
          chaveAcessoEntrada,
          focusResponse: focusData,
          payloadEnviado: payload,
          modalidade,
          pdfUrl,
          xmlUrl,
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
        if (pdfDownload.success && pdfDownload.buffer && pdfDownload.buffer.slice(0, 5).toString() === "%PDF-") {
          pdfUrl = await uploadInvoicePdf(tenantId, data.chave_nfe || invoice.id, pdfDownload.buffer);
        }
      } catch (err) {
        console.warn("[checkInvoiceStatusAction] Aviso ao baixar PDF:", err);
      }
    }

    if (!xmlUrl && data.caminho_xml_nota_fiscal) {
      try {
        const xmlDownload = await downloadFocusNfeDocument(data.caminho_xml_nota_fiscal, token, tenant.ambiente);
        if (xmlDownload.success && xmlDownload.buffer && xmlDownload.buffer.slice(0, 1).toString() === "<") {
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

/**
 * Sincroniza todas as notas com status PENDENTE junto à Focus NFe / SEFAZ
 * Executado automaticamente ao recarregar a página, clicar no botão de atualizar ou via polling.
 */
export async function syncPendingInvoicesAction() {
  const { tenantId, tenantPrisma } = await requireTenantSession();

  const pendingInvoices = await tenantPrisma.invoice.findMany({
    where: {
      tenantId,
      status: "PENDENTE",
      focusNfeRef: { not: null },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  if (pendingInvoices.length === 0) {
    return { success: true, count: 0, updatedCount: 0, message: "Nenhuma nota pendente." };
  }

  let updatedCount = 0;
  for (const inv of pendingInvoices) {
    try {
      const res = await checkInvoiceStatusAction(inv.id);
      if (res.success && res.status !== "PENDENTE") {
        updatedCount++;
      }
    } catch (e) {
      console.warn(`[syncPendingInvoicesAction] Erro ao sincronizar nota ${inv.numero}:`, e);
    }
  }

  return {
    success: true,
    count: pendingInvoices.length,
    updatedCount,
    message:
      updatedCount > 0
        ? `${updatedCount} nota(s) atualizada(s) junto à SEFAZ!`
        : "Notas consultadas na SEFAZ (ainda em processamento).",
  };
}

/**
 * Importa e analisa o arquivo PDF do Espelho de Produção da fábrica parceira
 */
export async function parseEspelhoFileAction(formData: FormData) {
  const { tenantId, tenantPrisma } = await requireTenantSession();
  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "Nenhum arquivo enviado." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const espelho = await parseEspelhoPdf(buffer);

    if (!espelho || espelho.itens.length === 0) {
      return {
        success: false,
        error: "Não foi possível identificar os itens ou o valor do serviço no arquivo de espelho enviado. Certifique-se de que é o PDF de Controle/Espelho da fábrica.",
      };
    }

    // Tenta localizar a fábrica parceira correspondente
    const partners = await tenantPrisma.partner.findMany();
    let matchedPartner = partners.find((p) =>
      p.razaoSocial.toLowerCase().includes(espelho.fabricaNome.toLowerCase()) ||
      espelho.fabricaNome.toLowerCase().includes(p.razaoSocial.toLowerCase())
    );

    // Se for Ritmi e não achou por nome parcial
    if (!matchedPartner && espelho.fabricaNome.toLowerCase().includes("ritmi")) {
      matchedPartner = partners.find((p) => p.cnpj.replace(/\D/g, "") === "72305295000115");
    }

    // Checagem de duplicidade: verifica se este número de controle já foi faturado
    let jaFaturado: { numeroNota: number; dataEmissao: string; status: string } | null = null;
    if (espelho.numeroControle) {
      const notaExistente = await tenantPrisma.invoice.findFirst({
        where: {
          tipo: TipoNota.SAIDA,
          espelhoNumero: espelho.numeroControle,
          status: { not: StatusNota.CANCELADA },
        },
        select: { numero: true, dataEmissao: true, status: true },
      });
      if (notaExistente) {
        jaFaturado = {
          numeroNota: notaExistente.numero,
          dataEmissao: notaExistente.dataEmissao.toISOString(),
          status: notaExistente.status,
        };
      }
    }

    return {
      success: true,
      espelho,
      partner: matchedPartner || partners[0] || null,
      availablePartners: partners,
      jaFaturado,
    };
  } catch (err: any) {
    console.error("[parseEspelhoFileAction] Erro:", err);
    return {
      success: false,
      error: err.message || "Erro ao processar o arquivo de espelho.",
    };
  }
}

/**
 * Emite a NF-e de Cobrança de Industrialização (CFOP 5.124) na Focus NFe a partir do Espelho
 */
export async function emitirCobrancaEspelhoAction({
  partnerId,
  itens,
  numeroControleEspelho,
  observacoesFiscais,
  remessaOrigemId,
  chaveNfeReferenciada,
  previsaoPagamento,
}: {
  partnerId: string;
  itens: Array<{
    op?: string;
    referencia: string;
    faseServico?: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    ncm?: string;
  }>;
  numeroControleEspelho?: string;
  observacoesFiscais?: string;
  remessaOrigemId?: string;
  chaveNfeReferenciada?: string;
  previsaoPagamento?: string;
}) {
  const { tenantId, tenantPrisma } = await requireTenantSession();

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { success: false, error: "Oficina não encontrada." };
  }

  const partner = await tenantPrisma.partner.findUnique({
    where: { id: partnerId },
  });

  if (!partner) {
    return { success: false, error: "Fábrica parceira destinatária da cobrança não encontrada." };
  }

  const valorTotal = itens.reduce((acc, it) => acc + it.valorTotal, 0);
  const idempotencyKey = `cobranca_${tenantId}_${Date.now()}`;

  const payload = buildFocusNfeCobrancaPayload({
    tenant,
    partner,
    itens,
    numeroControleEspelho,
    numeroNota: tenant.proximoNumero || undefined,
    serieNota: tenant.serieNfe ? String(tenant.serieNfe) : "1",
    observacoesFiscais,
    chaveReferenciada: chaveNfeReferenciada,
  });

  const baseUrl = getFocusBaseUrl(tenant.ambiente);
  const token =
    tenant.ambiente === "PRODUCAO"
      ? tenant.focusNfeTokenProducao
      : tenant.focusNfeTokenHomologacao;

  if (!token) {
    return {
      success: false,
      error: `Token da Focus NFe (${tenant.ambiente}) não configurado.`,
    };
  }

  try {
    const focusUrl = `${baseUrl}/v2/nfe?ref=${idempotencyKey}`;
    const basicAuth = Buffer.from(`${token}:`).toString("base64");

    const focusResponse = await fetch(focusUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const focusData = await focusResponse.json();

    if (!focusResponse.ok) {
      return {
        success: false,
        error: focusData.mensagem || focusData.erros || "Erro na transmissão para a SEFAZ.",
      };
    }

    const numeroEmitido = payload.numero || 1;
    const serieEmitida = parseInt(payload.serie || "1", 10);
    const chaveEmitida = focusData.chave_nfe || null;
    const statusFocus =
      focusData.status === "autorizado" ? StatusNota.AUTORIZADA : StatusNota.PENDENTE;

    const newInvoice = await tenantPrisma.invoice.create({
      data: {
        tenantId,
        numero: numeroEmitido,
        serie: serieEmitida,
        chaveAcesso: chaveEmitida,
        tipo: TipoNota.SAIDA,
        finalidade: "INDUSTRIALIZAÇÃO COBRANÇA",
        modalidadeEmissao: "COBRANCA_INDUSTRIALIZACAO",
        espelhoNumero: numeroControleEspelho || null,
        chaveNfeReferenciada: chaveNfeReferenciada || null,
        status: statusFocus,
        valorTotal,
        dataEmissao: new Date(),
        partnerId: partner.id,
        focusNfeRef: idempotencyKey,
        idempotencyKey,
        rawJson: {
          focusPayload: payload,
          focusResponse: focusData,
          espelhoControle: numeroControleEspelho,
          previsaoPagamento: previsaoPagamento || null,
          remessaOrigemId: remessaOrigemId || null,
          modalidade: "COBRANCA_INDUSTRIALIZACAO",
        },
      },
    });

    // Incrementa próximo número
    await prismaAdmin.tenant.update({
      where: { id: tenantId },
      data: { proximoNumero: { increment: 1 } },
    });

    // Indexa histórico de preços praticados por referência e fábrica parceira
    try {
      const itensCobrados = payload?.itens || [];
      for (const item of itensCobrados) {
        const refItem = String(item.codigo || "").trim().toUpperCase();
        const valorUnit = Number(item.valor_unitario_comercial || 0);
        if (refItem && valorUnit > 0) {
          await tenantPrisma.partnerPriceHistory.upsert({
            where: {
              tenantId_partnerId_referencia: {
                tenantId,
                partnerId: partner.id,
                referencia: refItem,
              },
            },
            create: {
              tenantId,
              partnerId: partner.id,
              referencia: refItem,
              descricao: item.descricao || null,
              valorUnitario: valorUnit,
              ultimaNotaId: newInvoice.id,
              dataRegistro: new Date(),
            },
            update: {
              valorUnitario: valorUnit,
              descricao: item.descricao || undefined,
              ultimaNotaId: newInvoice.id,
              dataRegistro: new Date(),
            },
          });
        }
      }
    } catch (priceErr) {
      console.warn("[emitirCobrancaEspelhoAction] Aviso ao indexar histórico de preço:", priceErr);
    }

    // Se já veio autorizado com arquivos, salva-os
    if (focusData.status === "autorizado" && chaveEmitida) {
      if (focusData.caminho_danfe) {
        try {
          const pdfDoc = await downloadFocusNfeDocument(focusData.caminho_danfe, token, tenant.ambiente);
          if (pdfDoc.success && pdfDoc.buffer && pdfDoc.buffer.slice(0, 5).toString() === "%PDF-") {
            const pdfUrl = await uploadInvoicePdf(tenantId, chaveEmitida, pdfDoc.buffer);
            await tenantPrisma.invoice.update({ where: { id: newInvoice.id }, data: { pdfUrl } });
          }
        } catch (_) {}
      }
      if (focusData.caminho_xml_nota_fiscal) {
        try {
          const xmlDoc = await downloadFocusNfeDocument(focusData.caminho_xml_nota_fiscal, token, tenant.ambiente);
          if (xmlDoc.success && xmlDoc.buffer && xmlDoc.buffer.slice(0, 1).toString() === "<") {
            const xmlUrl = await uploadInvoiceXml(tenantId, chaveEmitida, xmlDoc.buffer.toString("utf-8"));
            await tenantPrisma.invoice.update({ where: { id: newInvoice.id }, data: { xmlUrl } });
          }
        } catch (_) {}
      }
    }

    revalidatePath("/notas");
    revalidatePath("/");

    return {
      success: true,
      invoiceId: newInvoice.id,
      numero: numeroEmitido,
      status: statusFocus,
      mensagemSefaz: focusData.mensagem_sefaz || "Nota enviada para processamento na SEFAZ",
    };
  } catch (err: any) {
    console.error("[emitirCobrancaEspelhoAction] Erro:", err);
    return {
      success: false,
      error: err.message || "Erro inesperado ao transmitir NF de Cobrança.",
    };
  }
}

/**
 * Envia a NF-e autorizada por e-mail para o parceiro / fábrica / financeiro
 * Identificando o Tenant no remetente (ex: "H E LEMOS CONFECCAO via Nota Fácil <notas@appnotafacil.online>")
 * e anexando os arquivos oficiais DANFE (PDF) e XML
 */
export async function sendInvoiceEmailAction({
  invoiceId,
  toEmail,
  ccEmails,
}: {
  invoiceId: string;
  toEmail: string;
  ccEmails?: string[];
}) {
  try {
    const { tenantId, tenantPrisma, session } = await requireTenantSession();

    const cleanTo = toEmail?.trim().toLowerCase();
    if (!cleanTo || !cleanTo.includes("@")) {
      return { success: false, error: "Informe um endereço de e-mail de destinatário válido." };
    }

    const invoice = await tenantPrisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        partner: true,
      },
    });

    if (!invoice) {
      return { success: false, error: "Nota fiscal não encontrada." };
    }

    if (invoice.status !== StatusNota.AUTORIZADA) {
      return {
        success: false,
        error: "Apenas notas autorizadas pela SEFAZ podem ser enviadas por e-mail.",
      };
    }

    const tenant = await prismaAdmin.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { success: false, error: "Dados da oficina emissora não encontrados." };
    }

    // 1. Tenta obter o PDF do DANFE
    let pdfBuffer: Buffer | null = null;
    const chaveFinal = invoice.chaveAcesso || invoice.id;

    // Primeiro via Storage Key padrão
    pdfBuffer = await getFileFromStorage(`invoices/${tenantId}/${chaveFinal}.pdf`);

    // Se não encontrou, tenta buscar da URL do PDF
    if (!pdfBuffer && invoice.pdfUrl) {
      try {
        const resp = await fetch(invoice.pdfUrl);
        if (resp.ok) {
          const arrBuf = await resp.arrayBuffer();
          pdfBuffer = Buffer.from(arrBuf);
        }
      } catch (_) {}
    }

    // 2. Tenta obter o XML
    let xmlBuffer: Buffer | null = null;
    xmlBuffer = await getFileFromStorage(`invoices/${tenantId}/${chaveFinal}.xml`);

    if (!xmlBuffer && invoice.xmlUrl) {
      try {
        const resp = await fetch(invoice.xmlUrl);
        if (resp.ok) {
          const arrBuf = await resp.arrayBuffer();
          xmlBuffer = Buffer.from(arrBuf);
        }
      } catch (_) {}
    }

    // Se ainda faltar algum documento e a nota tiver dados no Focus NFe, tenta baixar direto
    if ((!pdfBuffer || !xmlBuffer) && (tenant.focusNfeTokenProducao || tenant.focusNfeTokenHomologacao)) {
      try {
        const token = (tenant.ambiente === "PRODUCAO" ? tenant.focusNfeTokenProducao : tenant.focusNfeTokenHomologacao) || "";
        if (token && invoice.focusNfeRef) {
          const statusFocus = await getNfeStatusFromFocus({
            ref: invoice.focusNfeRef,
            token,
            ambiente: tenant.ambiente,
          });
          if (statusFocus.success && statusFocus.data) {
            if (!pdfBuffer && statusFocus.data.caminho_danfe) {
              const pdfDoc = await downloadFocusNfeDocument(statusFocus.data.caminho_danfe, token, tenant.ambiente);
              if (pdfDoc.success && pdfDoc.buffer) {
                pdfBuffer = pdfDoc.buffer;
              }
            }
            if (!xmlBuffer && statusFocus.data.caminho_xml_nota_fiscal) {
              const xmlDoc = await downloadFocusNfeDocument(statusFocus.data.caminho_xml_nota_fiscal, token, tenant.ambiente);
              if (xmlDoc.success && xmlDoc.buffer) {
                xmlBuffer = xmlDoc.buffer;
              }
            }
          }
        }
      } catch (focusErr) {
        console.warn("[sendInvoiceEmailAction] Erro ao tentar fallback Focus NFe:", focusErr);
      }
    }

    // Monta lista de destinatários
    const toList = [cleanTo];
    if (ccEmails && ccEmails.length > 0) {
      for (const cc of ccEmails) {
        const trimmed = cc.trim().toLowerCase();
        if (trimmed && trimmed.includes("@") && !toList.includes(trimmed)) {
          toList.push(trimmed);
        }
      }
    }

    // Dispara o e-mail via Resend
    const nomeOficina = tenant.nomeFantasia || tenant.razaoSocial;
    const res = await sendInvoiceEmail({
      to: toList,
      tenantInfo: {
        razaoSocial: tenant.razaoSocial,
        nomeFantasia: tenant.nomeFantasia,
        cnpj: tenant.cnpj,
        emailPrincipal: tenant.emailPrincipal || undefined,
        telefoneContato: tenant.telefoneContato || undefined,
        chavePix: tenant.chavePix || undefined,
        dadosBancarios: tenant.dadosBancarios || undefined,
      },
      razaoSocialEmitente: tenant.razaoSocial,
      numeroNota: invoice.numero || 0,
      serieNota: invoice.serie || 1,
      chaveAcesso: invoice.chaveAcesso || "",
      valorTotal: Number(invoice.valorTotal),
      modalidade: invoice.modalidadeEmissao,
      parceiroNome: invoice.partner?.nomeFantasia || invoice.partner?.razaoSocial || null,
      danfePdfBuffer: pdfBuffer || undefined,
      xmlContent: xmlBuffer || undefined,
    });

    if (!res.success) {
      return {
        success: false,
        error: res.error || "Falha ao enviar e-mail através do provedor.",
      };
    }

    // Grava auditoria
    await prismaAdmin.auditLog.create({
      data: {
        tenantId,
        actorType: "USUARIO_TENANT",
        actorId: session.user.id,
        acao: "ENVIO_NFE_EMAIL",
        entidade: "Invoice",
        entidadeId: invoice.id,
        detalhe: {
          destinatarios: toList,
          numeroNota: invoice.numero,
          chaveAcesso: invoice.chaveAcesso,
          anexosPdf: !!pdfBuffer,
          anexosXml: !!xmlBuffer,
        },
      },
    });

    return {
      success: true,
      message: `NF-e Nº ${invoice.numero} enviada com sucesso para ${toList.join(", ")}!`,
    };
  } catch (err: any) {
    console.error("[sendInvoiceEmailAction] Erro:", err);
    return {
      success: false,
      error: err.message || "Erro inesperado ao enviar a nota fiscal por e-mail.",
    };
  }
}

/**
 * Exclui uma nota fiscal do tenant (apenas se não estiver AUTORIZADA na SEFAZ)
 */
export async function deleteInvoiceAction(invoiceId: string) {
  try {
    const { session, tenantId, tenantPrisma } = await requireTenantSession();

    const invoice = await tenantPrisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { success: false, error: "Nota fiscal não encontrada ou já excluída." };
    }

    if (invoice.status === "AUTORIZADA") {
      return {
        success: false,
        error: "Notas autorizadas na SEFAZ não podem ser excluídas diretamente. Cancele a nota primeiro.",
      };
    }

    await tenantPrisma.invoice.delete({
      where: { id: invoiceId },
    });

    await prismaAdmin.auditLog.create({
      data: {
        tenantId,
        actorType: "USER",
        actorId: session.user.id,
        acao: "EXCLUSAO_NOTA",
        entidade: "Invoice",
        entidadeId: invoiceId,
        detalhe: {
          userEmail: session.user.email,
          numero: invoice.numero,
          serie: invoice.serie,
          tipo: invoice.tipo,
          status: invoice.status,
          chaveAcesso: invoice.chaveAcesso,
          valorTotal: Number(invoice.valorTotal),
        },
      },
    });

    revalidatePath("/notas");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("[deleteInvoiceAction] Erro:", err);
    return {
      success: false,
      error: err.message || "Erro inesperado ao excluir nota fiscal.",
    };
  }
}
