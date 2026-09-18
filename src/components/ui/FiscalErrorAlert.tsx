"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
  ShieldAlert,
  Info,
} from "lucide-react";
import {
  HumanizedFiscalError,
  translateFocusNfeError,
} from "@/lib/focusNfeErrorMap";

interface FiscalErrorAlertProps {
  error: HumanizedFiscalError | string | any;
  onDismiss?: () => void;
  className?: string;
}

export function FiscalErrorAlert({
  error,
  onDismiss,
  className = "",
}: FiscalErrorAlertProps) {
  const [showTechnical, setShowTechnical] = useState(false);

  if (!error) return null;

  const humanized: HumanizedFiscalError =
    typeof error === "object" && "comoResolver" in error
      ? error
      : translateFocusNfeError(error);

  const isWarning = humanized.gravidade === "AVISO";

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200 ${
        isWarning
          ? "bg-amber-50/90 border-amber-200/90 text-amber-950"
          : "bg-rose-50/90 border-rose-200/90 text-rose-950"
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isWarning
                ? "bg-amber-100 text-amber-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {isWarning ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-ink">
                {humanized.titulo}
              </h3>
              {humanized.codigo && humanized.codigo !== "SEFAZ" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  Cód. {humanized.codigo}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {humanized.descricao}
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Caixa "Como Resolver" */}
      <div className="mt-3.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-emerald-800 block">
              Como Resolver:
            </span>
            <p className="text-xs text-slate-700 mt-0.5 leading-normal">
              {humanized.comoResolver}
            </p>
          </div>
        </div>
      </div>

      {/* Acordeão de Detalhes Técnicos SEFAZ */}
      {humanized.detalheTecnico && (
        <div className="mt-2.5 pt-2 border-t border-slate-200/60">
          <button
            type="button"
            onClick={() => setShowTechnical(!showTechnical)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            <span>
              {showTechnical
                ? "Ocultar detalhes técnicos"
                : "Ver detalhes técnicos da SEFAZ"}
            </span>
            {showTechnical ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {showTechnical && (
            <pre className="mt-2 p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap break-all max-h-36">
              {humanized.detalheTecnico}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
