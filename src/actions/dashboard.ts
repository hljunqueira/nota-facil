"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { TipoNota, StatusNota } from "@prisma/client";
import { isVestuarioItem } from "@/lib/services/inversion";

export type PeriodoFiltro =
  | "hoje"
  | "semana_atual"
  | "mes_atual"
  | "mes_anterior"
  | "ultimos_30"
  | "ultimos_90"
  | "ano_atual"
  | "custom";

export interface DashboardFilterParams {
  periodo?: PeriodoFiltro;
  dataInicio?: string;
  dataFim?: string;
}

export interface PagamentoPrevisao {
  id: string;
  invoiceNumero: number;
  partnerNome: string;
  valor: number;
  dataVencimento: Date;
  diasRestantes: number;
  status: "NO_PRAZO" | "HOJE" | "ATRASADO";
  espelhoNumero?: string | null;
}

export interface LoteAguardandoEspelho {
  id: string;
  invoiceNumero: number;
  partnerNome: string;
  dataRetorno: Date;
  horasPassadas: number;
  diasPassados: number;
}

export interface EvolucaoItem {
  label: string;
  data: string;
  valor: number;
  quantidade: number;
}

export interface DashboardMetrics {
  // Filtro atual aplicado
  filtroAplicado: {
    periodo: PeriodoFiltro;
    label: string;
    dataInicio: string;
    dataFim: string;
  };

  // Faturamento Real de Costura (CFOP 5.124 / Cobrança)
  faturamentoReal: number;
  quantidadeNotasCobranca: number;
  
  // Movimentação Física de Retorno (CFOP 5.902 / Devolução de Insumos)
  totalRetornosFisicos: number;
  valorInsumosDevolvidos: number;
  
  // Remessas Recebidas no Período
  totalRemessasRecebidas: number;
  
  // Previsão de Recebimento ("Quando vai receber")
  previsaoRecebimento: {
    totalAReceber: number;
    aReceberProximos7Dias: number;
    aReceberNoMes: number;
    proximosPagamentos: PagamentoPrevisao[];
    lotesAguardandoEspelho: LoteAguardandoEspelho[];
  };

  // Previsão de Receita na Linha de Produção (FlyERP)
  receitaPrevistaLinha: {
    valorEstimado: number;
    quantidadeRemessas: number;
    quantidadePecas: number;
    precoMedioPeca: number;
  };

  // Gráfico de Evolução Financeira
  evolucaoFaturamento: EvolucaoItem[];

  // Fábricas / Ranking
  parceiroTop: {
    nome: string;
    total: number;
    quantidadeNotas: number;
  } | null;
  faturamentoPorParceiro: Array<{
    partnerId: string;
    nome: string;
    total: number;
    percentual: number;
    quantidadeNotas: number;
  }>;

  // Tabela de Últimas Movimentações
  ultimasNotas: Array<{
    id: string;
    numero: number;
    serie: number;
    chaveAcesso: string;
    tipo: TipoNota;
    status: StatusNota;
    modalidadeEmissao: string | null;
    espelhoNumero: string | null;
    valorTotal: number;
    dataEmissao: Date;
    partnerNome: string | null;
    xmlUrl: string | null;
    pdfUrl: string | null;
  }>;

  // Informações da Empresa / Certificado
  tenantInfo: {
    razaoSocial: string;
    cnpj: string;
    ambiente: string;
    certificadoValidoAte: Date | null;
    statusConta: string;
  };
}

