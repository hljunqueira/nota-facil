"use client";

import React, { useState } from "react";
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Save,
  Radio,
  ExternalLink,
  Cpu,
} from "lucide-react";
import {
  updateTenantFiscalTokensAction,
  testTenantFocusConnectionAction,
} from "@/actions/tenantConfig";

interface FiscalIntegrationTabProps {
  tenant: {
    id: string;
    ambiente: "HOMOLOGACAO" | "PRODUCAO";
    focusNfeTokenHomologacao?: string | null;
    focusNfeTokenProducao?: string | null;
    focusNfeIdEmpresa?: number | null;
    certificadoValidoAte?: string | Date | null;
  } | null;
  onSuccess: () => void;
}

export function FiscalIntegrationTab({ tenant, onSuccess }: FiscalIntegrationTabProps) {
  const [ambiente, setAmbiente] = useState<"HOMOLOGACAO" | "PRODUCAO">(
    tenant?.ambiente || "HOMOLOGACAO"
  );
  const [tokenHomologacao, setTokenHomologacao] = useState(
    tenant?.focusNfeTokenHomologacao || ""
  );
  const [tokenProducao, setTokenProducao] = useState(
    tenant?.focusNfeTokenProducao || ""
  );
  const [focusId, setFocusId] = useState(
    tenant?.focusNfeIdEmpresa ? String(tenant.focusNfeIdEmpresa) : ""
  );

  const [showHomoToken, setShowHomoToken] = useState(false);
  const [showProdToken, setShowProdToken] = useState(false);

  const [testingHomo, setTestingHomo] = useState(false);
  const [testingProd, setTestingProd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [testHomoResult, setTestHomoResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [testProdResult, setTestProdResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [generalMessage, setGeneralMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleTestHomo = async () => {
    if (!tokenHomologacao.trim()) {
      setTestHomoResult({
        success: false,
        message: "Informe o token de homologação para testar.",
      });
      return;
    }
    setTestingHomo(true);
    setTestHomoResult(null);
    try {
      const res = await testTenantFocusConnectionAction({
        token: tokenHomologacao.trim(),
        ambiente: "HOMOLOGACAO",
      });
      setTestHomoResult(res);
    } catch {
      setTestHomoResult({
        success: false,
        message: "Erro de conexão ao testar token.",
      });
    } finally {
      setTestingHomo(false);
    }
  };

  const handleTestProd = async () => {
    if (!tokenProducao.trim()) {
      setTestProdResult({
        success: false,
        message: "Informe o token de produção para testar.",
      });
      return;
    }
    setTestingProd(true);
    setTestProdResult(null);
    try {
      const res = await testTenantFocusConnectionAction({
        token: tokenProducao.trim(),
        ambiente: "PRODUCAO",
      });
      setTestProdResult(res);
    } catch {
      setTestProdResult({
        success: false,
        message: "Erro de conexão ao testar token.",
      });
    } finally {
      setTestingProd(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setGeneralMessage(null);

    try {
      const res = await updateTenantFiscalTokensAction({
        focusNfeTokenHomologacao: tokenHomologacao.trim() || null,
        focusNfeTokenProducao: tokenProducao.trim() || null,
        focusNfeIdEmpresa: focusId.trim() ? Number(focusId) : null,
        ambiente,
      });

      if (!res.success) {
        setGeneralMessage({
          type: "error",
          text: res.error || "Erro ao salvar credenciais fiscais.",
        });
        return;
      }

      setGeneralMessage({
        type: "success",
        text: "Credenciais e parâmetros fiscais salvos com sucesso!",
      });
      onSuccess();
    } catch {
      setGeneralMessage({
        type: "error",
        text: "Falha de comunicação ao salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Aviso de Isolamento & Autonomia */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-indigo-950">
              Integração Exclusiva da Sua Confecção na Focus NFe
            </h3>
            <p className="text-[11px] text-indigo-800 mt-0.5 leading-relaxed">
              Cada confecção opera com seus próprios tokens e credenciais fiscais independentes. A emissão de NF-e e o cancelamento na SEFAZ são executados estritamente com as credenciais cadastradas abaixo.
            </p>
          </div>
        </div>
        <a
          href="https://doc.focusnfe.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 transition-all shrink-0"
        >
          <span>Doc Focus NFe</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {generalMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between border ${
            generalMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {generalMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{generalMessage.text}</span>
          </div>
          <button
            onClick={() => setGeneralMessage(null)}
            className="font-bold hover:underline ml-2"
          >
            Fechar
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Seletor de Ambiente Fiscal */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Ambiente Fiscal de Emissão</h2>
              <p className="text-xs text-slate-400">
                Define se as notas emitidas terão valor fiscal oficial ou serão enviadas para homologação (testes)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                ambiente === "HOMOLOGACAO"
                  ? "bg-amber-50/50 border-amber-300 ring-1 ring-amber-300"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
              }`}
            >
              <input
                type="radio"
                name="ambienteFiscal"
                value="HOMOLOGACAO"
                checked={ambiente === "HOMOLOGACAO"}
                onChange={() => setAmbiente("HOMOLOGACAO")}
                className="mt-1 text-primary focus:ring-primary"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-amber-900">Homologação (Testes)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    SEFAZ Teste
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Recomendado para treinar equipe e testar retornos de industrialização sem efeito fiscal.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                ambiente === "PRODUCAO"
                  ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
              }`}
            >
              <input
                type="radio"
                name="ambienteFiscal"
                value="PRODUCAO"
                checked={ambiente === "PRODUCAO"}
                onChange={() => setAmbiente("PRODUCAO")}
                className="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-emerald-950">Produção (Oficial)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Oficial SEFAZ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Notas com valor contábil e fiscal oficial autorizado pela Secretaria da Fazenda.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Tokens da Focus NFe */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Token Homologação */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-ink">Token de Homologação</h2>
                  <p className="text-xs text-slate-400">Ambiente de testes da Focus NFe</p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  tokenHomologacao
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {tokenHomologacao ? "Configurado" : "Pendente"}
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase text-slate-500">
                Token Focus NFe (Homologação)
              </label>
              <div className="relative">
                <input
                  type={showHomoToken ? "text" : "password"}
                  value={tokenHomologacao}
                  onChange={(e) => setTokenHomologacao(e.target.value)}
                  placeholder="Ex: z0YGKmkRLmkZLQt..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowHomoToken(!showHomoToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showHomoToken ? "Ocultar token" : "Exibir token"}
                >
                  {showHomoToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {testHomoResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  testHomoResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {testHomoResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{testHomoResult.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleTestHomo}
              disabled={testingHomo || !tokenHomologacao.trim()}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {testingHomo ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>{testingHomo ? "Testando conexão..." : "Testar Token Homologação"}</span>
            </button>
          </div>

          {/* Card Token Produção */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-ink">Token de Produção</h2>
                  <p className="text-xs text-slate-400">Emissão oficial SEFAZ</p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  tokenProducao
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {tokenProducao ? "Configurado" : "Pendente"}
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase text-slate-500">
                Token Focus NFe (Produção)
              </label>
              <div className="relative">
                <input
                  type={showProdToken ? "text" : "password"}
                  value={tokenProducao}
                  onChange={(e) => setTokenProducao(e.target.value)}
                  placeholder="Ex: HokM4RIK8PqGFyz..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowProdToken(!showProdToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showProdToken ? "Ocultar token" : "Exibir token"}
                >
                  {showProdToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {testProdResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  testProdResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {testProdResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{testProdResult.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleTestProd}
              disabled={testingProd || !tokenProducao.trim()}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {testingProd ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{testingProd ? "Testando conexão..." : "Testar Token Produção"}</span>
            </button>
          </div>
        </div>

        {/* Informações Complementares: ID Focus & Certificado A1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Dados da Empresa na Focus & Certificado Digital</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                ID da Empresa na Focus NFe (Opcional)
              </label>
              <input
                type="number"
                value={focusId}
                onChange={(e) => setFocusId(e.target.value)}
                placeholder="Ex: 12345"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Número de identificação da empresa na Focus NFe gerado após o cadastro da subconta.
              </p>
            </div>

            <div>
              <span className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Certificado Digital A1
              </span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-ink">
                  {tenant?.certificadoValidoAte ? (
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Válido até{" "}
                      {new Date(tenant.certificadoValidoAte).toLocaleDateString("pt-BR")}
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Pendente de instalação do arquivo .pfx
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  O certificado A1 é transmitido via TLS diretamente para a Focus NFe sem armazenamento em banco ou disco.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar Configurações Fiscais</span>
          </button>
        </div>
      </form>
    </div>
  );
}
