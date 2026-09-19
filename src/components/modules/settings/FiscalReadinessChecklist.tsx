"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building2,
  KeyRound,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";

interface FiscalReadinessChecklistProps {
  tenant?: {
    razaoSocial?: string;
    cnpj?: string;
    inscricaoEstadual?: string;
    ambiente?: string;
    certificadoValidoAte?: string | Date | null;
  } | null;
}

export function FiscalReadinessChecklist({ tenant }: FiscalReadinessChecklistProps) {
  const hasCnpj = Boolean(tenant?.cnpj && tenant.cnpj.replace(/\D/g, "").length >= 14);
  const hasIe = Boolean(
    tenant?.inscricaoEstadual &&
      tenant.inscricaoEstadual.trim().length > 3 &&
      tenant.inscricaoEstadual.toUpperCase() !== "ISENTO"
  );
  const certValido = tenant?.certificadoValidoAte
    ? new Date(tenant.certificadoValidoAte) > new Date()
    : false;

  const sefazPortals = [
    { uf: "SC", nome: "Santa Catarina (SEF/SC SAT)", url: "https://sat.sef.sc.gov.br" },
    { uf: "SP", nome: "São Paulo (SEFAZ/SP PFE)", url: "https://www.fazenda.sp.gov.br/nfe/" },
    { uf: "MG", nome: "Minas Gerais (SEF/MG SIARE)", url: "https://www.fazenda.mg.gov.br/" },
    { uf: "PR", nome: "Paraná (Receita/PR)", url: "https://receita.pr.gov.br/" },
    { uf: "RS", nome: "Rio Grande do Sul (SEFAZ/RS)", url: "https://www.sefaz.rs.gov.br/" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-bold text-ink">
            Checklist de Prontidão Fiscal para Oficinas de Costura
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Orientações contábeis e fiscais essenciais para emitir notas de retorno (5.902) e cobrança (5.124) em conformidade com a SEFAZ e o Simples Nacional.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PASSO 1 */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="text-xs font-bold text-ink">Regularização & Inscrição Estadual</h3>
            </div>
            {hasCnpj && hasIe ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cadastrado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                Pendente
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Para operações de facção têxtil, a oficina deve ter CNPJ ativo com CNAE industrial de confecção/facção (ex: 1412-6/01 ou 1412-6/03) e Inscrição Estadual regular na SEFAZ.
          </p>
          <div className="pt-1 text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
            <span>Consultar situação cadastral:</span>
            <a
              href="http://www.sintegra.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              SINTEGRA <ExternalLink className="w-3 h-3" />
            </a>
            <span>|</span>
            <a
              href="https://dfe-portal.svrs.rs.gov.br/NFE/Ccc"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              Cadastro Centralizado (CCC) <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* PASSO 2 */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="text-xs font-bold text-ink">Credenciamento SEFAZ na UF</h3>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              <Building2 className="w-3.5 h-3.5" />
              Exigido pelo Estado
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ter a Inscrição Estadual não basta: a SEFAZ do seu estado exige que o contribuinte seja formalmente credenciado como emissor voluntário de NF-e (Modelo 55).
          </p>
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-700 block">Portais Oficiais SEFAZ:</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sefazPortals.map((p) => (
                <a
                  key={p.uf}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-semibold bg-white border border-slate-300 hover:border-primary text-slate-700 px-2 py-1 rounded-md inline-flex items-center gap-1 transition-colors"
                >
                  {p.uf} <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* PASSO 3 */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h3 className="text-xs font-bold text-ink">Certificado Digital A1 (e-CNPJ)</h3>
            </div>
            {certValido ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ativo
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                Instalação Pendente
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            O certificado digital em arquivo .pfx ou .p12 assina eletronicamente cada NF-e perante os servidores da SEFAZ. Ele é protegido e armazenado de forma criptografada na integração.
          </p>
          <div className="text-[11px] font-medium text-slate-500">
            {tenant?.certificadoValidoAte ? (
              <span>
                Validade atual:{" "}
                <strong className="text-ink">
                  {new Date(tenant.certificadoValidoAte).toLocaleDateString("pt-BR")}
                </strong>
              </span>
            ) : (
              <span>Nenhum certificado A1 registrado para esta oficina.</span>
            )}
          </div>
        </div>

        {/* PASSO 4 */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h3 className="text-xs font-bold text-ink">Blindagem Fiscal do Simples Nacional</h3>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Regras Ativas
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            O sistema faz a separação automática dos CFOPs para garantir que seu contador nunca tribute o tecido recebido da fábrica parceira:
          </p>
          <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
            <li>
              <strong>CFOP 5.902:</strong> Retorno físico do tecido (Não tributável / Isento).
            </li>
            <li>
              <strong>CFOP 5.124:</strong> Cobrança da mão de obra da costura (Tributado no Anexo II - Indústria).
            </li>
          </ul>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-1">
          <span className="font-bold">Aviso Contábil Importante:</span>
          <p className="text-blue-800 leading-relaxed">
            Ao final de cada mês, utilize a aba <strong>Enviar ao Contador</strong> para exportar o pacote ZIP oficial. O relatório CSV gerado pelo Nota Fácil já inclui a segregação detalhada entre base de cálculo tributável e trânsito não tributável de insumos, protegendo sua oficina contra cobrança indevida de DAS.
          </p>
        </div>
      </div>
    </div>
  );
}
