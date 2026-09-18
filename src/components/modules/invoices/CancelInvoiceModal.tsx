"use client";

import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  FileX,
  Loader2,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { cancelInvoiceAction } from "@/actions/invoices";

interface CancelInvoiceModalProps {
  isOpen: boolean;
  invoice: {
    id: string;
    numero: number;
    serie: number;
    chaveAcesso?: string | null;
    valorTotal: number;
    partnerNome?: string | null;
  } | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function CancelInvoiceModal({
  isOpen,
  invoice,
  onClose,
  onSuccess,
}: CancelInvoiceModalProps) {
  const [justificativa, setJustificativa] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const charCount = justificativa.trim().length;
  const isValidLength = charCount >= 15 && charCount <= 255;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidLength) {
      setError("A justificativa deve conter entre 15 e 255 caracteres.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await cancelInvoiceAction({
        invoiceId: invoice.id,
        justificativa: justificativa.trim(),
      });

      if (!res.success) {
        setError(res.error || "Erro ao solicitar cancelamento.");
        return;
      }

      onSuccess(res.message || "Nota fiscal cancelada com sucesso na SEFAZ!");
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao cancelar nota.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <FileX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                Cancelar NF-e de Retorno
              </h2>
              <p className="text-xs text-slate-500">
                Transmissão de evento de cancelamento oficial para a SEFAZ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dados da Nota */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Nota / Série:</span>
              <span className="font-bold text-ink">
                NF-e #{invoice.numero} (Série {invoice.serie})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Fábrica Parceira:</span>
              <span className="font-semibold text-slate-800">
                {invoice.partnerNome || "Fábrica Parceira"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Valor Total:</span>
              <span className="font-bold text-emerald-700 font-mono">
                {formatCurrency(invoice.valorTotal)}
              </span>
            </div>
            {invoice.chaveAcesso && (
              <div className="pt-1.5 border-t border-slate-200/60 font-mono text-[10px] text-slate-500 break-all">
                Chave: {invoice.chaveAcesso}
              </div>
            )}
          </div>

          {/* Aviso SEFAZ */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px]">
              <p className="font-bold">Aviso legal da SEFAZ:</p>
              <p>
                O cancelamento só é homologado em até <strong>24 horas</strong> após a autorização e desde que as mercadorias não tenham circulado. Esta operação é irreversível.
              </p>
            </div>
          </div>

          {/* Campo de Justificativa */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-ink">
                Justificativa do Cancelamento <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[10px] font-mono font-semibold ${
                  charCount < 15
                    ? "text-rose-600"
                    : charCount > 255
                    ? "text-rose-600"
                    : "text-slate-500"
                }`}
              >
                {charCount}/255 caracteres (mín. 15)
              </span>
            </div>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex: Erro no cálculo de peças devolvidas ou cancelamento do pedido pela confecção parceira..."
              rows={3}
              disabled={submitting}
              maxLength={255}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-ink placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={submitting || !isValidLength}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transmitindo à SEFAZ...</span>
                </>
              ) : (
                <>
                  <FileX className="w-4 h-4" />
                  <span>Confirmar Cancelamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
