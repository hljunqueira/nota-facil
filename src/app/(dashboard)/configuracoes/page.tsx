"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  FileText,
  ShieldCheck,
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Save,
  Send,
  CalendarCheck2,
  MessageCircle,
  Lock,
} from "lucide-react";
import { WhatsAppConnectionTab } from "@/components/modules/settings/WhatsAppConnectionTab";
import { MonthlyCloseTab } from "@/components/modules/settings/MonthlyCloseTab";
import { FiscalReadinessChecklist } from "@/components/modules/settings/FiscalReadinessChecklist";
import {
  getTenantConfigAction,
  saveNotificationRecipientAction,
  deleteNotificationRecipientAction,
  saveCfopRuleAction,
  applyDefaultCfopRulesAction,
  deleteCfopRuleAction,
  updateInvoiceSequenceAction,
  updateTenantCompanyDataAction,
} from "@/actions/tenantConfig";

type TabId = "empresa" | "cfop" | "fiscal" | "contatos" | "fechamento" | "whatsapp";

function ConfiguracoesContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") as TabId;
  const validTabs: TabId[] = ["empresa", "cfop", "fiscal", "contatos", "fechamento", "whatsapp"];
  const initialTab: TabId = validTabs.includes(rawTab) ? rawTab : "empresa";

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [cfopRules, setCfopRules] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formulário de dados cadastrais da empresa
  const [companyForm, setCompanyForm] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    inscricaoEstadual: "",
    emailPrincipal: "",
    telefoneContato: "",
    chavePix: "",
    dadosBancarios: "",
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // Formulário de novo destinatário
  const [newRecipient, setNewRecipient] = useState({
    nome: "",
    tipo: "CONTADOR" as "CONTADOR" | "PARCEIRO" | "INTERNO_ALERTA",
    canal: "EMAIL" as "EMAIL" | "WHATSAPP",
    email: "",
    telefone: "",
  });
  const [savingRecipient, setSavingRecipient] = useState(false);

  // Formulário de nova regra CFOP
  const [newCfop, setNewCfop] = useState({
    cfopEntrada: "",
    cfopSaidaCorrespondente: "",
    finalidadeGerada: "Retorno de mercadoria recebida para industrialização",
  });
  const [savingCfop, setSavingCfop] = useState(false);

  // Parâmetros fiscais
  const [serieNfe, setSerieNfe] = useState(1);
  const [proximoNumero, setProximoNumero] = useState(1);
  const [savingFiscal, setSavingFiscal] = useState(false);

  // Sincronizar tab pela URL caso o usuário navegue ou redirecione
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabId;
    if (tabParam && ["empresa", "cfop", "fiscal", "contatos", "fechamento", "whatsapp"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTenantConfigAction();
      setTenant(data.tenant);
      setRecipients(data.recipients);
      setCfopRules(data.cfopRules);

      if (data.tenant) {
        setSerieNfe(data.tenant.serieNfe || 1);
        setProximoNumero(data.tenant.proximoNumero || 1);
        setCompanyForm({
          razaoSocial: data.tenant.razaoSocial || "",
          nomeFantasia: data.tenant.nomeFantasia || "",
          cnpj: data.tenant.cnpj || "",
          inscricaoEstadual: data.tenant.inscricaoEstadual || "",
          emailPrincipal: data.tenant.emailPrincipal || "",
          telefoneContato: data.tenant.telefoneContato || "",
          chavePix: data.tenant.chavePix || "",
          dadosBancarios: data.tenant.dadosBancarios || "",
        });
      }
    } catch (err) {
      console.error("Erro ao carregar configurações:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    setErrorMessage(null);

    try {
      const res = await updateTenantCompanyDataAction({
        razaoSocial: companyForm.razaoSocial,
        nomeFantasia: companyForm.nomeFantasia,
        inscricaoEstadual: companyForm.inscricaoEstadual,
        emailPrincipal: companyForm.emailPrincipal,
        telefoneContato: companyForm.telefoneContato,
        chavePix: companyForm.chavePix,
        dadosBancarios: companyForm.dadosBancarios,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Erro ao salvar dados da empresa.");
        setSavingCompany(false);
        return;
      }

      setToastMessage("Dados da empresa atualizados com sucesso!");
      loadData();
    } catch {
      setErrorMessage("Erro de conexão ao salvar dados da empresa.");
    } finally {
      setSavingCompany(false);
    }
  };

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRecipient(true);
    setErrorMessage(null);

    try {
      const res = await saveNotificationRecipientAction({
        ...newRecipient,
        ativo: true,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Erro ao salvar contato.");
        setSavingRecipient(false);
        return;
      }

      setToastMessage("Destinatário adicionado com sucesso!");
      setNewRecipient({
        nome: "",
        tipo: "CONTADOR",
        canal: "EMAIL",
        email: "",
        telefone: "",
      });
      loadData();
    } catch {
      setErrorMessage("Erro de conexão.");
    } finally {
      setSavingRecipient(false);
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    try {
      await deleteNotificationRecipientAction(id);
      setToastMessage("Destinatário removido.");
      loadData();
    } catch {
      setErrorMessage("Erro ao excluir contato.");
    }
  };

  const handleAddCfop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCfop(true);
    setErrorMessage(null);

    try {
      const res = await saveCfopRuleAction({
        cfopEntrada: newCfop.cfopEntrada.replace(/\D/g, ""),
        cfopSaidaCorrespondente: newCfop.cfopSaidaCorrespondente.replace(/\D/g, ""),
        finalidadeGerada: newCfop.finalidadeGerada,
        ativo: true,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Erro ao salvar regra.");
        setSavingCfop(false);
        return;
      }

      setToastMessage("Regra de CFOP gravada!");
      setNewCfop({
        cfopEntrada: "",
        cfopSaidaCorrespondente: "",
        finalidadeGerada: "Retorno de mercadoria recebida para industrialização",
      });
      loadData();
    } catch {
      setErrorMessage("Erro de conexão.");
    } finally {
      setSavingCfop(false);
    }
  };

  const handleApplyPresets = async () => {
    try {
      const res = await applyDefaultCfopRulesAction();
      if (res.success) {
        setToastMessage("Presets da indústria têxtil aplicados!");
        loadData();
      }
    } catch {
      setErrorMessage("Erro ao aplicar presets.");
    }
  };

  const handleDeleteCfop = async (id: string) => {
    try {
      await deleteCfopRuleAction(id);
      setToastMessage("Regra de CFOP removida.");
      loadData();
    } catch {
      setErrorMessage("Erro ao excluir regra.");
    }
  };

  const handleSaveFiscal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFiscal(true);
    setErrorMessage(null);

    try {
      const res = await updateInvoiceSequenceAction({
        serieNfe: Number(serieNfe),
        proximoNumero: Number(proximoNumero),
      });

      if (!res.success) {
        setErrorMessage(res.error || "Erro ao salvar parâmetros fiscais.");
        setSavingFiscal(false);
        return;
      }

      setToastMessage("Parâmetros fiscais de NF-e salvos com sucesso!");
      loadData();
    } catch {
      setErrorMessage("Erro de conexão.");
    } finally {
      setSavingFiscal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Configurações da Oficina
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestão de contatos, WhatsApp da oficina, fechamento contábil e dados da empresa
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-700 font-bold hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 gap-1 shadow-xs overflow-x-auto">
        {[
          { id: "empresa", label: "Dados da Empresa", icon: Building2 },
          { id: "cfop", label: "Regras de CFOP", icon: FileText },
          { id: "fiscal", label: "Parâmetros Fiscais", icon: ShieldCheck },
          { id: "contatos", label: "Destinatários & Contador", icon: Mail },
          { id: "fechamento", label: "Enviar ao Contador", icon: Send },
          { id: "whatsapp", label: "Conexão WhatsApp", icon: MessageCircle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-xs font-bold"
                : "text-slate-600 hover:bg-slate-100 hover:text-ink"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB: FECHAMENTO MENSAL */}
      {activeTab === "fechamento" && (
        <MonthlyCloseTab />
      )}

      {/* TAB: CONEXÃO WHATSAPP */}
      {activeTab === "whatsapp" && (
        <WhatsAppConnectionTab tenantPhone={tenant?.telefoneContato || ""} />
      )}

      {/* TAB: DADOS DA EMPRESA (EDITÁVEIS) */}
      {activeTab === "empresa" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Dados Cadastrais da Oficina</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Atualize as informações que aparecem nas suas notas fiscais e relatórios. O CNPJ é protegido fiscalmente.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={companyForm.razaoSocial}
                  onChange={(e) => setCompanyForm({ ...companyForm, razaoSocial: e.target.value })}
                  placeholder="Nome empresarial conforme cartão CNPJ"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink focus:bg-white focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={companyForm.nomeFantasia}
                  onChange={(e) => setCompanyForm({ ...companyForm, nomeFantasia: e.target.value })}
                  placeholder="Nome comercial da sua confecção"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink focus:bg-white focus:border-primary transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    CNPJ (Chave Fiscal Primária)
                  </label>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Bloqueado
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={companyForm.cnpj}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Para alterar o CNPJ emissor, entre em contato com o suporte técnico.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inscrição Estadual (IE) *
                </label>
                <input
                  type="text"
                  required
                  value={companyForm.inscricaoEstadual}
                  onChange={(e) => setCompanyForm({ ...companyForm, inscricaoEstadual: e.target.value })}
                  placeholder="Ex: 254.123.456 ou ISENTO"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink font-mono focus:bg-white focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail Principal da Empresa *
                </label>
                <input
                  type="email"
                  required
                  value={companyForm.emailPrincipal}
                  onChange={(e) => setCompanyForm({ ...companyForm, emailPrincipal: e.target.value })}
                  placeholder="contato@minhaoficina.com.br"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink focus:bg-white focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone / WhatsApp de Contato *
                </label>
                <input
                  type="text"
                  required
                  value={companyForm.telefoneContato}
                  onChange={(e) => setCompanyForm({ ...companyForm, telefoneContato: e.target.value })}
                  placeholder="(48) 9185-2757"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink focus:bg-white focus:border-primary transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Número utilizado para as comunicações e faturas do sistema.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chave Pix para Recebimento (Oficina)
                </label>
                <input
                  type="text"
                  value={companyForm.chavePix}
                  onChange={(e) => setCompanyForm({ ...companyForm, chavePix: e.target.value })}
                  placeholder="CNPJ, Celular, E-mail ou Chave Aleatória"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink font-mono focus:bg-white focus:border-primary transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Exibida nas notificações de NF-e 5.124 enviadas ao financeiro da fábrica.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dados Bancários para Depósito (Opcional)
                </label>
                <input
                  type="text"
                  value={companyForm.dadosBancarios}
                  onChange={(e) => setCompanyForm({ ...companyForm, dadosBancarios: e.target.value })}
                  placeholder="Banco 001 - Ag: 1234-5 - Conta: 67890-1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink focus:bg-white focus:border-primary transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Alternativa para fábricas parceiras que realizam TED ou DOC.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingCompany}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {savingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salvar Alterações da Empresa</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: DESTINATÁRIOS */}
      {activeTab === "contatos" && (
        <div className="space-y-6">
          {/* Form de adicionar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              <span>Adicionar Destinatário de Notas</span>
            </h2>

            <form onSubmit={handleAddRecipient} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Nome / Razão *
                </label>
                <input
                  type="text"
                  required
                  value={newRecipient.nome}
                  onChange={(e) => setNewRecipient({ ...newRecipient, nome: e.target.value })}
                  placeholder="Ex: Contador João"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Tipo *
                </label>
                <select
                  value={newRecipient.tipo}
                  onChange={(e) => setNewRecipient({ ...newRecipient, tipo: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink"
                >
                  <option value="CONTADOR">Contador (Fechamento Mensal)</option>
                  <option value="PARCEIRO">Fábrica Parceira</option>
                  <option value="INTERNO_ALERTA">Alerta Interno</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                  placeholder="fiscal@empresa.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  WhatsApp (com DDD)
                </label>
                <input
                  type="text"
                  value={newRecipient.telefone}
                  onChange={(e) => setNewRecipient({ ...newRecipient, telefone: e.target.value })}
                  placeholder="(47) 99999-9999"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={savingRecipient}
                  className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primaryDark text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingRecipient ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Adicionar</span>
                </button>
              </div>
            </form>
          </div>

          {/* Tabela de Destinatários */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs text-ink">
              Destinatários Cadastrados ({recipients.length})
            </div>
            {recipients.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">
                Nenhum destinatário cadastrado ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nome</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">Telefone</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recipients.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-semibold text-ink">{r.nome}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {r.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{r.email || "-"}</td>
                        <td className="py-3 px-4 text-slate-600">{r.telefone || "-"}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRecipient(r.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: REGRAS DE CFOP */}
      {activeTab === "cfop" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Presets Fiscais de Confecção
              </h3>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Aplica automaticamente as regras para <strong>5.901 ➔ 5.902</strong> e <strong>6.901 ➔ 6.902</strong>.
              </p>
            </div>
            <button
              onClick={handleApplyPresets}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              Aplicar Presets Padrão
            </button>
          </div>

          {/* Form de adicionar CFOP */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              <span>Nova Regra de Conversão de CFOP</span>
            </h2>

            <form onSubmit={handleAddCfop} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  CFOP de Entrada *
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={newCfop.cfopEntrada}
                  onChange={(e) => setNewCfop({ ...newCfop, cfopEntrada: e.target.value })}
                  placeholder="Ex: 5901"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  CFOP de Saída *
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={newCfop.cfopSaidaCorrespondente}
                  onChange={(e) => setNewCfop({ ...newCfop, cfopSaidaCorrespondente: e.target.value })}
                  placeholder="Ex: 5902"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Finalidade da Operação
                </label>
                <input
                  type="text"
                  required
                  value={newCfop.finalidadeGerada}
                  onChange={(e) => setNewCfop({ ...newCfop, finalidadeGerada: e.target.value })}
                  placeholder="Ex: Retorno de Industrializacao"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={savingCfop}
                  className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primaryDark text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingCfop ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Salvar Regra</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de CFOPs */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs text-ink">
              Regras Ativas ({cfopRules.length})
            </div>
            {cfopRules.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">
                Nenhuma regra cadastrada.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {cfopRules.map((r) => (
                  <div key={r.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-ink">
                        CFOP {r.cfopEntrada} ➔ CFOP {r.cfopSaidaCorrespondente}
                      </span>
                      <p className="text-[11px] text-slate-500">{r.finalidadeGerada}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteCfop(r.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Remover regra"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PARÂMETROS FISCAIS */}
      {activeTab === "fiscal" && (
        <div className="space-y-6">
          <FiscalReadinessChecklist tenant={tenant} />

          <form onSubmit={handleSaveFiscal} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Numeração e Série de NF-e na SEFAZ</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Série da NF-e *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={serieNfe}
                  onChange={(e) => setSerieNfe(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Próximo Número da NF-e *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={proximoNumero}
                  onChange={(e) => setProximoNumero(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={savingFiscal}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {savingFiscal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salvar Numeração</span>
              </button>
            </div>
          </form>

          {/* Certificado e Ambiente */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-ink">Status da Emissão SEFAZ</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Ambiente Fiscal</span>
                <p className="font-bold text-ink mt-0.5">{tenant?.ambiente || "HOMOLOGACAO"}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Certificado Digital A1</span>
                <p className="font-bold text-emerald-700 mt-0.5">
                  {tenant?.certificadoValidoAte
                    ? `Válido até ${new Date(tenant.certificadoValidoAte).toLocaleDateString("pt-BR")}`
                    : "Pendente de instalação pelo Administrador"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ConfiguracoesContent />
    </Suspense>
  );
}
