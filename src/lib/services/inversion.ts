/**
 * Motor Fiscal de Inversão de Notas Fiscais em 1 Clique
 * Transforma NF-e de entrada (Remessa para Industrialização 5.901)
 * em NF-e de saída (Retorno de Insumo 5.902 + Mão de Obra de Costura 5.124).
 */

import { createTenantPrisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { extractNfeKeyFromText } from "./nfeKey";

/**
 * Determina se um item de remessa é produto principal de vestuário/confecção
 * ou se é aviamento secundário / insumo fracionado (linhas, zíperes, elásticos, etiquetas, RFID).
 */
export function isVestuarioItem(item: { ncm?: string; descricao?: string; unidade?: string }): boolean {
  const ncm = (item.ncm || "").replace(/\D/g, "");
  const desc = (item.descricao || "").toUpperCase();
  const un = (item.unidade || "").toUpperCase();

  // NCMs que são inequivocamente aviamentos/insumos e NUNCA peças de vestuário
  const isNcmAviamento =
    ncm.startsWith("9607") || // zíperes
    ncm.startsWith("9606") || // botões
    ncm.startsWith("5807") || // etiquetas tecidas/impressas
    ncm.startsWith("8523") || // tags RFID / smart tags
    ncm.startsWith("5401") || // linhas de costura sintéticas
    ncm.startsWith("5402") || // fios sintéticos/texturizados
    ncm.startsWith("5508") || // linhas de costura descontinuadas
    ncm.startsWith("5806") || // fitas, elásticos
    ncm.startsWith("3926") || // plásticos, presilhas
    ncm.startsWith("3923") || // sacos plásticos
    ncm.startsWith("4821") || // etiquetas de papel/cartão
    ncm.startsWith("5604") || // cordões de borracha
    ncm.startsWith("5607");   // cordéis e cordas

  if (isNcmAviamento) return false;

  // Palavras-chave inequívocas de aviamentos/insumos na descrição
  const termosAviamento = [
    "ETIQUETA",
    "RFID",
    "LINHA",
    "FIO ",
    "FIO 100%",
    "ZIPER",
    "ZÍPER",
    "ELASTICO",
    "ELÁSTICO",
    "BOTAO",
    "BOTÃO",
    "ENTRETELA",
    "FITA",
    "CADARCO",
    "CADARÇO",
    "VELCRO",
    "COLCHETE",
    "TAG",
    "CABIDE",
    "SACO",
    "EMBALAGEM",
    "RETALHO",
    "CORDAO",
    "CORDÃO",
    "ILHOS",
    "ILHÓS",
  ];

  if (termosAviamento.some((termo) => desc.includes(termo))) {
    return false;
  }

  // Unidades típicas de matéria-prima fracionada/contínua e não peça acabada (ex: Metro, Quilo, Rolo)
  if (["M", "MT", "MTR", "METRO", "KG", "KILOGRAMA", "RL", "ROLO"].includes(un)) {
    return false;
  }

  // Se tem NCM dos capítulos de confecção de vestuário:
  // 61: Vestuário de malha (vestidos, camisetas, blusas, saias, shorts, calças, etc.)
  // 62: Vestuário exceto malha (vestidos tecido plano, camisas, calças, etc.)
  // 63: Outros artefatos têxteis confeccionados
  if (ncm.startsWith("61") || ncm.startsWith("62") || ncm.startsWith("63")) {
    return true;
  }

  // Se unidade é UN ou PC e não é aviamento:
  if (["UN", "PC", "PÇA", "PEC", "PECA", "PEÇA"].includes(un)) {
    return true;
  }

  return false;
}

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
      modoEmissao?: string;
      modeloEspelho?: string;
    };
    itens: any[];
  };
  itensRetorno: InvertedItem[];
  totalInsumosRetorno: number;
  quantidadeTotalPecas: number;
  cfopMap: Record<string, string>;
  transporte?: any;
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
  let totalPecasVestuario = 0;

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
    if (isVestuarioItem(item)) {
      totalPecasVestuario += qtd;
    }

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
          ie: invoice.partner?.inscricaoEstadual || emitente.inscricaoEstadual,
          cidade: emitente.municipio,
          uf: emitente.uf,
          modoEmissao: invoice.partner?.modoEmissao || "SEPARADO",
          modeloEspelho: invoice.partner?.modeloEspelho || "RITMI",
        },
        itens: itensEntrada,
      },
      itensRetorno,
      totalInsumosRetorno: totalInsumos,
      quantidadeTotalPecas: totalPecasVestuario > 0 ? totalPecasVestuario : totalQtd,
      cfopMap,
      transporte: rawData.transporte || undefined,
    },
  };
}

