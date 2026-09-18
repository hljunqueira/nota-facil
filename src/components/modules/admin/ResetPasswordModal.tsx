"use client";

import React, { useState } from "react";
import { X, KeyRound, Loader2, Check, Copy, RefreshCw, AlertCircle } from "lucide-react";
import { resetTenantUserPasswordAction } from "@/actions/admin";

interface ResetPasswordModalProps {
  tenant: any;
  user: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ResetPasswordModal({
  tenant,
  user,
  onClose,
  onSuccess,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "Nota@";
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += Math.floor(100 + Math.random() * 900);
    setPassword(pass);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await resetTenantUserPasswordAction(tenant.id, user.id, password);
      if (!res.success) {
        setError(res.error || "Erro ao redefinir senha.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Senha alterada com sucesso! Copie a senha para enviar ao cliente.");
      if (onSuccess) onSuccess();
    } catch {
      setError("Erro inesperado de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-ink">
            <KeyRound className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Redefinir Senha do Usuário</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
          <p>
            <strong>Empresa:</strong> {tenant.razaoSocial}
          </p>
          <p>
            <strong>Usuário:</strong> {user.nome} ({user.email})
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <p className="font-bold">{successMsg}</p>
            <p className="mt-1 font-mono text-xs bg-white p-2 rounded border border-emerald-300 select-all">
              {password}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Nova Senha
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] font-semibold text-primary hover:text-primaryDark flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Gerar Senha Automática</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setCopied(false);
                }}
                placeholder="Ex: NotaFacil@2026"
                className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {password && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
                  title="Copiar senha"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primaryDark rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Nova Senha</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
