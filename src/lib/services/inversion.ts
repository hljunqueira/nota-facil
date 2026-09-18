/**
 * Motor Fiscal de Inversão de Notas Fiscais em 1 Clique
 * Transforma NF-e de entrada (Remessa para Industrialização 5.901)
 * em NF-e de saída (Retorno de Insumo 5.902 + Mão de Obra de Costura 5.124).
 */

import { createTenantPrisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";

export interface InvertedItem {
  numeroItem: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cfopEntradaOriginal: string;
  cfopSaida: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface InversionPreparationResult {
  notaEntrada: {
    id: string;
    numero: number;
    serie: number;
    chaveAcesso: string;
    dataEmissao: Date;
    valorTotal: number;
    emitenteFabrica: {
      nome: string;
      cnpj: string;
      ie?: string;
      cidade?: string;
      uf?: string;
    };
    itens: any[];
  };
  itensRetorno: InvertedItem[];
  totalInsumosRetorno: number;
  quantidadeTotalPecas: number;
  cfopMap: Record<string, string>;
}

export async function prepareInvoiceInversion(
  tenantId: string,
  invoiceId: string
): Promise<{ success: boolean; data?: InversionPreparationResult; error?: string }> {
  const tenantPrisma = createTenantPrisma(tenantId);

  const invoice = await tenantPrisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { partner: true },
  });

  if (!invoice) {
    return { success: false, error: "Nota fiscal de entrada não encontrada." };
  }

  // Busca regras fiscais de CFOP cadastradas pelo tenant
  const cfopRules = await tenantPrisma.cfopRule.findMany({
    where: { ativo: true },
  });

  const cfopMap: Record<string, string> = {};
  for (const r of cfopRules) {
    cfopMap[r.cfopEntrada] = r.cfopSaidaCorrespondente;
  }

  // Extrai itens da nota de entrada
  const rawData: any = invoice.rawJson || {};
  const itensEntrada: any[] = rawData.itens || [];

  if (itensEntrada.length === 0) {
    return {
      success: false,
      error: "Esta nota não possui itens detalhados gravados para inversão.",
    };
  }

  let totalInsumos = 0;
  let totalQtd = 0;

  const itensRetorno: InvertedItem[] = itensEntrada.map((item, idx) => {
    const cfopIn = (item.cfop || "5901").replace(/\D/g, "");
    // Regra do tenant ou preset padrão (5901 -> 5902, 6901 -> 6902)
    let cfopOut = cfopMap[cfopIn];
    if (!cfopOut) {
      cfopOut = cfopIn.startsWith("6") ? "6902" : "5902";
    }

    const itemTotal = Number(item.valorTotal || item.valorUnitario * item.quantidade || 0);
    const qtd = Number(item.quantidade || 1);

    totalInsumos += itemTotal;
    totalQtd += qtd;

    return {
      numeroItem: idx + 1,
      codigo: item.codigo || `ITEM-${idx + 1}`,
      descricao: item.descricao?.startsWith("Retorno") ? item.descricao : `Retorno de ${item.descricao}`,
      ncm: item.ncm || "61091000",
      cfopEntradaOriginal: cfopIn,
      cfopSaida: cfopOut,
      unidade: item.unidade || "UN",
      quantidade: qtd,
      valorUnitario: Number(item.valorUnitario || 0),
      valorTotal: itemTotal,
    };
  });

  const emitente = rawData.emitente || {};

  return {
    success: true,
    data: {
      notaEntrada: {
        id: invoice.id,
        numero: invoice.numero,
        serie: invoice.serie,
        chaveAcesso: invoice.chaveAcesso || "",
        dataEmissao: invoice.dataEmissao,
        valorTotal: Number(invoice.valorTotal),
        emitenteFabrica: {
          nome: invoice.partner?.razaoSocial || emitente.razaoSocial || "Fábrica Parceira",
          cnpj: invoice.partner?.cnpj || emitente.cnpj || "",
          ie: emitente.inscricaoEstadual,
          cidade: emitente.municipio,
          uf: emitente.uf,
        },
        itens: itensEntrada,
      },
      itensRetorno,
      totalInsumosRetorno: totalInsumos,
      quantidadeTotalPecas: totalQtd,
      cfopMap,
    },
  };
}

