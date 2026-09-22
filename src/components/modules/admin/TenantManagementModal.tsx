"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  Calendar,
  CreditCard,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  Check,
  FileText,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  getTenantFullDetailsAction,
  syncTenantAsaasAction,
  updateTenantManagementAction,
  getTenantInvoicesAdminAction,
  adminDeleteInvoiceAction,
} from "@/actions/admin";
import { testTenantFocusConnectionAction } from "@/actions/tenantConfig";

interface TenantManagementModalProps {
  tenantId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TenantManagementModal({
  tenantId,
  isOpen,
  onClose,
  onSuccess,
}: TenantManagementModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingAsaas, setSyncingAsaas] = useState(false);
  const [testingFocus, setTestingFocus] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Estados dos 4 Grids
  // Grid 1 & 3: Cadastrais e Status
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [emailPrincipal, setEmailPrincipal] = useState("");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [statusConta, setStatusConta] = useState<string>("ATIVO");
  const [ambiente, setAmbiente] = useState<"HOMOLOGACAO" | "PRODUCAO">("HOMOLOGACAO");

  // Grid 2: Financeiro
  const [diaVencimento, setDiaVencimento] = useState<number>(10);
  const [asaasCustomerId, setAsaasCustomerId] = useState<string | null>(null);
  const [asaasSubscriptionId, setAsaasSubscriptionId] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);

  // Grid 4: Plano & Tokens
  const [plano, setPlano] = useState<"PARCERIA" | "FLEX">("PARCERIA");
  const [focusId, setFocusId] = useState("");
  const [tokenProd, setTokenProd] = useState("");
  const [tokenHomo, setTokenHomo] = useState("");
  const [certificadoValidoAte, setCertificadoValidoAte] = useState<string | null>(null);
  const [totalNotas, setTotalNotas] = useState(0);
  const [totalParceiros, setTotalParceiros] = useState(0);

  // Aba ativa e Gestão de Notas
  const [activeTab, setActiveTab] = useState<"DADOS" | "NOTAS">("DADOS");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    setToast(null);
    setTestResult(null);

    try {
      const data = await getTenantFullDetailsAction(tenantId);
      setRazaoSocial(data.razaoSocial || "");
      setNomeFantasia(data.nomeFantasia || "");
      setCnpj(data.cnpj || "");
      setInscricaoEstadual(data.inscricaoEstadual || "");
      setEmailPrincipal(data.emailPrincipal || "");
      setTelefoneContato(data.telefoneContato || "");
      setStatusConta(data.statusConta || "ATIVO");
      setAmbiente(data.ambiente || "HOMOLOGACAO");

      setDiaVencimento(data.diaVencimento || 10);
      setAsaasCustomerId(data.asaasCustomerId || null);
      setAsaasSubscriptionId(data.asaasSubscriptionId || null);
      setPayments(data.payments || []);

      setPlano((data.plano || "PARCERIA") as "PARCERIA" | "FLEX");
      setFocusId(data.focusNfeIdEmpresa ? String(data.focusNfeIdEmpresa) : "");
      setTokenProd(data.focusNfeTokenProducao || "");
      setTokenHomo(data.focusNfeTokenHomologacao || "");
      setCertificadoValidoAte(
        data.certificadoValidoAte ? new Date(data.certificadoValidoAte).toLocaleDateString("pt-BR") : null
      );
      setTotalNotas(data.totalNotas || 0);
      setTotalParceiros(data.totalParceiros || 0);
    } catch (err: any) {
      setToast({ type: "error", msg: err.message || "Erro ao carregar dados da oficina." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tenantId) {
      loadData();
      if (activeTab === "NOTAS") {
        loadTenantInvoices();
      }
    }
  }, [isOpen, tenantId]);

  const loadTenantInvoices = async () => {
    if (!tenantId) return;
    setLoadingInvoices(true);
    try {
      const data = await getTenantInvoicesAdminAction(tenantId);
      setInvoices(data);
    } catch (err: any) {
      setToast({ type: "error", msg: "Erro ao carregar notas fiscais da oficina." });
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleDeleteInvoice = async (inv: any) => {
    if (
      !confirm(
        `Confirma a exclusão definitiva da NF-e Nº ${inv.numero} (Série ${inv.serie})?\n\nEsta ação apagará permanentemente o registro desta nota fiscal.`
      )
    ) {
      return;
    }

    setDeletingInvoiceId(inv.id);
    try {
      const res = await adminDeleteInvoiceAction(inv.id);
      if (res.success) {
        setToast({ type: "success", msg: `NF-e Nº ${inv.numero} excluída com sucesso!` });
        setTotalNotas((prev) => Math.max(0, prev - 1));
        await loadTenantInvoices();
        onSuccess();
      } else {
        setToast({ type: "error", msg: res.error || "Erro ao excluir nota fiscal." });
      }
    } catch (err: any) {
      setToast({ type: "error", msg: err.message || "Erro inesperado ao excluir nota." });
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  if (!isOpen || !tenantId) return null;

  const handleSaveAll = async () => {
    setSaving(true);
    setToast(null);
    try {
      const res = await updateTenantManagementAction(tenantId, {
        razaoSocial,
        nomeFantasia,
        cnpj,
        inscricaoEstadual,
        emailPrincipal,
        telefoneContato,
        diaVencimento: Number(diaVencimento),
        statusConta: statusConta as any,
        ambiente,
        plano,
        focusNfeIdEmpresa: focusId ? Number(focusId) : null,
        focusNfeTokenProducao: tokenProd,
        focusNfeTokenHomologacao: tokenHomo,
      });

      if (res.success) {
        setToast({ type: "success", msg: "Dados atualizados com sucesso!" });
        onSuccess();
      } else {
        setToast({ type: "error", msg: res.error || "Erro ao salvar." });
      }
    } catch (err: any) {
      setToast({ type: "error", msg: err.message || "Erro ao conectar com servidor." });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAsaas = async () => {
    setSyncingAsaas(true);
    setToast(null);
    try {
      const res = await syncTenantAsaasAction(tenantId, Number(diaVencimento));
      if (res.success) {
        setToast({
          type: "success",
          msg: `Assinatura sincronizada no Asaas! Vencimento: todo dia ${diaVencimento} (Próximo: ${res.nextDueDate}).`,
        });
        loadData();
        onSuccess();
      } else {
        setToast({ type: "error", msg: res.error || "Erro ao sincronizar com Asaas." });
      }
    } catch (err: any) {
      setToast({ type: "error", msg: err.message || "Falha na comunicação com gateway." });
    } finally {
      setSyncingAsaas(false);
    }
  };

  const handleTestFocus = async () => {
    const tokenToTest = ambiente === "PRODUCAO" ? tokenProd : tokenHomo;
    if (!tokenToTest.trim()) {
      setTestResult({ success: false, message: `Informe o token de ${ambiente} para testar.` });
      return;
    }

    setTestingFocus(true);
    setTestResult(null);
    try {
      const res = await testTenantFocusConnectionAction({
        token: tokenToTest.trim(),
        ambiente,
      });
      setTestResult(res);
    } catch {
      setTestResult({ success: false, message: "Erro ao testar comunicação com Focus NFe." });
    } finally {
      setTestingFocus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 leading-tight">
                {razaoSocial || "Gestão da Oficina"}
              </h2>
              <p className="text-[11px] text-slate-500 leading-tight">
                CNPJ: {cnpj || "Pendente"} • Gestão Centralizada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {toast && (
              <span
                className={`text-xs px-2.5 py-1 rounded border font-medium ${
                  toast.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                {toast.msg}
              </span>
            )}

            <button
              onClick={onClose}
              type="button"
              className="h-8 w-8 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sub-header com Seletor de Abas */}
        <div className="flex items-center gap-2 px-5 border-b border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={() => setActiveTab("DADOS")}
            className={`inline-flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "DADOS"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Configurações da Oficina</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("NOTAS");
              loadTenantInvoices();
            }}
            className={`inline-flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "NOTAS"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notas Fiscais ({totalNotas})</span>
          </button>
        </div>

        {/* Conteúdo com Abas */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-700" />
            <span>Carregando dados completos da oficina...</span>
          </div>
        ) : activeTab === "NOTAS" ? (
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Gestão de Notas Fiscais da Oficina</h3>
                <p className="text-[11px] text-slate-500">
                  Visualize o histórico de notas e exclua registros rejeitados, cancelados ou inconsistentes.
                </p>
              </div>

              <button
                type="button"
                onClick={loadTenantInvoices}
                disabled={loadingInvoices}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingInvoices ? "animate-spin text-slate-900" : ""}`} />
                <span>Atualizar Lista</span>
              </button>
            </div>

            {loadingInvoices ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
                <span>Carregando notas fiscais da oficina...</span>
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700 text-xs">Nenhuma nota fiscal encontrada</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Esta oficina ainda não possui notas registradas no sistema.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Tipo & NF-e</th>
                        <th className="py-2.5 px-3">Fábrica</th>
                        <th className="py-2.5 px-3">Chave SEFAZ</th>
                        <th className="py-2.5 px-3">Valor</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                            {new Intl.DateTimeFormat("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(inv.dataEmissao))}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-900">
                              NF-e Nº {inv.numero} (Série {inv.serie})
                            </div>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase mt-0.5 ${
                                inv.tipo === "ENTRADA"
                                  ? "bg-blue-100 text-blue-800"
                                  : inv.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {inv.tipo === "ENTRADA"
                                ? "Remessa (5901)"
                                : inv.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO"
                                ? "Cobrança (5124)"
                                : "Retorno (5902)"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-[150px] truncate text-slate-700" title={inv.partner?.razaoSocial}>
                            {inv.partner?.razaoSocial || inv.partner?.nomeFantasia || "Fábrica"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                            {inv.chaveAcesso ? `...${inv.chaveAcesso.slice(-8)}` : "Aguardando"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(Number(inv.valorTotal))}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.status === "AUTORIZADA"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : inv.status === "REJEITADA"
                                  ? "bg-rose-100 text-rose-800"
                                  : inv.status === "CANCELADA"
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(inv)}
                              disabled={deletingInvoiceId === inv.id}
                              title="Excluir Nota Fiscal permanentemente"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {deletingInvoiceId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              <span>Excluir</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* GRID 1: Visão Geral & Fiscal */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
                    <span>Visão Geral & Status Fiscal</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">Controle SEFAZ</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Status da Conta</label>
                    <select
                      value={statusConta}
                      onChange={(e) => setStatusConta(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-medium text-slate-800"
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="EM_ONBOARDING">Em Onboarding</option>
                      <option value="SUSPENSO_PAGAMENTO">Suspenso por Pagamento</option>
                      <option value="SUSPENSO_ADMIN">Suspenso por Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Ambiente Fiscal</label>
                    <select
                      value={ambiente}
                      onChange={(e) => setAmbiente(e.target.value as any)}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-medium text-slate-800"
                    >
                      <option value="HOMOLOGACAO">Homologação (Testes)</option>
                      <option value="PRODUCAO">Produção (Real)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-slate-600">
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-[10px] text-slate-400 block">Certificado A1</span>
                    <span className="font-semibold text-slate-800 text-[11px]">
                      {certificadoValidoAte ? `Até ${certificadoValidoAte}` : "Não instalado"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-[10px] text-slate-400 block">Notas Emitidas</span>
                    <span className="font-semibold text-slate-800 text-[11px]">{totalNotas} notas</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-[10px] text-slate-400 block">Parceiros</span>
                    <span className="font-semibold text-slate-800 text-[11px]">{totalParceiros} ativos</span>
                  </div>
                </div>
              </div>

              {/* GRID 2: Gestão Financeira & Vencimento */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-700" />
                    <span>Gestão Financeira & Vencimento</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">Recorrência Mensal</span>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Dia de Vencimento
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="28"
                        value={diaVencimento}
                        onChange={(e) => setDiaVencimento(Number(e.target.value))}
                        className="w-16 px-2 py-1.5 rounded border border-slate-300 bg-white font-semibold text-slate-900"
                      />
                      <div className="flex gap-1">
                        {[5, 10, 15, 20, 25].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDiaVencimento(d)}
                            className={`px-1.5 py-1 rounded text-[10px] font-medium border cursor-pointer ${
                              diaVencimento === d
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Mensalidade (Asaas)</label>
                    <div className="font-semibold text-slate-900 text-sm">
                      R$ 295,67 <span className="text-[10px] font-normal text-slate-500">(R$ 289,90 + 1,99%)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Identificadores Gateway</span>
                    <span className="font-mono text-[10px] text-slate-600 block">
                      Cliente: {asaasCustomerId || "Não vinculado"}
                    </span>
                    <span className="font-mono text-[10px] text-slate-600 block">
                      Assinatura: {asaasSubscriptionId || "Não vinculada"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncAsaas}
                    disabled={syncingAsaas}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${syncingAsaas ? "animate-spin" : ""}`} />
                    <span>{syncingAsaas ? "Sincronizando..." : "Sincronizar no Asaas"}</span>
                  </button>
                </div>

                {payments.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-medium text-slate-500 block mb-1">
                      Últimas Faturas no Asaas:
                    </span>
                    <div className="space-y-1">
                      {payments.slice(0, 2).map((p: any) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-[10px] p-1.5 bg-slate-50 rounded border border-slate-200/60"
                        >
                          <span>
                            Venc: {p.vencimento} • R$ {Number(p.valor).toFixed(2)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded font-medium ${
                                p.status === "RECEIVED" || p.status === "CONFIRMED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : p.status === "OVERDUE"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {p.status}
                            </span>
                            {p.invoiceUrl && (
                              <a
                                href={p.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 hover:text-slate-900"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* GRID 3: Dados Cadastrais & Contato */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-700" />
                    <span>Dados Cadastrais & Contato</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">Titularidade</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Razão Social</label>
                    <input
                      type="text"
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Nome Fantasia</label>
                      <input
                        type="text"
                        value={nomeFantasia}
                        onChange={(e) => setNomeFantasia(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Inscrição Estadual</label>
                      <input
                        type="text"
                        value={inscricaoEstadual}
                        onChange={(e) => setInscricaoEstadual(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">E-mail Principal</label>
                      <input
                        type="email"
                        value={emailPrincipal}
                        onChange={(e) => setEmailPrincipal(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">WhatsApp / Telefone</label>
                      <input
                        type="text"
                        value={telefoneContato}
                        onChange={(e) => setTelefoneContato(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* GRID 4: Plano Comercial & Tokens Focus */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-slate-700" />
                    <span>Plano Contratual & Tokens Focus</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">Emissão Fiscal</span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Plano Comercial</label>
                  <select
                    value={plano}
                    onChange={(e) => setPlano(e.target.value as "PARCERIA" | "FLEX")}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-semibold text-slate-900"
                  >
                    <option value="PARCERIA">Plano Parceria (24 meses • Setup R$ 0,00)</option>
                    <option value="FLEX">Plano Flex (Sem fidelidade • Setup R$ 490,00)</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Focus ID</label>
                      <input
                        type="text"
                        placeholder="Ex: 1234"
                        value={focusId}
                        onChange={(e) => setFocusId(e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-mono text-slate-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Token Produção</label>
                      <input
                        type="password"
                        placeholder="Token produção..."
                        value={tokenProd}
                        onChange={(e) => setTokenProd(e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-mono text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Token Homologação</label>
                    <input
                      type="password"
                      placeholder="Token homologação..."
                      value={tokenHomo}
                      onChange={(e) => setTokenHomo(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-mono text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleTestFocus}
                      disabled={testingFocus}
                      className="px-2.5 py-1 rounded text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      {testingFocus ? "Testando..." : `Testar Token (${ambiente})`}
                    </button>

                    {testResult && (
                      <span
                        className={`text-[10px] font-medium ${
                          testResult.success ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {testResult.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/70">
          <div className="text-[11px] text-slate-500">
            {activeTab === "DADOS"
              ? "Dica: Altere os dados e clique em Salvar Tudo para persistir as modificações."
              : "Gerenciamento e exclusão administrativa de notas fiscais."}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
            >
              {activeTab === "DADOS" ? "Cancelar" : "Fechar"}
            </button>
            {activeTab === "DADOS" && (
              <button
                onClick={handleSaveAll}
                disabled={saving || loading}
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
