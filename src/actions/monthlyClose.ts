"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { monthlyCloseQueue } from "@/lib/queue";
import { createTenantPrisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { TipoDestinatario } from "@prisma/client";

export interface EnqueueMonthlyCloseInput {
  mes: number;
  ano: number;
  contadorEmail?: string;
}

export async function enqueueMonthlyCloseAction(input: EnqueueMonthlyCloseInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    throw new Error("Não autorizado. Faça login novamente.");
  }

  const tenantId = session.user.tenantId;

  const mes = Number(input.mes);
  const ano = Number(input.ano);

  if (isNaN(mes) || mes < 1 || mes > 12) {
    throw new Error("Mês inválido. Escolha um valor entre 1 e 12.");
  }

  if (isNaN(ano) || ano < 2020 || ano > 2035) {
    throw new Error("Ano inválido.");
  }

  // Busca e-mail do contador cadastrado se não foi passado no modal
  let targetEmail = input.contadorEmail?.trim();
  if (!targetEmail) {
    const contador = await prismaAdmin.notificationRecipient.findFirst({
      where: {
        tenantId,
        tipo: TipoDestinatario.CONTADOR,
        ativo: true,
      },
    });
    targetEmail = contador?.email || undefined;
  }

  const job = await monthlyCloseQueue.add(
    "execute-monthly-close",
    {
      tenantId,
      mes,
      ano,
      contadorEmail: targetEmail || undefined,
      actorId: session.user.id || session.user.name || "TENANT_USER",
    },
    {
      jobId: `close_${tenantId}_${ano}_${mes}_${Date.now()}`,
    }
  );

  return {
    success: true,
    jobId: job.id,
    mes,
    ano,
    contadorEmail: targetEmail || null,
    message: `Fechamento do mês ${String(mes).padStart(2, "0")}/${ano} iniciado em segundo plano!`,
  };
}

export async function getMonthlyCloseConfigAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    throw new Error("Não autorizado.");
  }

  const tenantId = session.user.tenantId;

  const contador = await prismaAdmin.notificationRecipient.findFirst({
    where: {
      tenantId,
      tipo: TipoDestinatario.CONTADOR,
      ativo: true,
    },
  });

  return {
    contadorEmail: contador?.email || null,
    contadorNome: contador?.nome || null,
  };
}

export async function getMonthlyCloseHistoryAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    throw new Error("Não autorizado.");
  }

  const tenantId = session.user.tenantId;

  const logs = await prismaAdmin.auditLog.findMany({
    where: {
      tenantId,
      acao: { in: ["FECHAMENTO_MENSAL_CONCLUIDO", "FECHAMENTO_MENSAL_INICIADO"] },
    },
    orderBy: { timestamp: "desc" },
    take: 10,
  });

  return logs;
}

export interface MonthlyCloseNoteItem {
  id: string;
  numero: number;
  serie: number;
  chaveAcesso: string | null;
  tipo: string;
  cfopPrincipal: string;
  modalidadeEmissao: string | null;
  parceiroNome: string;
  parceiroCnpj: string;
  valorTotal: number;
  baseCalculoSimples: number;
  dataEmissao: string;
  hasPdf: boolean;
  hasXml: boolean;
  pdfUrl: string | null;
  xmlUrl: string | null;
}

export interface MonthlyClosePreviewData {
  mes: number;
  ano: number;
  totalNotas: number;
  baseTributavelSimples: number;
  totalNaoTributavel: number;
  totalRemessas: number;
  totalGeral: number;
  notas: MonthlyCloseNoteItem[];
  mesesComNotas: Array<{ mes: number; ano: number; count: number }>;
}

