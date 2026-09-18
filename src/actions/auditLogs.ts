"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaAdmin } from "@/lib/prismaAdmin";

async function requireTenantSession() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.tenantId) {
    throw new Error("Sessão expirada ou acesso restrito a oficinas.");
  }
  return { session, tenantId: session.user.tenantId };
}

export type LogCategory =
  | "todas"
  | "emissao"
  | "cancelamento"
  | "sefaz"
  | "mde"
  | "notificacao"
  | "config";

const categoryAcoesMap: Record<LogCategory, string[]> = {
  todas: [],
  emissao: ["EMISSAO_NFE", "EMISSAO_NFE_REPROVADA"],
  cancelamento: ["SOLICITACAO_CANCELAMENTO_NFE", "CANCELAMENTO_NFE_FALHA"],
  sefaz: ["WEBHOOK_AUTORIZADA", "WEBHOOK_REJEITADA", "WEBHOOK_CANCELADA"],
  mde: ["SYNC_MDE_MANUAL", "SYNC_MDE_AUTO", "MDE_MANIFESTACAO"],
  notificacao: ["NOTIFICACAO_WHATSAPP", "NOTIFICACAO_EMAIL", "FALLBACK_NOTIFICACAO"],
  config: [
    "ATUALIZACAO_CONFIG_FISCAL",
    "ATUALIZACAO_TOKENS_FISCAIS",
    "UPLOAD_CERTIFICADO",
    "CRIACAO_PARCEIRO",
    "EDICAO_PARCEIRO",
    "REMOCAO_PARCEIRO",
  ],
};

export async function getTenantLogsAction(params?: {
  page?: number;
  limit?: number;
  categoria?: LogCategory;
  search?: string;
}) {
  const { tenantId } = await requireTenantSession();

  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(5, params?.limit || 20));
  const skip = (page - 1) * limit;
  const categoria = params?.categoria || "todas";
  const search = params?.search?.trim() || "";

  const where: any = {
    tenantId,
  };

  if (categoria !== "todas" && categoryAcoesMap[categoria]?.length > 0) {
    where.acao = { in: categoryAcoesMap[categoria] };
  }

  if (search) {
    where.OR = [
      { acao: { contains: search, mode: "insensitive" } },
      { entidade: { contains: search, mode: "insensitive" } },
      { entidadeId: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rawLogs, totalCount, statsAgg] = await Promise.all([
    prismaAdmin.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
    }),
    prismaAdmin.auditLog.count({ where }),
    prismaAdmin.auditLog.groupBy({
      by: ["acao"],
      where: { tenantId },
      _count: { id: true },
    }),
  ]);

  let totalEmissoes = 0;
  let totalAutorizadas = 0;
  let totalRejeitadas = 0;
  let totalNotificacoes = 0;

  for (const s of statsAgg) {
    if (s.acao === "EMISSAO_NFE") totalEmissoes += s._count.id;
    if (s.acao === "WEBHOOK_AUTORIZADA") totalAutorizadas += s._count.id;
    if (s.acao === "WEBHOOK_REJEITADA" || s.acao === "EMISSAO_NFE_REPROVADA") totalRejeitadas += s._count.id;
    if (s.acao.startsWith("NOTIFICACAO") || s.acao.startsWith("FALLBACK")) totalNotificacoes += s._count.id;
  }

  const logs = rawLogs.map((l) => ({
    id: l.id,
    timestamp: l.timestamp.toISOString(),
    acao: l.acao,
    actorType: l.actorType,
    actorId: l.actorId,
    entidade: l.entidade,
    entidadeId: l.entidadeId,
    detalhe: l.detalhe as any,
  }));

  return {
    logs,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit) || 1,
    stats: {
      totalGeral: statsAgg.reduce((acc, curr) => acc + curr._count.id, 0),
      totalEmissoes,
      totalAutorizadas,
      totalRejeitadas,
      totalNotificacoes,
    },
  };
}

/**
 * Consulta logs de auditoria de todo o ecossistema para o Administrador Master
 */
export async function getAdminLogsAction(params?: {
  page?: number;
  limit?: number;
  categoria?: LogCategory;
  search?: string;
  tenantId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "ADMIN") {
    throw new Error("Acesso restrito ao Administrador Master.");
  }

  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(5, params?.limit || 20));
  const skip = (page - 1) * limit;
  const categoria = params?.categoria || "todas";
  const search = params?.search?.trim() || "";
  const filterTenantId = params?.tenantId && params.tenantId !== "todos" ? params.tenantId : undefined;

  const where: any = {};

  if (filterTenantId) {
    where.tenantId = filterTenantId;
  }

  if (categoria !== "todas" && categoryAcoesMap[categoria]?.length > 0) {
    where.acao = { in: categoryAcoesMap[categoria] };
  }

  if (search) {
    where.OR = [
      { acao: { contains: search, mode: "insensitive" } },
      { entidade: { contains: search, mode: "insensitive" } },
      { entidadeId: { contains: search, mode: "insensitive" } },
      { tenant: { razaoSocial: { contains: search, mode: "insensitive" } } },
      { tenant: { cnpj: { contains: search } } },
    ];
  }

  const [rawLogs, totalCount, statsAgg, allTenants] = await Promise.all([
    prismaAdmin.auditLog.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            razaoSocial: true,
            cnpj: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
    }),
    prismaAdmin.auditLog.count({ where }),
    prismaAdmin.auditLog.groupBy({
      by: ["acao"],
      where: filterTenantId ? { tenantId: filterTenantId } : {},
      _count: { id: true },
    }),
    prismaAdmin.tenant.findMany({
      select: {
        id: true,
        razaoSocial: true,
        cnpj: true,
      },
      orderBy: { razaoSocial: "asc" },
    }),
  ]);

  let totalEmissoes = 0;
  let totalAutorizadas = 0;
  let totalRejeitadas = 0;
  let totalNotificacoes = 0;

  for (const s of statsAgg) {
    if (s.acao === "EMISSAO_NFE") totalEmissoes += s._count.id;
    if (s.acao === "WEBHOOK_AUTORIZADA") totalAutorizadas += s._count.id;
    if (s.acao === "WEBHOOK_REJEITADA" || s.acao === "EMISSAO_NFE_REPROVADA") totalRejeitadas += s._count.id;
    if (s.acao.startsWith("NOTIFICACAO") || s.acao.startsWith("FALLBACK")) totalNotificacoes += s._count.id;
  }

  const logs = rawLogs.map((l) => ({
    id: l.id,
    timestamp: l.timestamp.toISOString(),
    acao: l.acao,
    actorType: l.actorType,
    actorId: l.actorId,
    entidade: l.entidade,
    entidadeId: l.entidadeId,
    detalhe: l.detalhe as any,
    tenant: l.tenant
      ? {
          id: l.tenant.id,
          razaoSocial: l.tenant.razaoSocial,
          cnpj: l.tenant.cnpj,
        }
      : null,
  }));

  return {
    logs,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit) || 1,
    tenants: allTenants,
    stats: {
      totalGeral: statsAgg.reduce((acc, curr) => acc + curr._count.id, 0),
      totalEmissoes,
      totalAutorizadas,
      totalRejeitadas,
      totalNotificacoes,
    },
  };
}

