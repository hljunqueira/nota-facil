"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { updateTenantTokensAdminAction } from "@/actions/admin";
import { testTenantFocusConnectionAction } from "@/actions/tenantConfig";

interface EditTenantTokensModalProps {
  tenant: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditTenantTokensModal({
  tenant,
  isOpen,
  onClose,
  onSuccess,
}: EditTenantTokensModalProps) {
  const [tokenHomo, setTokenHomo] = useState("");
  const [tokenProd, setTokenProd] = useState("");
  const [focusId, setFocusId] = useState("");
  const [ambiente, setAmbiente] = useState<"HOMOLOGACAO" | "PRODUCAO">("HOMOLOGACAO");

  const [showHomo, setShowHomo] = useState(false);
  const [showProd, setShowProd] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testingHomo, setTestingHomo] = useState(false);
  const [testingProd, setTestingProd] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setTokenHomo(tenant.focusNfeTokenHomologacao || "");
      setTokenProd(tenant.focusNfeTokenProducao || "");
      setFocusId(tenant.focusNfeIdEmpresa ? String(tenant.focusNfeIdEmpresa) : "");
      setAmbiente(tenant.ambiente || "HOMOLOGACAO");
      setTestResult(null);
      setErrorMessage(null);
    }
  }, [tenant]);

  if (!isOpen || !tenant) return null;

  const handleTestHomo = async () => {
    if (!tokenHomo.trim()) return;
    setTestingHomo(true);
    setTestResult(null);
    try {
      const res = await testTenantFocusConnectionAction({
        token: tokenHomo.trim(),
        ambiente: "HOMOLOGACAO",
      });
      setTestResult(res);
    } catch {
      setTestResult({ success: false, message: "Erro de conexão ao testar token." });
    } finally {
      setTestingHomo(false);
    }
  };

  const handleTestProd = async () => {
    if (!tokenProd.trim()) return;
    setTestingProd(true);
    setTestResult(null);
    try {
      const res = await testTenantFocusConnectionAction({
        token: tokenProd.trim(),
        ambiente: "PRODUCAO",
      });
      setTestResult(res);
    } catch {
      setTestResult({ success: false, message: "Erro de conexão ao testar token." });
    } finally {
      setTestingProd(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const res = await updateTenantTokensAdminAction(tenant.id, {
        focusNfeTokenHomologacao: tokenHomo.trim() || null,
        focusNfeTokenProducao: tokenProd.trim() || null,
        focusNfeIdEmpresa: focusId.trim() ? Number(focusId) : null,
        ambiente,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Erro ao atualizar tokens.");
        setSaving(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setErrorMessage("Erro de conexão ao salvar tokens.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Tokens Focus NFe da Oficina</h2>
              <p className="text-xs text-slate-400 font-mono">
                {tenant.razaoSocial} ({tenant.cnpj})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2 border ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Ambiente Fiscal */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Ambiente Fiscal Ativo
            </label>
            <select
              value={ambiente}
              onChange={(e) => setAmbiente(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-ink"
            >
              <option value="HOMOLOGACAO">Homologação (Testes sem valor fiscal)</option>
              <option value="PRODUCAO">Produção (Oficial SEFAZ)</option>
            </select>
          </div>

          {/* Token Homologação */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase text-slate-500">
                Token Focus NFe — Homologação
              </label>
              <button
                type="button"
                onClick={handleTestHomo}
                disabled={testingHomo || !tokenHomo.trim()}
                className="text-[11px] text-amber-700 hover:underline font-semibold cursor-pointer disabled:opacity-40"
              >
                {testingHomo ? "Testando..." : "Testar Token"}
              </button>
            </div>
            <div className="relative">
              <input
                type={showHomo ? "text" : "password"}
                value={tokenHomo}
                onChange={(e) => setTokenHomo(e.target.value)}
                placeholder="Token de homologação"
                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-ink"
              />
              <button
                type="button"
                onClick={() => setShowHomo(!showHomo)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showHomo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Token Produção */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase text-slate-500">
                Token Focus NFe — Produção
              </label>
              <button
                type="button"
                onClick={handleTestProd}
                disabled={testingProd || !tokenProd.trim()}
                className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer disabled:opacity-40"
              >
                {testingProd ? "Testando..." : "Testar Token"}
              </button>
            </div>
            <div className="relative">
              <input
                type={showProd ? "text" : "password"}
                value={tokenProd}
                onChange={(e) => setTokenProd(e.target.value)}
                placeholder="Token de produção"
                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-ink"
              />
              <button
                type="button"
                onClick={() => setShowProd(!showProd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showProd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ID da Empresa na Focus */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              ID da Empresa na Focus NFe (Opcional)
            </label>
            <input
              type="number"
              value={focusId}
              onChange={(e) => setFocusId(e.target.value)}
              placeholder="Ex: 12345"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-ink"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Salvar Tokens</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
