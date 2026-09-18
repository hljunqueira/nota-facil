"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import {
  getTenantConfigAction,
  saveNotificationRecipientAction,
  applyDefaultCfopRulesAction,
  updateInvoiceSequenceAction,
  completeOnboardingAction,
} from "@/actions/tenantConfig";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados do Tenant
  const [tenant, setTenant] = useState<any | null>(null);

  // Passo 1: Contador
  const [contadorNome, setContadorNome] = useState("");
  const [contadorEmail, setContadorEmail] = useState("");
  const [contadorTelefone, setContadorTelefone] = useState("");

  // Passo 2: Regras CFOP
  const [cfopRules, setCfopRules] = useState<any[]>([]);
  const [presetsApplied, setPresetsApplied] = useState(false);

  // Passo 3: Numeração Fiscal
  const [serieNfe, setSerieNfe] = useState(1);
  const [proximoNumero, setProximoNumero] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getTenantConfigAction();
        setTenant(data.tenant);
        setCfopRules(data.cfopRules);

        if (data.tenant) {
          setSerieNfe(data.tenant.serieNfe || 1);
          setProximoNumero(data.tenant.proximoNumero || 1);
        }

        // Se já existe contador cadastrado
        const existingContador = data.recipients.find(
          (r: any) => r.tipo === "CONTADOR"
        );
        if (existingContador) {
          setContadorNome(existingContador.nome);
          setContadorEmail(existingContador.email || "");
          setContadorTelefone(existingContador.telefone || "");
        }

        if (data.cfopRules.length > 0) {
          setPresetsApplied(true);
        }
      } catch (err) {
        console.error("Erro ao carregar onboarding:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSaveStep1 = async () => {
    if (!contadorNome.trim() || !contadorEmail.trim()) {
      setError("Informe o nome e o e-mail do seu escritório de contabilidade.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await saveNotificationRecipientAction({
        nome: contadorNome.trim(),
        tipo: "CONTADOR",
        canal: "EMAIL",
        email: contadorEmail.trim(),
        telefone: contadorTelefone.trim() || undefined,
        ativo: true,
      });

      if (!res.success) {
        setError(res.error || "Erro ao salvar contador.");
        setSubmitting(false);
        return;
      }

      setStep(2);
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyPresets = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await applyDefaultCfopRulesAction();
      if (res.success) {
        setPresetsApplied(true);
        const data = await getTenantConfigAction();
        setCfopRules(data.cfopRules);
      } else {
        setError(res.error || "Erro ao aplicar presets de CFOP.");
      }
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishOnboarding = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Salva série e numeração
      await updateInvoiceSequenceAction({
        serieNfe: Number(serieNfe),
        proximoNumero: Number(proximoNumero),
      });

      // Conclui onboarding
      await completeOnboardingAction();

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro ao concluir configuração.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header Onboarding */}
      <div className="text-center mb-8">
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
          Configuração Inicial
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mt-3">
          Bem-vindo ao Nota Fácil!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Complete estes 3 passos simples para começar a emitir e inverter notas fiscais de retorno
        </p>
      </div>

      {/* Stepper Indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[
          { num: 1, label: "Contabilidade" },
          { num: 2, label: "Regras CFOP" },
          { num: 3, label: "Série Fiscal" },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  step === s.num
                    ? "bg-primary text-white ring-4 ring-primary/20"
                    : step > s.num
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
              </div>
              <span className="text-[11px] font-semibold text-slate-600 mt-1">
                {s.label}
              </span>
            </div>
            {idx < 2 && (
              <div
                className={`flex-1 h-0.5 mx-2 -mt-4 transition-colors ${
                  step > s.num ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Card do Passo */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        {/* PASSO 1: CONTABILIDADE */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-ink">
                Passo 1: Dados do Contador da Oficina
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                No final de cada mês, nosso sistema envia automaticamente o arquivo compactado (.zip) com todos os XMLs e PDFs emitidos para este endereço.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Nome do Contador ou Escritório *
                </label>
                <input
                  type="text"
                  required
                  value={contadorNome}
                  onChange={(e) => setContadorNome(e.target.value)}
                  placeholder="Ex: Contabilidade Central Ltda"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  E-mail do Contador (Recebimento do Fechamento Mensal) *
                </label>
                <input
                  type="email"
                  required
                  value={contadorEmail}
                  onChange={(e) => setContadorEmail(e.target.value)}
                  placeholder="fiscal@contabilidade.com.br"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  WhatsApp do Contador (Opcional)
                </label>
                <input
                  type="text"
                  value={contadorTelefone}
                  onChange={(e) => setContadorTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveStep1}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white bg-primary hover:bg-primaryDark text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Avançar para Regras Fiscais</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: REGRAS FISCAIS DE CFOP */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-ink">
                Passo 2: Regras Fiscais de Inversão (CFOP)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Define como o sistema converte automaticamente a nota de remessa da fábrica em nota de retorno.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Preset Padrão da Confecção
                  </h3>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Entrada <strong>5.901</strong> (Remessa para Industrialização) ➔ Saída <strong>5.902</strong> (Retorno de Insumo) + opção de mão de obra (5.124).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApplyPresets}
                  disabled={submitting || presetsApplied}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    presetsApplied
                      ? "bg-emerald-200 text-emerald-900 cursor-default"
                      : "bg-primary hover:bg-primaryDark text-white shadow-xs cursor-pointer"
                  }`}
                >
                  {presetsApplied ? "Regra Ativada ✓" : "Ativar Preset"}
                </button>
              </div>
            </div>

            {/* Listagem de regras salvas */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Regras Ativas no Sistema:
              </h4>
              {cfopRules.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Nenhuma regra ativa. Clique em "Ativar Preset" acima para configurar automaticamente.
                </p>
              ) : (
                cfopRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-ink">
                        CFOP {rule.cfopEntrada} ➔ CFOP {rule.cfopSaidaCorrespondente}
                      </span>
                      <p className="text-[11px] text-slate-500">{rule.finalidadeGerada}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Ativa
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white bg-primary hover:bg-primaryDark text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span>Avançar para Série Fiscal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: SÉRIE E NÚMERO FISCAL */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-ink">
                Passo 3: Parâmetros de Emissão de NF-e
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina a série e o número sequencial da próxima nota a ser emitida pela sua empresa na SEFAZ.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Série da NF-e *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={serieNfe}
                  onChange={(e) => setSerieNfe(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-[11px] text-slate-400 mt-1">Padrão para a maioria das empresas: 1</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Próximo Número da NF-e *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={proximoNumero}
                  onChange={(e) => setProximoNumero(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Se você já emitiu notas antes, informe o próximo número da sequência SEFAZ.
                </p>
              </div>
            </div>

            {/* Status do Certificado A1 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-bold text-ink">Certificado Digital A1</p>
                  <p className="text-[11px] text-slate-500">
                    {tenant?.certificadoValidoAte
                      ? `Conectado à SEFAZ (Válido até ${new Date(tenant.certificadoValidoAte).toLocaleDateString("pt-BR")})`
                      : "Em processo de homologação pela equipe Nota Fácil"}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Focus NFe API
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white bg-primary hover:bg-primaryDark text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Concluir e Acessar Meu Painel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
