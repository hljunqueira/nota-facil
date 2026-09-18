import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Server,
  Globe,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  Users,
  AlertCircle,
  ArrowRight,
  Cpu,
} from "lucide-react";
import { prismaAdmin } from "@/lib/prismaAdmin";

export const dynamic = "force-dynamic";

export default async function AdminConfiguracoesPage() {
  const webhookUrl = `${process.env.NEXTAUTH_URL || "https://appnotafacil.online"}/api/webhooks/focus-nfe`;
  const partnerToken = process.env.FOCUS_NFE_PARTNER_TOKEN || "";

  // Consulta métricas reais dos tenants no banco de dados
  const [totalTenants, tenantsWithProd, tenantsWithHomo] = await Promise.all([
    prismaAdmin.tenant.count(),
    prismaAdmin.tenant.count({
      where: { focusNfeTokenProducao: { not: null } },
    }),
    prismaAdmin.tenant.count({
      where: { focusNfeTokenHomologacao: { not: null } },
    }),
  ]);

  const tenantsPendingTokens = await prismaAdmin.tenant.count({
    where: {
      AND: [
        { focusNfeTokenProducao: null },
        { focusNfeTokenHomologacao: null },
      ],
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Infraestrutura Fiscal & Webhooks
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Arquitetura descentralizada • Gestão individual de tokens por cliente & receptor global de webhooks
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Infraestrutura Ativa</span>
        </span>
      </div>

      {/* Alerta de Arquitetura Descentralizada */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Cpu className="w-4 h-4" />
          <span>Diretriz do Negócio: Tokens Exclusivos por Cliente</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed max-w-3xl">
          Nesta plataforma, <strong>não existe Token Master compartilhado para emissão de notas fiscais</strong>. Cada oficina/cliente possui seus próprios tokens da Focus NFe e conexão isolada com a SEFAZ. A gestão e teste dos tokens são realizados diretamente pela oficina em suas configurações ou pelo suporte administrativo em Oficinas & Clientes.
        </p>
      </div>

      {/* Grid de Estatísticas dos Clientes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total de Oficinas</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{totalTenants}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Empresas cadastradas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Token Produção</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{tenantsWithProd}</p>
          <span className="text-[11px] text-emerald-600 mt-1 block">Aptas para emissão oficial</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Token Homologação</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{tenantsWithHomo}</p>
          <span className="text-[11px] text-amber-600 mt-1 block">Ambiente de testes</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pendentes de Token</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-700 mt-2">{tenantsPendingTokens}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Aguardando inserção de token</span>
        </div>
      </div>

      {/* Grid de Infraestrutura */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Endpoint Global de Webhooks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Endpoint Global de Webhooks</h2>
              <p className="text-xs text-slate-400">
                Receptor seguro de eventos assíncronos da Focus NFe
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 font-mono text-xs text-slate-700 break-all select-all">
            {webhookUrl}
          </div>

          <div className="text-xs text-slate-500 leading-relaxed space-y-2">
            <p>
              Todos os webhooks cadastrados nas subcontas dos clientes apontam para este endpoint. O sistema identifica o cliente destinatário automaticamente através do CNPJ ou da referência da nota fiscal.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold">
                nfe (autorização / rejeição)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold">
                nfe_recebida (MDe)
              </span>
            </div>
          </div>
        </div>

        {/* Chave de Parceiro da Plataforma */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Chave Parceira da Plataforma</h2>
              <p className="text-xs text-slate-400">
                Utilizada apenas para criação automática de subcontas na Focus NFe
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 font-mono text-xs text-slate-700 break-all">
            {partnerToken ? (
              `${partnerToken.slice(0, 6)}...${partnerToken.slice(-4)} (Configurada no Ambiente)`
            ) : (
              <span className="text-slate-400 italic">FOCUS_NFE_PARTNER_TOKEN não definida (opcional)</span>
            )}
          </div>

          <div className="text-xs text-slate-500 leading-relaxed">
            Esta chave administrativa é usada estritamente para a chamada <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">POST /v2/empresas</code> quando uma oficina for criada pela API de parceiros. <strong>Ela não tem permissão nem é utilizada para emitir notas fiscais dos clientes.</strong>
          </div>
        </div>
      </div>

      {/* Ação de Navegação para Gestão de Clientes */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Gerenciamento de Oficinas & Tokens Fiscais</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Para visualizar ou editar os tokens individuais de cada cliente, acesse o painel de Oficinas & Clientes.
          </p>
        </div>

        <Link
          href="/admin/tenants"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
        >
          <span>Ir para Oficinas & Clientes</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