/**
 * Prepara a inversão agrupada de múltiplas remessas (5901) da mesma fábrica parceira
 */
export async function prepareBatchInvoiceInversion(
  tenantId: string,
  invoiceIds: string[]
): Promise<{ success: boolean; data?: InversionPreparationResult & { chavesReferenciadas: string[] }; error?: string }> {
  const tenantPrisma = createTenantPrisma(tenantId);

  const invoices = await tenantPrisma.invoice.findMany({
    where: { id: { in: invoiceIds } },
    include: { partner: true },
    orderBy: { numero: "asc" },
  });

  if (invoices.length === 0) {
    return { success: false, error: "Nenhuma nota selecionada para agrupamento." };
  }

  const partnerId = invoices[0].partnerId;
  const differentPartner = invoices.some((inv) => inv.partnerId !== partnerId);
  if (differentPartner) {
    return { success: false, error: "Todas as notas agrupadas devem pertencer à mesma fábrica parceira." };
  }

  const cfopRules = await tenantPrisma.cfopRule.findMany({
    where: { ativo: true },
  });

  const cfopMap: Record<string, string> = {};
  for (const r of cfopRules) {
    cfopMap[r.cfopEntrada] = r.cfopSaidaCorrespondente;
  }

  let totalInsumos = 0;
  let totalQtd = 0;
  let totalPecasVestuario = 0;
  let itemNum = 1;
  const itensRetorno: InvertedItem[] = [];
  const chavesReferenciadas: string[] = [];

  for (const inv of invoices) {
    if (inv.chaveAcesso) chavesReferenciadas.push(inv.chaveAcesso);

    const rawData: any = inv.rawJson || {};
    const itensEntrada: any[] = rawData.itens || [];

    for (const item of itensEntrada) {
      const cfopIn = (item.cfop || "5901").replace(/\D/g, "");
      let cfopOut = cfopMap[cfopIn];
      if (!cfopOut) {
        cfopOut = cfopIn.startsWith("6") ? "6902" : "5902";
      }

      const itemTotal = Number(item.valorTotal || item.valorUnitario * item.quantidade || 0);
      const qtd = Number(item.quantidade || 1);

      totalInsumos += itemTotal;
      totalQtd += qtd;
      if (isVestuarioItem(item)) {
        totalPecasVestuario += qtd;
      }

      itensRetorno.push({
        numeroItem: itemNum++,
        codigo: item.codigo || `ITEM-${itemNum}`,
        descricao: item.descricao?.startsWith("Retorno") ? item.descricao : `Retorno de ${item.descricao} (Ref. NF ${inv.numero})`,
        ncm: item.ncm || "61091000",
        cfopEntradaOriginal: cfopIn,
        cfopSaida: cfopOut,
        unidade: item.unidade || "UN",
        quantidade: qtd,
        valorUnitario: Number(item.valorUnitario || 0),
        valorTotal: itemTotal,
      });
    }
  }

  const firstInv = invoices[0];
  const rawFirst: any = firstInv.rawJson || {};
  const emitente = rawFirst.emitente || {};

  return {
    success: true,
    data: {
      notaEntrada: {
        id: firstInv.id,
        numero: firstInv.numero,
        serie: firstInv.serie,
        chaveAcesso: chavesReferenciadas.join(", "),
        dataEmissao: firstInv.dataEmissao,
        valorTotal: totalInsumos,
        emitenteFabrica: {
          nome: firstInv.partner?.razaoSocial || emitente.razaoSocial || "Fábrica Parceira",
          cnpj: firstInv.partner?.cnpj || emitente.cnpj || "",
          ie: firstInv.partner?.inscricaoEstadual || emitente.inscricaoEstadual,
          cidade: emitente.municipio,
          uf: emitente.uf,
          modoEmissao: firstInv.partner?.modoEmissao || "SEPARADO",
          modeloEspelho: firstInv.partner?.modeloEspelho || "RITMI",
        },
        itens: itensRetorno,
      },
      itensRetorno,
      totalInsumosRetorno: totalInsumos,
      quantidadeTotalPecas: totalPecasVestuario > 0 ? totalPecasVestuario : totalQtd,
      cfopMap,
      chavesReferenciadas,
      transporte: rawFirst.transporte || undefined,
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
  chavesAcessoEntrada,
  itensRetorno,
  cobrarServico,
  valorServicoPorPeca,
  quantidadePecasServico,
  observacoesFiscais,
  emitenteInfo,
  cfopRetornoOverride,
  transporteInfo,
}: {
  tenant: any;
  partner: any;
  chaveAcessoEntrada: string;
  chavesAcessoEntrada?: string[];
  itensRetorno: InvertedItem[];
  cobrarServico?: boolean;
  valorServicoPorPeca?: number;
  quantidadePecasServico?: number;
  observacoesFiscais?: string;
  emitenteInfo?: any;
  cfopRetornoOverride?: string;
  transporteInfo?: {
    modalidadeFrete?: string;
    transportador?: {
      razaoSocial?: string;
      cnpj?: string;
      inscricaoEstadual?: string;
      endereco?: string;
      municipio?: string;
      uf?: string;
      placa?: string;
      ufVeiculo?: string;
    };
    volumes?: {
      quantidade?: number;
      especie?: string;
      marca?: string;
      numero?: string;
      pesoBruto?: number;
      pesoLiquido?: number;
    };
  };
}) {
  const itemsPayload: any[] = [];
  let itemNum = 1;

  // 1. Itens de Retorno de Insumo (CFOP 5902 / 5904 / 6902)
  for (const item of itensRetorno) {
    const desc = item.descricao.length > 120 ? item.descricao.substring(0, 120).trim() : item.descricao;
    const finalCfop = cfopRetornoOverride ? cfopRetornoOverride.replace(/\D/g, "") : item.cfopSaida;

    itemsPayload.push({
      numero_item: itemNum++,
      codigo_produto: item.codigo,
      descricao: desc,
      codigo_ncm: item.ncm.replace(/\D/g, ""),
      cfop: finalCfop,
      unidade_comercial: item.unidade,
      quantidade_comercial: item.quantidade,
      valor_unitario_comercial: item.valorUnitario,
      valor_bruto: item.valorTotal,
      unidade_tributavel: item.unidade,
      quantidade_tributavel: item.quantidade,
      valor_unitario_tributavel: item.valorUnitario,
      origem: 0,
      icms_origem: 0,
      icms_situacao_tributaria: "400", // Não tributada pelo Simples Nacional (Insumo)
      pis_situacao_tributaria: "08",  // Operação sem incidência da contribuição
      cofins_situacao_tributaria: "08", // Operação sem incidência da contribuição
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
      icms_origem: 0,
      icms_situacao_tributaria: "101", // Simples Nacional com permissão de crédito
      pis_situacao_tributaria: "08",
      cofins_situacao_tributaria: "08",
    });
  }

  // Monta lista de chaves referenciadas garantindo 44 dígitos
  const rawChaves = chavesAcessoEntrada && chavesAcessoEntrada.length > 0
    ? chavesAcessoEntrada
    : [chaveAcessoEntrada];

  const cleanChaves = rawChaves
    .map((c) => {
      let digits = (c || "").replace(/\D/g, "");
      if (digits.length === 45 && digits.startsWith("1")) {
        digits = digits.substring(1);
      } else if (digits.length > 44) {
        const extracted = extractNfeKeyFromText(c);
        if (extracted) digits = extracted;
      }
      return digits;
    })
    .filter((c) => c.length === 44);

  const notasRefPayload = cleanChaves.map((chave_nfe) => ({ chave_nfe }));

  // Fallback seguro caso a lista esteja vazia
  const rawFallback = (chaveAcessoEntrada || "").replace(/\D/g, "");
  const safeFallback = rawFallback.length === 45 && rawFallback.startsWith("1")
    ? rawFallback.substring(1)
    : rawFallback;
  const finalRefKey = cleanChaves.length > 0 ? cleanChaves[0] : safeFallback;

  const infAdic = `Retorno de mercadoria recebida para industrializacao ref. NF-e Chave(s): ${cleanChaves.join(", ")}. Nao incidencia de ICMS conf. legislacao estadual. Prestacao de servico tributada pelo Simples Nacional conf. LC 123/2006 (Anexo II - Industria). ${
    observacoesFiscais ? observacoesFiscais.trim() : ""
  }`.trim();

  // Dados do Destinatário (Fábrica parceira)
  const cleanPartnerCnpj = (partner.cnpj || "").replace(/\D/g, "");
  const ieDest = partner.inscricaoEstadual?.trim().toUpperCase() ||
    emitenteInfo?.inscricaoEstadual ||
    (cleanPartnerCnpj === "72305295000115" ? "252740106" : undefined);

  // Configuração de Transporte & Volumes
  const modalidadeFrete = transporteInfo?.modalidadeFrete !== undefined && transporteInfo?.modalidadeFrete !== null
    ? String(transporteInfo.modalidadeFrete)
    : "0"; // 0 = Por conta do Emitente / Remetente

  const transp = transporteInfo?.transportador;
  const vols = transporteInfo?.volumes;

  const transportPayload: any = {
    modalidade_frete: modalidadeFrete,
  };

  if (transp) {
    if (transp.razaoSocial) transportPayload.nome_transportador = transp.razaoSocial.substring(0, 60);
    if (transp.cnpj) transportPayload.cnpj_transportador = transp.cnpj.replace(/\D/g, "");
    if (transp.inscricaoEstadual) transportPayload.inscricao_estadual_transportador = transp.inscricaoEstadual.replace(/\D/g, "");
    if (transp.endereco) transportPayload.endereco_transportador = transp.endereco.substring(0, 60);
    if (transp.municipio) transportPayload.municipio_transportador = transp.municipio.substring(0, 60);
    if (transp.uf) transportPayload.uf_transportador = transp.uf.substring(0, 2).toUpperCase();
    if (transp.placa) transportPayload.veiculo_placa = transp.placa.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (transp.ufVeiculo) transportPayload.veiculo_uf = transp.ufVeiculo.substring(0, 2).toUpperCase();
  }

  if (vols) {
    if (vols.quantidade) transportPayload.quantidade_volumes = Number(vols.quantidade);
    if (vols.especie) transportPayload.especie_volumes = String(vols.especie).substring(0, 60);
    if (vols.marca) transportPayload.marca_volumes = String(vols.marca).substring(0, 60);
    if (vols.numero) transportPayload.numero_volumes = String(vols.numero).substring(0, 60);
    if (vols.pesoBruto) transportPayload.peso_bruto_volumes = Number(vols.pesoBruto);
    if (vols.pesoLiquido) transportPayload.peso_liquido_volumes = Number(vols.pesoLiquido);
  }

  const naturezaOperacao = cfopRetornoOverride === "5904" || cfopRetornoOverride === "6904"
    ? "Remessa para industrializacao por conta e ordem"
    : "Retorno de mercadoria por encomenda";

  return {
    natureza_operacao: naturezaOperacao,
    tipo_documento: 1, // 1 = Saída
    finalidade_emissao: 1, // 1 = Normal
    numero: tenant.proximoNumero || undefined,
    serie: tenant.serieNfe ? String(tenant.serieNfe) : "1",
    cnpj_emitente: tenant.cnpj.replace(/\D/g, ""),
    data_emissao: new Date().toISOString(),

    // Destinatário: Fábrica parceira (ex: Ritmi)
    nome_destinatario: partner.razaoSocial || emitenteInfo?.razaoSocial || "RITMI CONFECCOES LTDA",
    cnpj_destinatario: cleanPartnerCnpj,
    inscricao_estadual_destinatario: ieDest || "ISENTO",
    indicador_inscricao_estadual_destinatario: ieDest ? 1 : 9,
    logradouro_destinatario: partner.logradouro || emitenteInfo?.logradouro || "RODOVIA SO 350 - ANTONIO LIVINO F",
    numero_destinatario: partner.numero || emitenteInfo?.numero || "200",
    bairro_destinatario: partner.bairro || emitenteInfo?.bairro || "NOVA GUARITA",
    municipio_destinatario: partner.municipio || emitenteInfo?.municipio || "SOMBRIO",
    uf_destinatario: partner.uf || emitenteInfo?.uf || "SC",
    cep_destinatario: (partner.cep || emitenteInfo?.cep || "88960000").replace(/\D/g, ""),
    telefone_destinatario: (partner.telefone || emitenteInfo?.telefone || "4835336300").replace(/\D/g, ""),

    // Documentos Referenciados (Obrigatório SEFAZ - 44 dígitos)
    notas_referenciadas: notasRefPayload.length > 0 ? notasRefPayload : [{ chave_nfe: finalRefKey }],

    ...transportPayload,

    itens: itemsPayload,
    informacoes_adicionais_contribuinte: infAdic,
  };
}

/**
 * Constrói o payload para Emissão de Nota Fiscal de Cobrança de Industrialização (CFOP 5.124)
 * a partir do Espelho de Produção enviado pela fábrica parceira.
 */
export function buildFocusNfeCobrancaPayload({
  tenant,
  partner,
  itens,
  numeroControleEspelho,
  numeroNota,
  serieNota,
  observacoesFiscais,
  chaveReferenciada,
}: {
  tenant: any;
  partner: any;
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
  numeroNota?: number;
  serieNota?: string;
  observacoesFiscais?: string;
  chaveReferenciada?: string;
}) {
  const cleanPartnerCnpj = (partner.cnpj || "").replace(/\D/g, "");
  const ieDest = partner.inscricaoEstadual?.trim().toUpperCase() ||
    (cleanPartnerCnpj === "72305295000115" ? "252740106" : undefined);
  const rawChaveRef = (chaveReferenciada || "").replace(/\D/g, "");
  const cleanChaveRef = rawChaveRef.length === 45 && rawChaveRef.startsWith("1")
    ? rawChaveRef.substring(1)
    : (rawChaveRef.length > 44 ? (extractNfeKeyFromText(chaveReferenciada || "") || rawChaveRef) : rawChaveRef);

  let itemNum = 1;
  const itemsPayload: any[] = [];

  for (const item of itens) {
    const rawDesc = `${item.referencia} ${item.faseServico || "COSTURA"}`.trim();
    const desc = rawDesc.length > 120 ? rawDesc.substring(0, 120).trim() : rawDesc;

    itemsPayload.push({
      numero_item: itemNum++,
      codigo_produto: (item.op || `SERV-${itemNum}`).substring(0, 20),
      descricao: desc,
      codigo_ncm: (item.ncm || "61044200").replace(/\D/g, ""),
      cfop: partner.uf && partner.uf !== tenant.uf ? "6124" : "5124",
      unidade_comercial: "UNID",
      quantidade_comercial: item.quantidade,
      valor_unitario_comercial: item.valorUnitario,
      valor_bruto: item.valorTotal,
      unidade_tributavel: "UNID",
      quantidade_tributavel: item.quantidade,
      valor_unitario_tributavel: item.valorUnitario,
      origem: 0,
      icms_origem: 0,
      icms_situacao_tributaria: "102", // Simples Nacional sem permissão de crédito
      pis_situacao_tributaria: "08",
      cofins_situacao_tributaria: "08",
    });
  }

  const infAdic = `Doc Emit por ME ou EPP Simples Nac - LC 123/2006 (Anexo II - Industria). Nao gera direito a credito de ISS e IPI. NOTA DE COBRANCA DE INDUSTRIALIZACAO (CFOP 5124). ${
    numeroControleEspelho ? `Ref. Espelho/Controle Nº ${numeroControleEspelho}.` : ""
  } ${cleanChaveRef.length === 44 ? `Ref. NF-e Remessa de Insumos: ${cleanChaveRef}.` : ""} ${observacoesFiscais || ""}`.trim();

  return {
    natureza_operacao: "INDUSTRIALIZAÇÃO COBRANÇA",
    tipo_documento: 1, // Saída
    finalidade_emissao: 1, // Normal
    modalidade_frete: "9", // Sem frete
    numero: numeroNota || tenant.proximoNumero || undefined,
    serie: serieNota || (tenant.serieNfe ? String(tenant.serieNfe) : "1"),
    cnpj_emitente: tenant.cnpj.replace(/\D/g, ""),
    data_emissao: new Date().toISOString(),

    // Referência fiscal da NF-e de entrada (remessa de corte) - Tag oficial Focus NFe / SEFAZ <NFref>
    ...(cleanChaveRef.length === 44
      ? {
          notas_referenciadas: [
            {
              chave_nfe: cleanChaveRef,
            },
          ],
        }
      : {}),

    // Destinatário: Fábrica parceira (ex: Ritmi)
    nome_destinatario: partner.razaoSocial,
    cnpj_destinatario: cleanPartnerCnpj,
    inscricao_estadual_destinatario: ieDest || "ISENTO",
    indicador_inscricao_estadual_destinatario: ieDest ? 1 : 9,
    logradouro_destinatario: partner.logradouro || "ANTONIO LIVINO F",
    numero_destinatario: partner.numero || "200",
    bairro_destinatario: partner.bairro || "NOVA GUARITA",
    municipio_destinatario: partner.municipio || "SOMBRIO",
    uf_destinatario: partner.uf || "SC",
    cep_destinatario: (partner.cep || "88960000").replace(/\D/g, ""),
    telefone_destinatario: (partner.telefone || "4835336300").replace(/\D/g, ""),

    itens: itemsPayload,
    informacoes_adicionais_contribuinte: infAdic,
  };
}
