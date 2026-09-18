"use client";

import React, { useState } from "react";
import {
  X,
  Trash2,
  ShieldAlert,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { deletePartnerAction } from "@/actions/partners";

interface PartnerDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: {
    id: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
    cnpj: string;
    totalInvoices: number;
  } | null;
  onSuccess: (message: string) => void;
}

export function PartnerDeleteModal({
  isOpen,
  onClose,
  partner,
  onSuccess,
}: PartnerDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !partner) return null;

  const hasInvoices = partner.totalInvoices > 0;

  const handleConfirmDelete = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await deletePartnerAction(partner.id);
      if (res.success) {
        onSuccess(res.message || "Fábrica parceira excluída com sucesso.");
        onClose();
      } else {
        setErrorMessage(res.error || "Não foi possível excluir o parceiro.");
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || "Ocorreu um erro inesperado ao tentar excluir o parceiro."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCnpj = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                hasInvoices
                  ? "bg-amber-100 text-amber-700"
                  : "bg-rose-100 text-rose-600"
              }`}
            >
              {hasInvoices ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink">
                {hasInvoices
                  ? "Exclusão Bloqueada"
                  : "Excluir Fábrica Parceira"}
              </h2>
              <p className="text-xs text-slate-500">
                {hasInvoices
                  ? "Proteção de integridade fiscal e contábil"
                  : "Confirmação de remoção de cadastro"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Card com Dados do Parceiro */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
            <div className="font-bold text-ink text-sm">
              {partner.razaoSocial}
            </div>
            {partner.nomeFantasia && (
              <div className="text-slate-500">
                Marca / Fantasia: <span className="font-semibold text-slate-700">{partner.nomeFantasia}</span>
              </div>
            )}
            <div className="text-slate-500 font-mono text-[11px]">
              CNPJ: {formatCnpj(partner.cnpj)}
            </div>
          </div>

          {/* Cenário 1: BLOQUEIO - Possui Notas Fiscais */}
          {hasInvoices ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <FileText className="w-4 h-4" />
                  <span>{partner.totalInvoices} nota(s) fiscal(is) vinculada(s)</span>
                </div>
                <p>
                  Esta fábrica possui notas de remessa ou devolução registradas.
                  Pelas normas fiscais da SEFAZ e para manter a conformidade do
                  fechamento mensal do seu contador, empresas com movimentação
                  não podem ser excluídas.
                </p>
                <p className="text-[11px] text-amber-700 font-medium">
                  💡 Dica: Se não for mais prestar serviços para esta confecção,
                  você pode apenas editar o cadastro ou manter os registros para
                  histórico de faturamento.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Entendido, Manter Cadastro
                </button>
              </div>
            </div>
          ) : (
            /* Cenário 2: PERMITIDO - Sem Notas Vinculadas */
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tem certeza que deseja remover esta fábrica parceira? Como ainda
                não há nenhuma nota fiscal vinculada a este cadastro, a exclusão
                é segura e definitiva.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Sim, Excluir Fábrica</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
