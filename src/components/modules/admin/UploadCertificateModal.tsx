"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock, Upload, Loader2, X, AlertCircle } from "lucide-react";
import { uploadCertificateAction } from "@/actions/admin";

interface UploadCertificateModalProps {
  tenant: { id: string; razaoSocial: string; cnpj: string; focusNfeIdEmpresa?: number | null } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (validoAte?: string) => void;
}

export function UploadCertificateModal({
  tenant,
  isOpen,
  onClose,
  onSuccess,
}: UploadCertificateModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Selecione o arquivo do certificado digital (.pfx ou .p12).");
      return;
    }
    if (!password) {
      setError("Informe a senha do certificado digital.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("tenantId", tenant.id);
    formData.append("certificate", file);
    formData.append("password", password);

    try {
      const res = await uploadCertificateAction(formData);
      if (!res.success) {
        setError(res.error || "Erro ao transmitir certificado para a Focus NFe.");
        setLoading(false);
        return;
      }

      onSuccess(res.validoAte);
      onClose();
    } catch {
      setError("Falha inesperada ao conectar com o servidor.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-bold text-sm text-ink">Configurar Certificado Digital A1</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
            <p>
              <strong>Oficina:</strong> {tenant.razaoSocial}
            </p>
            <p>
              <strong>CNPJ:</strong> {tenant.cnpj}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Segurança Zero-Storage:</strong> O arquivo .pfx é enviado diretamente em memória RAM efêmera para a Focus NFe e destruído em seguida. Zero persistência no banco ou disco.
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="certificate"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Arquivo do Certificado (.pfx ou .p12) *
            </label>
            <input
              id="certificate"
              type="file"
              accept=".pfx,.p12"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primaryDark hover:file:bg-primary/20 cursor-pointer"
            />
          </div>

          <div>
            <label
              htmlFor="certPassword"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Senha do Certificado Digital *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="certPassword"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de exportação do .pfx"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primaryDark disabled:opacity-60 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitindo à Focus...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Instalar Certificado A1</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