export async function getMonthlyClosePreviewAction(input: {
  mes: number;
  ano: number;
}): Promise<MonthlyClosePreviewData> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    throw new Error("Não autorizado.");
  }

  const tenantId = session.user.tenantId;
  const mes = Number(input.mes);
  const ano = Number(input.ano);

  const startDate = new Date(ano, mes - 1, 1, 0, 0, 0);
  const endDate = new Date(ano, mes, 0, 23, 59, 59);

  // 1. Busca notas do mês selecionado
  const invoices = await prismaAdmin.invoice.findMany({
    where: {
      tenantId,
      status: "AUTORIZADA",
      dataEmissao: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      partner: {
        select: { razaoSocial: true, nomeFantasia: true, cnpj: true },
      },
    },
    orderBy: { numero: "desc" },
  });

  let totalGeral = 0;
  let baseTributavelSimples = 0;
  let totalNaoTributavel = 0;
  let totalRemessas = 0;

  const notas: MonthlyCloseNoteItem[] = invoices.map((inv) => {
    const valor = Number(inv.valorTotal) || 0;
    totalGeral += valor;

    const raw: any = inv.rawJson || {};
    const itens = raw?.payloadEnviado?.itens || raw?.itens || [];
    const firstCfop = itens[0]?.cfop ? String(itens[0].cfop) : null;

    let cfopPrincipal = firstCfop || "5902";
    let baseCalculoSimples = 0;

    if (inv.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO") {
      cfopPrincipal = firstCfop || "5124";
      baseCalculoSimples = valor;
      baseTributavelSimples += valor;
    } else if (inv.modalidadeEmissao === "RETORNO_MERCADORIA") {
      cfopPrincipal = firstCfop || "5902";
      baseCalculoSimples = 0;
      totalNaoTributavel += valor;
    } else if (inv.modalidadeEmissao === "CONJUNTA") {
      cfopPrincipal = firstCfop || "5902/5124";
      const itemServico = itens.find((it: any) => it.cfop === "5124");
      const valorServico = itemServico ? Number(itemServico.valor_total || 0) : 0;
      baseCalculoSimples = valorServico;
      baseTributavelSimples += valorServico;
      totalNaoTributavel += valor - valorServico;
    } else if (inv.tipo === "ENTRADA") {
      cfopPrincipal = firstCfop || "5901";
      baseCalculoSimples = 0;
      totalRemessas += valor;
    } else {
      baseCalculoSimples = 0;
      totalNaoTributavel += valor;
    }

    return {
      id: inv.id,
      numero: inv.numero,
      serie: inv.serie,
      chaveAcesso: inv.chaveAcesso,
      tipo: inv.tipo,
      cfopPrincipal,
      modalidadeEmissao: inv.modalidadeEmissao,
      parceiroNome: inv.partner?.nomeFantasia || inv.partner?.razaoSocial || "Fábrica Parceira",
      parceiroCnpj: inv.partner?.cnpj || "",
      valorTotal: valor,
      baseCalculoSimples,
      dataEmissao: inv.dataEmissao.toISOString(),
      hasPdf: !!inv.pdfUrl,
      hasXml: !!inv.xmlUrl || !!inv.rawJson,
      pdfUrl: inv.pdfUrl,
      xmlUrl: inv.xmlUrl,
    };
  });

  // 2. Busca meses com notas autorizadas nos últimos 12 meses para badges de competência
  const oneYearAgo = new Date();
  oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);
  const recentInvoices = await prismaAdmin.invoice.findMany({
    where: {
      tenantId,
      status: "AUTORIZADA",
      dataEmissao: { gte: oneYearAgo },
    },
    select: { dataEmissao: true },
  });

  const monthCountMap = new Map<string, number>();
  for (const inv of recentInvoices) {
    const d = new Date(inv.dataEmissao);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthCountMap.set(key, (monthCountMap.get(key) || 0) + 1);
  }

  const mesesComNotas: Array<{ mes: number; ano: number; count: number }> = [];
  monthCountMap.forEach((count, key) => {
    const [a, m] = key.split("-").map(Number);
    mesesComNotas.push({ ano: a, mes: m, count });
  });

  return {
    mes,
    ano,
    totalNotas: notas.length,
    baseTributavelSimples,
    totalNaoTributavel,
    totalRemessas,
    totalGeral,
    notas,
    mesesComNotas,
  };
}

