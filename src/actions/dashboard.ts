"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { TipoNota, StatusNota } from "@prisma/client";

export interface DashboardMetrics {
  faturamentoMes: number;
  totalRetornosMes: number;
  totalRemessasMes: number;
  pendentesInversaoCount: number;
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
  ultimasNotas: Array<{
    id: string;
    numero: number;
    serie: number;
    chaveAcesso: string;
    tipo: TipoNota;
    status: StatusNota;
    valorTotal: number;
    dataEmissao: Date;
    partnerNome: string | null;
    xmlUrl: string | null;
    pdfUrl: string | null;
  }>;
  tenantInfo: {
    razaoSocial: string;
    cnpj: string;
    ambiente: string;
    certificadoValidoAte: Date | null;
    statusConta: string;
  };
}

export async function getDashboardDataAction(): Promise<DashboardMetrics> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    throw new Error("Não autenticado ou sessão de oficina inválida.");
  }

  const tenantId = session.user.tenantId;
  const tenantPrisma = createTenantPrisma(tenantId);

  // Período do mês atual
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Busca dados do tenant
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

  // Busca notas do mês (e últimas notas)
  const [
    notasSaidaMes,
    remessasMesCount,
    pendentesCount,
    ultimasNotasRaw,
  ] = await Promise.all([
    tenantPrisma.invoice.findMany({
      where: {
        tipo: TipoNota.SAIDA,
        status: StatusNota.AUTORIZADA,
        dataEmissao: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        partner: {
          select: { id: true, razaoSocial: true },
        },
      },
    }),
    tenantPrisma.invoice.count({
      where: {
        tipo: TipoNota.ENTRADA,
        dataEmissao: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    }),
    tenantPrisma.invoice.count({
      where: {
        OR: [
          { status: StatusNota.PENDENTE },
          { tipo: TipoNota.ENTRADA, status: StatusNota.AUTORIZADA },
        ],
      },
    }),
    tenantPrisma.invoice.findMany({
      take: 6,
      orderBy: { dataEmissao: "desc" },
      include: {
        partner: {
          select: { razaoSocial: true },
        },
      },
    }),
  ]);

  // Se não houver notas no mês corrente, busca últimas notas de saída para compor o ranking
  let notasSaidaParaGrafico = notasSaidaMes;
  if (notasSaidaParaGrafico.length === 0) {
    notasSaidaParaGrafico = await tenantPrisma.invoice.findMany({
      where: {
        tipo: TipoNota.SAIDA,
        status: StatusNota.AUTORIZADA,
      },
      take: 50,
      include: {
        partner: {
          select: { id: true, razaoSocial: true },
        },
      },
    });
  }

  // Faturamento total do mês
  const faturamentoMes = notasSaidaMes.reduce((acc, n) => acc + Number(n.valorTotal), 0);
  const totalRetornosMes = notasSaidaMes.length;

  // Agrupamento por parceiro
  const parceirosMap = new Map<string, { partnerId: string; nome: string; total: number; quantidadeNotas: number }>();

  for (const n of notasSaidaParaGrafico) {
    const pId = n.partnerId || "sem_parceiro";
    const nome = n.partner?.razaoSocial || "Outros / Venda Direta";
    const valor = Number(n.valorTotal);

    const existing = parceirosMap.get(pId) || {
      partnerId: pId,
      nome,
      total: 0,
      quantidadeNotas: 0,
    };

    existing.total += valor;
    existing.quantidadeNotas += 1;
    parceirosMap.set(pId, existing);
  }

  const parceirosArray = Array.from(parceirosMap.values()).sort((a, b) => b.total - a.total);
  const faturamentoGraficoTotal = parceirosArray.reduce((acc, p) => acc + p.total, 0);

  const faturamentoPorParceiro = parceirosArray.map((p) => ({
    ...p,
    percentual: faturamentoGraficoTotal > 0 ? Math.round((p.total / faturamentoGraficoTotal) * 100) : 0,
  }));

  const parceiroTop = faturamentoPorParceiro.length > 0 ? faturamentoPorParceiro[0] : null;

  return {
    faturamentoMes,
    totalRetornosMes,
    totalRemessasMes: remessasMesCount,
    pendentesInversaoCount: pendentesCount,
    parceiroTop,
    faturamentoPorParceiro,
    ultimasNotas: ultimasNotasRaw.map((n) => ({
      id: n.id,
      numero: n.numero,
      serie: n.serie,
      chaveAcesso: n.chaveAcesso || "",
      tipo: n.tipo,
      status: n.status,
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
