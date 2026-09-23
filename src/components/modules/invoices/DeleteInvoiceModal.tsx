"use client";

import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  Trash2,
  Loader2,
  Calendar,
  Building2,
  DollarSign,
} from "lucide-react";
import { deleteInvoiceAction } from "@/actions/invoices";

interface DeleteInvoiceModalProps {
  isOpen: boolean;
  invoice: {
    id: string;
    numero: number;
    serie: number;
    tipo?: string;
    modalidadeEmissao?: string | null;
    status: string;
    valorTotal: number;
    dataEmissao?: string | Date;
    partner?: {
      razaoSocial?: string;
      nomeFantasia?: string | null;
    } | null;
  } | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function DeleteInvoiceModal({
  isOpen,
  invoice,
  onClose,
  onSuccess,
}: DeleteInvoiceModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const isSaidaAutorizada = invoice.tipo === "SAIDA" && invoice.status === "AUTORIZADA";

  const handleDelete = async () => {
    if (isSaidaAutorizada) {
      setError("Notas de saída autorizadas na SEFAZ não podem ser excluídas. Cancele a nota antes.");
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const res = await deleteInvoiceAction(invoice.id);
      if (res.success) {
        onSuccess(`NF-e Nº ${invoice.numero} excluída com sucesso!`);
        onClose();
      } else {
        setError(res.error || "Erro ao excluir nota fiscal.");
      }
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao excluir nota.");
    } finally {
      setDeleting(false);
    }
  };

  const formattedValor = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(invoice.valorTotal));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Excluir Nota Fiscal</h2>
              <p className="text-[11px] text-slate-500">Confirmação de exclusão do sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Card com Detalhes da Nota */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">
                NF-e Nº {invoice.numero} (Série {invoice.serie})
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  invoice.status === "REJEITADA"
                    ? "bg-rose-100 text-rose-800"
                    : invoice.status === "CANCELADA"
                    ? "bg-slate-200 text-slate-700"
                    : invoice.status === "PENDENTE"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {invoice.status}
              </span>
            </div>

            <div className="space-y-1 text-slate-600 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-800">
                  {invoice.partner?.razaoSocial || invoice.partner?.nomeFantasia || "Fábrica"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-900">{formattedValor}</span>
              </div>
            </div>
          </div>

          {/* Aviso contextual */}
          {isSaidaAutorizada ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <strong>Nota Fiscal de Saída Autorizada:</strong> Esta nota está ativa na SEFAZ. Você deve efetuar o
              cancelamento oficial na SEFAZ antes de removê-la do sistema.
            </div>
          ) : (
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Tem certeza que deseja remover esta nota fiscal? O registro será excluído da sua listagem e do
              painel de controle. Esta ação é irreversível.
            </p>
          )}

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs min-h-[44px] transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {!isSaidaAutorizada && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs min-h-[44px] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
