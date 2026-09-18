import React from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Server,
} from "lucide-react";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { StatusCadastro } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [totalTenants, pendentesCount, pendentesList, totalNotas] =
    await Promise.all([
      prismaAdmin.tenant.count(),
      prismaAdmin.tenant.count({
        where: { statusCadastro: StatusCadastro.PENDENTE_ANALISE },
      }),
      prismaAdmin.tenant.findMany({
        where: { statusCadastro: StatusCadastro.PENDENTE_ANALISE },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
      prismaAdmin.invoice.count(),
    ]);

  return (
    <div className="space-y-6">
      {/* Admin Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Painel Master da Plataforma
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitoramento multi-tenant, auditoria de oficinas e conexões fiscais Focus NFe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Focus NFe API v2 Online
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Oficinas Cadastradas
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink">{totalTenants}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Total no sistema</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Aprovações Pendentes
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-bold ${
                pendentesCount > 0 ? "text-amber-600" : "text-ink"
              }`}
            >
              {pendentesCount}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Aguardando auditoria</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Volume de Notas (Total)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink">{totalNotas}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Emitidas / Processadas</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Serviços Background
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              BullMQ & Redis Ativos
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Fila de webhooks e MDe</p>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-ink">Aprovações de Oficinas</h2>
            <Link
              href="/admin/aprovacoes"
              className="text-xs font-semibold text-primary hover:text-primaryDark flex items-center gap-1"
            >
              <span>Ver todas ({pendentesCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendentesList.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-ink">
                Nenhuma empresa aguardando aprovação
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Novos cadastros públicos passarão por triagem antes da ativação.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendentesList.map((tenant) => (
                <div
                  key={tenant.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-ink">{tenant.razaoSocial}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      CNPJ: {tenant.cnpj}
                    </p>
                  </div>
                  <Link
                    href="/admin/aprovacoes"
                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-800 text-[11px] font-semibold hover:bg-amber-500/20"
                  >
                    Auditar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-ink">Conexões Fiscais Master</h2>
            <Link
              href="/admin/configuracoes"
              className="text-xs font-semibold text-primary hover:text-primaryDark flex items-center gap-1"
            >
              <span>Configurar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold text-ink">Token Master Produção</p>
                  <p className="text-[10px] text-slate-500">HokM4R...xQze (Configurado)</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Ativo
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold text-ink">Token Master Homologação</p>
                  <p className="text-[10px] text-slate-500">z0YGKm...KaWi (Configurado)</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Ativo
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