/**
 * Monta o payload no padrão Focus NFe v2.0 para emissão de NF-e
 */
export function buildFocusNfePayload({
  tenant,
  partner,
  chaveAcessoEntrada,
  itensRetorno,
  cobrarServico,
  valorServicoPorPeca,
  quantidadePecasServico,
  observacoesFiscais,
}: {
  tenant: any;
  partner: any;
  chaveAcessoEntrada: string;
  itensRetorno: InvertedItem[];
  cobrarServico?: boolean;
  valorServicoPorPeca?: number;
  quantidadePecasServico?: number;
  observacoesFiscais?: string;
}) {
  const itemsPayload: any[] = [];
  let itemNum = 1;

  // 1. Itens de Retorno de Insumo (CFOP 5902 / 6902)
  for (const item of itensRetorno) {
    itemsPayload.push({
      numero_item: itemNum++,
      codigo_produto: item.codigo,
      descricao: item.descricao,
      codigo_ncm: item.ncm.replace(/\D/g, ""),
      cfop: item.cfopSaida,
      unidade_comercial: item.unidade,
      quantidade_comercial: item.quantidade,
      valor_unitario_comercial: item.valorUnitario,
      valor_bruto: item.valorTotal,
      unidade_tributavel: item.unidade,
      quantidade_tributavel: item.quantidade,
      valor_unitario_tributavel: item.valorUnitario,
      origem: 0,
      icms_situacao_tributaria: "400", // Não tributada pelo Simples Nacional (Insumo)
    });
  }

  // 2. Item opcional de Serviço / Mão de Obra de Costura (CFOP 5.124)
  if (cobrarServico && valorServicoPorPeca && valorServicoPorPeca > 0) {
    const qtdServico = quantidadePecasServico || 1;
    const totalServico = qtdServico * valorServicoPorPeca;

    itemsPayload.push({
      numero_item: itemNum++,
      codigo_produto: "SERV-COSTURA",
      descricao: "Servico de faccao e industrializacao por encomenda",
      codigo_ncm: "61091000",
      cfop: partner?.uf && partner.uf !== tenant.uf ? "6124" : "5124",
      unidade_comercial: "PC",
      quantidade_comercial: qtdServico,
      valor_unitario_comercial: valorServicoPorPeca,
      valor_bruto: totalServico,
      unidade_tributavel: "PC",
      quantidade_tributavel: qtdServico,
      valor_unitario_tributavel: valorServicoPorPeca,
      origem: 0,
      icms_situacao_tributaria: "101", // Simples Nacional com permissão de crédito
    });
  }

  const infAdic = `Retorno de mercadoria recebida para industrializacao ref. NF-e Chave ${chaveAcessoEntrada}. ${
    observacoesFiscais ? observacoesFiscais.trim() : ""
  }`.trim();

  return {
    natureza_operacao: "Retorno de Industrializacao por Encomenda",
    tipo_documento: 1, // 1 = Saída
    finalidade_emissao: 1, // 1 = Normal
    cnpj_emitente: tenant.cnpj.replace(/\D/g, ""),
    data_emissao: new Date().toISOString(),

    // Destinatário: Fábrica parceira (ex: Ritme)
    nome_destinatario: partner.razaoSocial,
    cnpj_destinatario: partner.cnpj.replace(/\D/g, ""),
    inscricao_estadual_destinatario: partner.inscricaoEstadual?.trim().toUpperCase() || "ISENTO",
    indicador_inscricao_estadual_destinatario: partner.inscricaoEstadual ? 1 : 9,

    // Documentos Referenciados (Obrigatório SEFAZ)
    notas_referenciadas: [
      {
        chave_nfe: chaveAcessoEntrada.replace(/\D/g, ""),
      },
    ],

    itens: itemsPayload,
    informacoes_adicionais_contribuinte: infAdic,
  };
}
