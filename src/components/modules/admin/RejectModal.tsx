"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { rejectTenantAction } from "@/actions/admin";

interface RejectModalProps {
  tenant: { id: string; razaoSocial: string; cnpj: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectModal({ tenant, isOpen, onClose, onSuccess }: RejectModalProps) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !tenant) return null;

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim() || motivo.trim().length < 5) {
      setError("Por favor, descreva o motivo da rejeição (mínimo 5 caracteres).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await rejectTenantAction(tenant.id, motivo);
      if (!res.success) {
        setError(res.error || "Erro ao rejeitar cadastro.");
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Falha de conexão com o servidor.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-sm text-ink">Rejeitar Cadastro de Oficina</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleReject} className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
            <p>
              <strong>Oficina:</strong> {tenant.razaoSocial}
            </p>
            <p>
              <strong>CNPJ:</strong> {tenant.cnpj}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="motivo"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Justificativa da Rejeição *
            </label>
            <textarea
              id="motivo"
              rows={3}
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: CNPJ baixado na Receita Federal ou Inscrição Estadual inconsistente."
              className="w-full p-3 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-ink placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rejeitando...</span>
                </>
              ) : (
                <span>Confirmar Rejeição</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
