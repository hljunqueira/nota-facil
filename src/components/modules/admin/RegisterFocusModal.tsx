"use client";

import React, { useState } from "react";
import { Server, CheckCircle2, Loader2, X, AlertCircle } from "lucide-react";
import { registerFocusCompanyAction } from "@/actions/admin";

interface RegisterFocusModalProps {
  tenant: {
    id: string;
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual: string;
    emailPrincipal: string;
    telefoneContato: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (focusCompanyId: number) => void;
}

export function RegisterFocusModal({
  tenant,
  isOpen,
  onClose,
  onSuccess,
}: RegisterFocusModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !tenant) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await registerFocusCompanyAction(tenant.id);
      if (!res.success) {
        setError(res.error || "Erro ao registrar empresa na Focus NFe.");
        setLoading(false);
        return;
      }

      onSuccess(res.focusCompanyId!);
      onClose();
    } catch {
      setError("Falha de conexão com a Focus NFe.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600">
            <Server className="w-5 h-5" />
            <h3 className="font-bold text-sm text-ink">Registrar na Focus NFe API</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleRegister} className="p-5 space-y-4">
          <p className="text-xs text-slate-600">
            Ao registrar a empresa na Focus NFe, os módulos fiscais de <strong>NF-e</strong> e <strong>Manifestação do Destinatário (MDe)</strong> serão habilitados e os webhooks oficiais serão conectados automaticamente.
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
            <p>
              <strong>Razão Social:</strong> {tenant.razaoSocial}
            </p>
            <p>
              <strong>CNPJ:</strong> {tenant.cnpj}
            </p>
            <p>
              <strong>Inscrição Estadual:</strong> {tenant.inscricaoEstadual}
            </p>
            <p>
              <strong>E-mail:</strong> {tenant.emailPrincipal}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmar Registro Focus NFe</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