function calcularDatasFiltro(params?: DashboardFilterParams): {
  startDate: Date;
  endDate: Date;
  periodo: PeriodoFiltro;
  label: string;
} {
  const now = new Date();
  const periodo = params?.periodo || "mes_atual";

  if (periodo === "custom" && params?.dataInicio && params?.dataFim) {
    const s = new Date(params.dataInicio);
    s.setHours(0, 0, 0, 0);
    const e = new Date(params.dataFim);
    e.setHours(23, 59, 59, 999);
    return {
      startDate: s,
      endDate: e,
      periodo: "custom",
      label: `${s.toLocaleDateString("pt-BR")} até ${e.toLocaleDateString("pt-BR")}`,
    };
  }

  if (periodo === "hoje") {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    const e = new Date(now);
    e.setHours(23, 59, 59, 999);
    return { startDate: s, endDate: e, periodo: "hoje", label: "Hoje" };
  }

  if (periodo === "semana_atual") {
    const s = new Date(now);
    const day = s.getDay(); // 0 = Domingo
    const diff = s.getDate() - day + (day === 0 ? -6 : 1); // Segunda-feira
    s.setDate(diff);
    s.setHours(0, 0, 0, 0);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return { startDate: s, endDate: e, periodo: "semana_atual", label: "Esta Semana" };
  }

  if (periodo === "mes_anterior") {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return {
      startDate: s,
      endDate: e,
      periodo: "mes_anterior",
      label: s.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    };
  }

  if (periodo === "ultimos_30") {
    const s = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    s.setHours(0, 0, 0, 0);
    const e = new Date(now);
    e.setHours(23, 59, 59, 999);
    return { startDate: s, endDate: e, periodo: "ultimos_30", label: "Últimos 30 Dias" };
  }

  if (periodo === "ultimos_90") {
    const s = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    s.setHours(0, 0, 0, 0);
    const e = new Date(now);
    e.setHours(23, 59, 59, 999);
    return { startDate: s, endDate: e, periodo: "ultimos_90", label: "Últimos 90 Dias" };
  }

  if (periodo === "ano_atual") {
    const s = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const e = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { startDate: s, endDate: e, periodo: "ano_atual", label: `Ano de ${now.getFullYear()}` };
  }

  // Padrão: mes_atual
  const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    startDate: s,
    endDate: e,
    periodo: "mes_atual",
    label: s.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
  };
}

