"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";

export interface LogItem {
  id: string;
  timestamp: string;
  acao: string;
  actorType: string;
  actorId: string;
  entidade: string;
  entidadeId: string;
  detalhe?: any;
}

interface LogDetailsModalProps {
  log: LogItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LogDetailsModal({ log, isOpen, onClose }: LogDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !log) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Identifica erros ou mensagens SEFAZ no detalhe
  const detalhe = log.detalhe || {};
  const erroMsg =
    detalhe.erro ||
    detalhe.error ||
    detalhe.mensagem ||
    detalhe.mensagem_sefaz ||
    detalhe.erros;
  const cStat = detalhe.status_sefaz || detalhe.cStat;
  const chaveAcesso = detalhe.chaveAcesso || detalhe.chave || detalhe.chave_nfe;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Registro de Auditoria Fiscal</h2>
              <p className="text-xs text-slate-400 font-mono">ID: {log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Data / Hora</span>
              <p className="font-semibold text-ink mt-0.5">
                {new Date(log.timestamp).toLocaleString("pt-BR")}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Ação Executada</span>
              <p className="font-bold text-ink mt-0.5 break-all">{log.acao}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Origem / Ator</span>
              <p className="font-semibold text-ink mt-0.5">
                {log.actorType} {log.actorId ? `(${log.actorId.slice(0, 6)}...)` : ""}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Entidade</span>
              <p className="font-semibold text-ink mt-0.5">
                {log.entidade}
              </p>
            </div>
          </div>

          {/* Destaque de Erro / Rejeição SEFAZ se houver */}
          {erroMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  Retorno SEFAZ / Motivo da Rejeição {cStat ? `(cStat: ${cStat})` : ""}
                </span>
              </div>
              <p className="text-xs text-red-800 leading-relaxed font-medium">
                {typeof erroMsg === "string" ? erroMsg : JSON.stringify(erroMsg)}
              </p>
            </div>
          )}

          {/* Chave de acesso em destaque se houver */}
          {chaveAcesso && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Chave de Acesso da NF-e
              </span>
              <span className="font-mono text-xs font-bold text-ink break-all select-all">
                {chaveAcesso}
              </span>
            </div>
          )}

          {/* JSON Payload Completo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Payload / Dados Completos do Evento
              </span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar JSON"}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-64 leading-relaxed">
              {JSON.stringify(log.detalhe || {}, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
