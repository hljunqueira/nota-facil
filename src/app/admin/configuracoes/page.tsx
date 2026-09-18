import React from "react";
import {
  ShieldCheck,
  Server,
  Globe,
  Sliders,
  CheckCircle2,
  KeyRound,
  ExternalLink,
} from "lucide-react";

export default function AdminConfiguracoesPage() {
  const tokenHomologacao =
    process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO || "z0YGKmkRLmkZLQtGC7YVw1k0TL8ZKaWi";
  const tokenProducao =
    process.env.FOCUS_NFE_TOKEN_PRODUCAO || "HokM4RIK8PqGFyzkgiyShkgiT8gKxQze";
  const webhookUrl = `${process.env.NEXTAUTH_URL || "https://appnotafacil.online"}/api/webhooks/focus-nfe`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Configurações Fiscais Master
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Parâmetros globais de comunicação com a Focus NFe API v2 e Webhooks
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configuração Master Ativa</span>
        </span>
      </div>

      {/* Grid de Configurações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Token Master Focus NFe Homologação */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Token Master — Homologação</h2>
              <p className="text-xs text-slate-400">Ambiente de testes SEFAZ sem valor fiscal</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 font-mono text-xs text-slate-700 break-all">
            {tokenHomologacao}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Status: Conectado</span>
            <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
              HOMOLOGAÇÃO
            </span>
          </div>
        </div>

        {/* Token Master Focus NFe Produção */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Token Master — Produção</h2>
              <p className="text-xs text-slate-400">Emissão oficial de NF-e autorizada na SEFAZ</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 font-mono text-xs text-slate-700 break-all">
            {tokenProducao}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Status: Conectado</span>
            <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
              PRODUÇÃO
            </span>
          </div>
        </div>

        {/* Webhooks Oficiais */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 md:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Endpoint Global de Webhooks (Focus NFe)</h2>
              <p className="text-xs text-slate-400">
                Recebimento assíncrono de eventos `nfe` (autorização/rejeição) e `nfe_recebida` (MDe)
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 font-mono text-xs text-slate-700 break-all">
            {webhookUrl}
          </div>

          <div className="text-xs text-slate-500 leading-relaxed">
            Quando novas empresas forem aprovadas e registradas na Focus NFe pelo painel, este endereço HTTPS será cadastrado automaticamente nos webhooks de eventos da Focus NFe.
          </div>
        </div>
      </div>
    </div>
  );
}