export async function getDashboardDataAction(
  filterParams?: DashboardFilterParams
): Promise<DashboardMetrics> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    throw new Error("Não autenticado ou sessão de oficina inválida.");
  }

  const tenantId = session.user.tenantId;
  const tenantPrisma = createTenantPrisma(tenantId);
  const now = new Date();

  const { startDate, endDate, periodo, label: filtroLabel } = calcularDatasFiltro(filterParams);

  // 1. Busca Tenant
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
    select: {
      razaoSocial: true,
      cnpj: true,
      ambiente: true,
      certificadoValidoAte: true,
      statusConta: true,
    },
  });

  // 2. Busca todas as notas de saída do período filtrado
  const [notasSaidaPeriodo, totalRemessasPeriodo, ultimasNotasRaw, todasCobrancasEmAberto] =
    await Promise.all([
      tenantPrisma.invoice.findMany({
        where: {
          tipo: TipoNota.SAIDA,
          status: StatusNota.AUTORIZADA,
          dataEmissao: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          partner: {
            select: { id: true, razaoSocial: true },
          },
        },
        orderBy: { dataEmissao: "asc" },
      }),
      tenantPrisma.invoice.count({
        where: {
          tipo: TipoNota.ENTRADA,
          dataEmissao: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      tenantPrisma.invoice.findMany({
        take: 8,
        orderBy: { dataEmissao: "desc" },
        include: {
          partner: {
            select: { razaoSocial: true },
          },
        },
      }),
      // Busca notas de cobrança autorizadas (para cálculo de contas a receber)
      tenantPrisma.invoice.findMany({
        where: {
          tipo: TipoNota.SAIDA,
          status: StatusNota.AUTORIZADA,
          AND: [
            { NOT: { finalidade: { contains: "RETORNO", mode: "insensitive" } } },
            { NOT: { modalidadeEmissao: "RETORNO_MERCADORIA" } },
            {
              OR: [
                { modalidadeEmissao: "COBRANCA_INDUSTRIALIZACAO" },
                { modalidadeEmissao: "CONJUNTA" },
                { finalidade: { contains: "COBRANCA", mode: "insensitive" } },
              ],
            },
          ],
        },
        include: {
          partner: {
            select: { razaoSocial: true },
          },
        },
        orderBy: { dataEmissao: "desc" },
        take: 50,
      }),
    ]);

  // 3. Separa Faturamento Real de Costura (5.124) vs. Retorno de Insumos (5.902)
  let faturamentoReal = 0;
  let quantidadeNotasCobranca = 0;
  let totalRetornosFisicos = 0;
  let valorInsumosDevolvidos = 0;

  const parceirosMap = new Map<
    string,
    { partnerId: string; nome: string; total: number; quantidadeNotas: number }
  >();

  // Agrupamento temporal para gráfico de evolução
  const evolucaoMap = new Map<string, EvolucaoItem>();

  for (const n of notasSaidaPeriodo) {
    const valor = Number(n.valorTotal || 0);
    const modalidade = n.modalidadeEmissao || "";
    const finalidade = (n.finalidade || "").toUpperCase();

    // Se contém RETORNO no texto ou flag, é retorno de matéria-prima (R$ 0 financeiro)
    const isRetornoPuro =
      modalidade === "RETORNO_MERCADORIA" ||
      finalidade.includes("RETORNO") ||
      finalidade.includes("REMESSA");

    // Só é cobrança real de costura se for explicitamente de cobrança ou conjunta
    const isCobranca =
      !isRetornoPuro &&
      (modalidade === "COBRANCA_INDUSTRIALIZACAO" ||
        modalidade === "CONJUNTA" ||
        finalidade.includes("COBRANCA"));

    if (isCobranca) {
      faturamentoReal += valor;
      quantidadeNotasCobranca += 1;

      // Ranking por parceiro baseado em faturamento real
      const pId = n.partnerId || "sem_parceiro";
      const pNome = n.partner?.razaoSocial || "Fábrica Parceira";
      const existing = parceirosMap.get(pId) || {
        partnerId: pId,
        nome: pNome,
        total: 0,
        quantidadeNotas: 0,
      };
      existing.total += valor;
      existing.quantidadeNotas += 1;
      parceirosMap.set(pId, existing);

      // Gráfico de evolução temporal
      const dateKey = n.dataEmissao.toISOString().slice(0, 10);
      const label = n.dataEmissao.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      const existingEvol = evolucaoMap.get(dateKey) || {
        label,
        data: dateKey,
        valor: 0,
        quantidade: 0,
      };
      existingEvol.valor += valor;
      existingEvol.quantidade += 1;
      evolucaoMap.set(dateKey, existingEvol);
    } else {
      totalRetornosFisicos += 1;
      valorInsumosDevolvidos += valor;
    }
  }

  // Se o período filtrado não tiver faturamento de costura recente, compõe ranking pelas últimas cobranças
  if (parceirosMap.size === 0 && todasCobrancasEmAberto.length > 0) {
    for (const n of todasCobrancasEmAberto.slice(0, 15)) {
      const pId = n.partnerId || "sem_parceiro";
      const pNome = n.partner?.razaoSocial || "Fábrica Parceira";
      const existing = parceirosMap.get(pId) || {
        partnerId: pId,
        nome: pNome,
        total: 0,
        quantidadeNotas: 0,
      };
      existing.total += Number(n.valorTotal || 0);
      existing.quantidadeNotas += 1;
      parceirosMap.set(pId, existing);
    }
  }

  const parceirosArray = Array.from(parceirosMap.values()).sort((a, b) => b.total - a.total);
  const faturamentoGraficoTotal = parceirosArray.reduce((acc, p) => acc + p.total, 0);

  const faturamentoPorParceiro = parceirosArray.map((p) => ({
    ...p,
    percentual:
      faturamentoGraficoTotal > 0
        ? Math.round((p.total / faturamentoGraficoTotal) * 100)
        : 0,
  }));

  const parceiroTop = faturamentoPorParceiro.length > 0 ? faturamentoPorParceiro[0] : null;

  // 4. Previsão de Recebimentos ("Quando vai receber")
  let totalAReceber = 0;
  let aReceberProximos7Dias = 0;
  let aReceberNoMes = 0;
  const proximosPagamentos: PagamentoPrevisao[] = [];

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (const cobranca of todasCobrancasEmAberto) {
    const rawData = (cobranca.rawJson as any) || {};
    const valor = Number(cobranca.valorTotal || 0);

    // Tenta obter data de vencimento da fatura/espelho, ou estima 15 dias após a emissão
    let dataVencimento: Date;
    if (rawData.dataVencimento) {
      dataVencimento = new Date(rawData.dataVencimento);
    } else if (rawData.previsaoPagamento) {
      const parts = String(rawData.previsaoPagamento).split("/");
      if (parts.length === 3) {
        dataVencimento = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      } else {
        dataVencimento = new Date(cobranca.dataEmissao.getTime() + 15 * 24 * 60 * 60 * 1000);
      }
    } else {
      // Prazo padrão comercial de facção: 15 dias após emissão da cobrança
      dataVencimento = new Date(cobranca.dataEmissao.getTime() + 15 * 24 * 60 * 60 * 1000);
    }

    const diffDays = Math.ceil(
      (dataVencimento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let statusPag: "NO_PRAZO" | "HOJE" | "ATRASADO" = "NO_PRAZO";
    if (diffDays < 0) statusPag = "ATRASADO";
    else if (diffDays === 0) statusPag = "HOJE";

    totalAReceber += valor;
    if (dataVencimento <= in7Days && dataVencimento >= now) {
      aReceberProximos7Dias += valor;
    }
    if (dataVencimento <= endOfMonth && dataVencimento >= now) {
      aReceberNoMes += valor;
    }

    proximosPagamentos.push({
      id: cobranca.id,
      invoiceNumero: cobranca.numero,
      partnerNome: cobranca.partner?.razaoSocial || "Fábrica Parceira",
      valor,
      dataVencimento,
      diasRestantes: diffDays,
      status: statusPag,
      espelhoNumero: cobranca.espelhoNumero,
    });
  }

  // Ordena os próximos pagamentos por data de vencimento mais próxima
  proximosPagamentos.sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());

  // 5. Alerta de Lotes Retornados há mais de 48h sem cobrança emitida
  const quarentaEOitoHorasAtras = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const retornosSemCobranca = await tenantPrisma.invoice.findMany({
    where: {
      tipo: TipoNota.SAIDA,
      status: StatusNota.AUTORIZADA,
      modalidadeEmissao: "RETORNO_MERCADORIA",
      dataEmissao: {
        lte: quarentaEOitoHorasAtras,
        // Últimos 30 dias para não pegar histórico infinito
        gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      partner: {
        select: { razaoSocial: true },
      },
    },
    orderBy: { dataEmissao: "desc" },
    take: 5,
  });

  const lotesAguardandoEspelho: LoteAguardandoEspelho[] = retornosSemCobranca.map((r) => {
    const horas = Math.round((now.getTime() - r.dataEmissao.getTime()) / (1000 * 60 * 60));
    return {
      id: r.id,
      invoiceNumero: r.numero,
      partnerNome: r.partner?.razaoSocial || "Fábrica Parceira",
      dataRetorno: r.dataEmissao,
      horasPassadas: horas,
      diasPassados: Math.floor(horas / 24),
    };
  });

  // 6. Previsão de Receita na Linha de Produção (FlyERP)
  // Remessas (5901) recebidas nos últimos 45 dias que ainda não tiveram cobrança (5124) emitida e autorizada
  const remessasEntrada = await tenantPrisma.invoice.findMany({
    where: {
      tipo: TipoNota.ENTRADA,
      dataEmissao: {
        gte: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      numero: true,
      chaveAcesso: true,
      rawJson: true,
      valorTotal: true,
      partnerId: true,
    },
  });

  const cobrancasEmitidas = await tenantPrisma.invoice.findMany({
    where: {
      tipo: TipoNota.SAIDA,
      modalidadeEmissao: "COBRANCA_INDUSTRIALIZACAO",
      status: StatusNota.AUTORIZADA,
    },
    select: {
      chaveNfeReferenciada: true,
      rawJson: true,
    },
  });

  const chavesFaturadas = new Set<string>();
  for (const c of cobrancasEmitidas) {
    if (c.chaveNfeReferenciada) chavesFaturadas.add(c.chaveNfeReferenciada);
    const raw: any = c.rawJson || {};
    if (raw.remessaOrigemId) chavesFaturadas.add(raw.remessaOrigemId);
  }

  let quantidadeRemessasEmLinha = 0;
  let quantidadePecasEmLinha = 0;
  let valorEstimadoLinha = 0;

  // Preço por peça da oficina:
  // 1. Tenta obter do histórico de cobranças 5124 autorizadas (média ponderada real)
  // 2. Se não houver cobranças anteriores, busca do cadastro de preços (PartnerPriceHistory)
  // 3. Fallback: R$ 40,00 (padrão de mercado para confecção/costura de vestidos conforme espelho RITMI)
  let precoMedioPeca = 40.0;

  const historicoCobrancasAutorizadas = await tenantPrisma.invoice.findMany({
    where: {
      tipo: TipoNota.SAIDA,
      modalidadeEmissao: "COBRANCA_INDUSTRIALIZACAO",
      status: StatusNota.AUTORIZADA,
    },
    take: 20,
    orderBy: { dataEmissao: "desc" },
    select: {
      rawJson: true,
      valorTotal: true,
    },
  });

  if (historicoCobrancasAutorizadas.length > 0) {
    let somaValores = 0;
    let somaPecas = 0;
    for (const cob of historicoCobrancasAutorizadas) {
      const raw: any = cob.rawJson || {};
      const itens = raw?.focusPayload?.itens || raw?.itens || [];
      for (const it of itens) {
        const q = Number(it.quantidade_comercial || it.quantidade || 0);
        const v = Number(it.valor_total || it.valorTotal || 0);
        if (q > 0 && v > 0) {
          somaPecas += q;
          somaValores += v;
        }
      }
      if (somaPecas === 0 && Number(cob.valorTotal) > 0) {
        somaValores += Number(cob.valorTotal);
      }
    }
    if (somaPecas > 0 && somaValores > 0) {
      precoMedioPeca = Math.round((somaValores / somaPecas) * 100) / 100;
    }
  } else {
    const precosCadastrados = await tenantPrisma.partnerPriceHistory.findMany({
      take: 10,
      select: { valorUnitario: true },
    });
    if (precosCadastrados.length > 0) {
      const soma = precosCadastrados.reduce((acc, p) => acc + Number(p.valorUnitario), 0);
      precoMedioPeca = Math.round((soma / precosCadastrados.length) * 100) / 100;
    }
  }

  for (const rem of remessasEntrada) {
    const chave = rem.chaveAcesso || rem.id;
    if (!chavesFaturadas.has(chave) && !chavesFaturadas.has(rem.id)) {
      quantidadeRemessasEmLinha++;
      const raw: any = rem.rawJson || {};
      const itens = raw?.itens || [];
      let pecasVestuario = 0;
      let totalQtdGeral = 0;

      for (const it of itens) {
        const q = Number(it.quantidade || it.quantidade_comercial || 0);
        totalQtdGeral += q;
        if (isVestuarioItem(it)) {
          pecasVestuario += q;
        }
      }

      // Prioriza a quantidade de peças principais de vestuário; se nota for sem detalhamento, faz fallback
      const pecasEfetivas = pecasVestuario > 0 ? pecasVestuario : (totalQtdGeral > 0 ? totalQtdGeral : 100);
      quantidadePecasEmLinha += pecasEfetivas;
      valorEstimadoLinha += pecasEfetivas * precoMedioPeca;
    }
  }

  // 7. Evolução de Faturamento formatada
  const evolucaoFaturamento = Array.from(evolucaoMap.values());

  return {
    filtroAplicado: {
      periodo,
      label: filtroLabel,
      dataInicio: startDate.toISOString(),
      dataFim: endDate.toISOString(),
    },
    faturamentoReal,
    quantidadeNotasCobranca,
    totalRetornosFisicos,
    valorInsumosDevolvidos,
    totalRemessasRecebidas: totalRemessasPeriodo,
    previsaoRecebimento: {
      totalAReceber,
      aReceberProximos7Dias,
      aReceberNoMes,
      proximosPagamentos: proximosPagamentos.slice(0, 6),
      lotesAguardandoEspelho,
    },
    receitaPrevistaLinha: {
      valorEstimado: valorEstimadoLinha,
      quantidadeRemessas: quantidadeRemessasEmLinha,
      quantidadePecas: quantidadePecasEmLinha,
      precoMedioPeca,
    },
    evolucaoFaturamento,
    parceiroTop,
    faturamentoPorParceiro,
    ultimasNotas: ultimasNotasRaw.map((n) => ({
      id: n.id,
      numero: n.numero,
      serie: n.serie,
      chaveAcesso: n.chaveAcesso || "",
      tipo: n.tipo,
      status: n.status,
      modalidadeEmissao: n.modalidadeEmissao,
      espelhoNumero: n.espelhoNumero,
      valorTotal: Number(n.valorTotal),
      dataEmissao: n.dataEmissao,
      partnerNome: n.partner?.razaoSocial || null,
      xmlUrl: n.xmlUrl,
      pdfUrl: n.pdfUrl,
    })),
    tenantInfo: {
      razaoSocial: tenant?.razaoSocial || "Oficina de Costura",
      cnpj: tenant?.cnpj || "",
      ambiente: tenant?.ambiente || "HOMOLOGACAO",
      certificadoValidoAte: tenant?.certificadoValidoAte || null,
      statusConta: tenant?.statusConta || "ATIVO",
    },
  };
}
