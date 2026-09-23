"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  RefreshCw,
  Upload,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  FileX,
  MessageCircle,
  Inbox,
  Layers,
  X,
  Radio,
  Calendar,
  DollarSign,
  Mail,
  Truck,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
  getInvoicesAction,
  getInversionPreviewAction,
  getBatchInversionPreviewAction,
  checkInvoiceStatusAction,
  syncPendingInvoicesAction,
  deleteInvoiceAction,
} from "@/actions/invoices";
import { InversionPreviewDialog } from "@/components/modules/invoices/InversionPreviewDialog";
import { ImportXmlModal } from "@/components/modules/invoices/ImportXmlModal";
import { ImportEspelhoModal } from "@/components/modules/invoices/ImportEspelhoModal";
import { MonthlyCloseModal } from "@/components/modules/invoices/MonthlyCloseModal";
import { CancelInvoiceModal } from "@/components/modules/invoices/CancelInvoiceModal";
import { SendInvoiceEmailModal } from "@/components/modules/invoices/SendInvoiceEmailModal";
import { RomaneioModal } from "@/components/modules/invoices/RomaneioModal";
import { DeleteInvoiceModal } from "@/components/modules/invoices/DeleteInvoiceModal";
import { InversionPreparationResult } from "@/lib/services/inversion";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

type TabType = "ALL" | "ENTRADA" | "SAIDA" | "PENDENTE";

export default function NotasPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fechamento Mensal Contador
  const [showMonthlyCloseModal, setShowMonthlyCloseModal] = useState(false);

  // Cancelamento de NF-e
  const [selectedInvoiceForCancel, setSelectedInvoiceForCancel] = useState<any | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [statusCheckingId, setStatusCheckingId] = useState<string | null>(null);

  // Exclusão de NF-e (Rejeitadas, Canceladas, Pendentes ou Entradas)
  const [selectedInvoiceForDelete, setSelectedInvoiceForDelete] = useState<any | null>(null);

  // Envio por E-mail
  const { data: session } = useSession();
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<any | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Romaneio de Entrega Física
  const [selectedInvoiceForRomaneio, setSelectedInvoiceForRomaneio] = useState<any | null>(null);
  const [showRomaneioModal, setShowRomaneioModal] = useState(false);

  // Espelho de Produção / Cobrança
  const [showEspelhoModal, setShowEspelhoModal] = useState(false);
  const [selectedInvoiceForEspelho, setSelectedInvoiceForEspelho] = useState<any | null>(null);

  // Inversão
  const [inversionLoadingId, setInversionLoadingId] = useState<string | null>(null);
  const [inversionData, setInversionData] = useState<InversionPreparationResult | null>(null);
  const [showInversionModal, setShowInversionModal] = useState(false);

  // Seleção Múltipla para Agrupamento de Remessas (5902 em Lote)
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [batchInversionLoading, setBatchInversionLoading] = useState(false);

  // Importação
  const [showImportModal, setShowImportModal] = useState(false);

  const loadInvoices = async (isSilent = false, syncSefaz = false) => {
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);

    try {
      // Sincroniza qualquer nota pendente diretamente com a SEFAZ se solicitado
      if (syncSefaz) {
        const syncRes = await syncPendingInvoicesAction();
        if (syncRes.updatedCount > 0) {
          setToastMessage(`${syncRes.updatedCount} nota(s) atualizada(s) com sucesso na SEFAZ!`);
        }
      }

      // Busca todas as notas para permitir filtragem e abas instantâneas em memória
      const data = await getInvoicesAction();
      setInvoices(data);
      setLastSync(new Date());
    } catch (err) {
      console.error("Erro ao carregar notas:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Carregamento inicial: busca notas e sincroniza qualquer pendência na SEFAZ
  useEffect(() => {
    loadInvoices(false, true);
  }, []);

  // Polling / Auto-refresh inteligente:
  // Se houver alguma nota PENDENTE, faz polling e consulta a SEFAZ a cada 8s. Caso contrário, a cada 25s.
  useEffect(() => {
    const hasPending = invoices.some((i) => i.status === "PENDENTE");
    const intervalMs = hasPending ? 8000 : 25000;

    const interval = setInterval(() => {
      loadInvoices(true, hasPending);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [invoices]);

  // Contagens para as Abas
  const counts = useMemo(() => {
    const total = invoices.length;
    const entradas = invoices.filter((i) => i.tipo === "ENTRADA").length;
    const saidas = invoices.filter((i) => i.tipo === "SAIDA").length;
    const pendentes = invoices.filter((i) => i.status === "PENDENTE").length;
    return { total, entradas, saidas, pendentes };
  }, [invoices]);

  // Filtragem Reativa Instantânea (Query + Aba + Status)
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Filtro por Aba
      if (activeTab === "ENTRADA" && inv.tipo !== "ENTRADA") return false;
      if (activeTab === "SAIDA" && inv.tipo !== "SAIDA") return false;
      if (activeTab === "PENDENTE" && inv.status !== "PENDENTE") return false;

      // Filtro por Status Secundário
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;

      // Filtro por Busca / Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const numStr = String(inv.numero || "");
        const chaveStr = (inv.chaveAcesso || "").toLowerCase();
        const partnerStr = (inv.partner?.razaoSocial || "").toLowerCase();
        const cnpjStr = (inv.partner?.cnpj || "").replace(/\D/g, "");

        const matches =
          numStr.includes(q) ||
          chaveStr.includes(q) ||
          partnerStr.includes(q) ||
          cnpjStr.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [invoices, activeTab, statusFilter, searchQuery]);

  const handleStartInversion = async (invoiceId: string) => {
    setInversionLoadingId(invoiceId);
    try {
      const res = await getInversionPreviewAction(invoiceId);
      if (!res.success || !res.data) {
        alert(res.error || "Erro ao preparar prévia de inversão.");
        return;
      }

      setInversionData(res.data);
      setShowInversionModal(true);
    } catch {
      alert("Erro ao buscar dados fiscais da nota.");
    } finally {
      setInversionLoadingId(null);
    }
  };

  const handleToggleSelectEntry = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEntries = () => {
    const visibleEntradaIds = filteredInvoices
      .filter((inv) => inv.tipo === "ENTRADA")
      .map((inv) => inv.id);

    if (visibleEntradaIds.length === 0) return;

    const allSelected = visibleEntradaIds.every((id) => selectedEntryIds.includes(id));
    if (allSelected) {
      setSelectedEntryIds((prev) => prev.filter((id) => !visibleEntradaIds.includes(id)));
    } else {
      setSelectedEntryIds((prev) => Array.from(new Set([...prev, ...visibleEntradaIds])));
    }
  };

  const handleStartBatchInversion = async () => {
    if (selectedEntryIds.length < 2) {
      alert("Selecione pelo menos duas notas de remessa para agrupar o retorno.");
      return;
    }

    const selectedInvoices = invoices.filter((i) => selectedEntryIds.includes(i.id));
    const partnerIds = new Set(selectedInvoices.map((i) => i.partnerId).filter(Boolean));
    if (partnerIds.size > 1) {
      alert("Todas as notas selecionadas para retorno agrupado devem pertencer à mesma fábrica/cliente.");
      return;
    }

    setBatchInversionLoading(true);
    try {
      const res = await getBatchInversionPreviewAction(selectedEntryIds);
      if (!res.success || !res.data) {
        alert(res.error || "Erro ao preparar retorno agrupado.");
        return;
      }

      setInversionData(res.data);
      setShowInversionModal(true);
    } catch {
      alert("Falha ao comunicar com o servidor para agrupar remessas.");
    } finally {
      setBatchInversionLoading(false);
    }
  };

  const selectedEntriesSummary = useMemo(() => {
    const selected = invoices.filter((i) => selectedEntryIds.includes(i.id));
    const totalVal = selected.reduce((acc, curr) => acc + Number(curr.valorTotal || 0), 0);
    return {
      count: selected.length,
      totalValor: totalVal,
    };
  }, [invoices, selectedEntryIds]);

  const handleCheckStatus = async (invoiceId: string) => {
    setStatusCheckingId(invoiceId);
    try {
      const res = await checkInvoiceStatusAction(invoiceId);
      if (res.success) {
        setToastMessage(res.message);
        loadInvoices(true);
      } else {
        alert(res.error || "Erro ao consultar status na SEFAZ.");
      }
    } catch {
      alert("Falha ao comunicar com a SEFAZ.");
    } finally {
      setStatusCheckingId(null);
    }
  };

  const handleOpenCancel = (inv: any) => {
    setSelectedInvoiceForCancel({
      id: inv.id,
      numero: inv.numero,
      serie: inv.serie,
      chaveAcesso: inv.chaveAcesso,
      valorTotal: Number(inv.valorTotal),
      partnerNome: inv.partner?.razaoSocial,
    });
    setShowCancelModal(true);
  };

  const handleShareInvoice = (inv: any) => {
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(inv.valorTotal));

    const partnerName = inv.partner?.razaoSocial || "Parceiro";
    const shareText =
      `*Nota Fácil — NF-e Nº ${inv.numero} (Série ${inv.serie})*\n` +
      `📄 *Destinatário/Emissor:* ${partnerName}\n` +
      `💰 *Valor Total:* ${formattedValue}\n` +
      `🔑 *Chave SEFAZ:* ${inv.chaveAcesso || "Aguardando homologação"}\n` +
      (inv.pdfUrl ? `📥 *DANFE (PDF):* ${inv.pdfUrl}\n` : "") +
      (inv.xmlUrl ? `📁 *XML SEFAZ:* ${inv.xmlUrl}\n` : "");

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `NF-e Nº ${inv.numero} - ${partnerName}`,
          text: shareText,
          url: inv.pdfUrl || window.location.href,
        })
        .catch(() => {
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
        });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
    }
  };

  const handleExportTransporteClick = () => {
    // Busca a nota de saída autorizada mais recente para romaneio imediato
    const lastSaida = invoices.find(
      (inv) => inv.tipo === "SAIDA" && inv.status === "AUTORIZADA"
    );
    if (lastSaida) {
      setSelectedInvoiceForRomaneio(lastSaida);
      setShowRomaneioModal(true);
    } else {
      const anySaida = invoices.find((inv) => inv.tipo === "SAIDA");
      if (anySaida) {
        setSelectedInvoiceForRomaneio(anySaida);
        setShowRomaneioModal(true);
      } else {
        alert("Nenhuma nota de retorno ou cobrança emitida para gerar romaneio de carga.");
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* Header Principal Responsivo */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Gestão de Notas Fiscais
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[10px] font-bold text-emerald-700 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sincronização Ativa</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fluxo contábil da confecção: 1. Devolver tecido (5904/5902) e 2. Faturar costura com espelho (5124)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
          <button
            onClick={handleExportTransporteClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-xs font-black shadow-xs transition-all cursor-pointer min-h-[44px] sm:min-h-0"
            title="Exportar Romaneio de Carga para Transporte e Despacho"
          >
            <Truck className="w-4 h-4 text-slate-950 shrink-0" />
            <span className="whitespace-nowrap">Exportar para Transporte</span>
          </button>
          <Link
            href="/configuracoes?tab=fechamento"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[44px] sm:min-h-0"
          >
            <Send className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap">Enviar para Contador</span>
          </Link>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs sm:text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[44px] sm:min-h-0"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Importar Remessa (5901)</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
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

      {/* Barra de Abas (Tabs) e Controles de Busca */}
      <div className="space-y-3">
        {/* Abas Superiores com rolagem touch suave */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`flex items-center gap-2 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === "ALL"
                  ? "bg-white text-ink shadow-xs"
                  : "text-slate-600 hover:text-ink hover:bg-white/50"
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todas</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-700"
                  }`}
              >
                {counts.total}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ENTRADA")}
              className={`flex items-center gap-2 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === "ENTRADA"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-blue-700 hover:bg-white/50"
                }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
              <span>Remessas</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "ENTRADA"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-800"
                  }`}
              >
                {counts.entradas}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("SAIDA")}
              className={`flex items-center gap-2 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === "SAIDA"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-emerald-700 hover:bg-white/50"
                }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Retornos</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "SAIDA"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-100 text-emerald-800"
                  }`}
              >
                {counts.saidas}
              </span>
            </button>

            {counts.pendentes > 0 && (
              <button
                onClick={() => setActiveTab("PENDENTE")}
                className={`flex items-center gap-2 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === "PENDENTE"
                    ? "bg-white text-amber-700 shadow-xs"
                    : "text-slate-600 hover:text-amber-700 hover:bg-white/50"
                  }`}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>SEFAZ</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white animate-pulse">
                  {counts.pendentes}
                </span>
              </button>
            )}
          </div>

          {/* Indicador de sincronização manual */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-[11px] text-slate-400">
              Atualizado {lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <button
              onClick={() => loadInvoices(false, true)}
              disabled={loading || isRefreshing}
              title="Atualizar e sincronizar notas pendentes com a SEFAZ"
              className="p-2.5 sm:p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-all cursor-pointer disabled:opacity-50 min-h-[38px]"
            >
              <RefreshCw
                className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isRefreshing || loading ? "animate-spin text-primary" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Barra de Busca Reativa + Filtro de Status */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Nº da Nota, Fábrica, Chave SEFAZ..."
              className="w-full pl-10 pr-9 py-3 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-sm sm:text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs min-h-[44px] sm:min-h-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-3 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-sm sm:text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs cursor-pointer min-h-[44px] sm:min-h-0"
            >
              <option value="ALL">Todos os Status</option>
              <option value="AUTORIZADA">Autorizada</option>
              <option value="PENDENTE">Pendente</option>
              <option value="REJEITADA">Rejeitada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Notas: Mobile Cards + Desktop Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Carregando notas fiscais...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-ink">
            {searchQuery
              ? `Nenhuma nota encontrada para "${searchQuery}"`
              : activeTab === "ENTRADA"
                ? "Nenhuma nota de remessa encontrada"
                : activeTab === "SAIDA"
                  ? "Nenhuma nota de retorno emitida ainda"
                  : "Nenhuma nota fiscal encontrada"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? "Tente buscar por outro termo ou limpe o campo de busca."
              : "Importe o PDF do WhatsApp ou XML emitido pela fábrica para iniciar."}
          </p>
          {!searchQuery && (
            <div className="mt-4">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Importar Nota (PDF / XML)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* 1. VISÃO MOBILE: CARDS NATIVOS TOUCH-FRIENDLY (< 768px) */}
          {/* ======================================================== */}
          <div className="block md:hidden space-y-3.5">
            {filteredInvoices.map((inv) => {
              const linkedRetorno = inv.chaveAcesso
                ? invoices.find(
                  (s) =>
                    s.tipo === "SAIDA" &&
                    s.chaveNfeReferenciada === inv.chaveAcesso &&
                    (s.modalidadeEmissao === "RETORNO_MERCADORIA" || s.modalidadeEmissao === "CONJUNTA") &&
                    s.status !== "CANCELADA"
                )
                : null;

              const linkedCobranca = inv.chaveAcesso
                ? invoices.find(
                  (s) =>
                    s.tipo === "SAIDA" &&
                    (s.chaveNfeReferenciada === inv.chaveAcesso || s.rawJson?.remessaOrigemId === inv.id) &&
                    (s.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO" || s.modalidadeEmissao === "CONJUNTA") &&
                    s.status !== "CANCELADA"
                )
                : null;

              const diasDesdeRetorno = linkedRetorno
                ? Math.floor((Date.now() - new Date(linkedRetorno.dataEmissao).getTime()) / (1000 * 60 * 60 * 24))
                : 0;

              const isSelected = selectedEntryIds.includes(inv.id);

              return (
                <div
                  key={`mob-${inv.id}`}
                  className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 transition-all ${isSelected
                      ? "border-primary ring-2 ring-primary/20 bg-emerald-50/20"
                      : "border-slate-200/80"
                    }`}
                >
                  {/* Linha 1: Badges, Status e Checkbox */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {inv.tipo === "ENTRADA" && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectEntry(inv.id)}
                          className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary/20 cursor-pointer"
                          title="Selecionar para retorno agrupado"
                        />
                      )}
                      {inv.tipo === "ENTRADA" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-blue-100 text-blue-800">
                          <ArrowDownLeft className="w-3 h-3" />
                          Remessa (5901)
                        </span>
                      ) : inv.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO" || inv.finalidade?.includes("COBRANÇA") ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300/60">
                          <ArrowUpRight className="w-3 h-3" />
                          Cobrança (5124)
                        </span>
                      ) : inv.modalidadeEmissao === "CONJUNTA" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-violet-100 text-violet-800 border border-violet-200">
                          Nota Única
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          <ArrowUpRight className="w-3 h-3" />
                          Retorno (5902)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${inv.status === "AUTORIZADA"
                            ? "bg-emerald-50 text-emerald-700"
                            : inv.status === "PENDENTE"
                              ? "bg-amber-50 text-amber-700"
                              : inv.status === "CANCELADA"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-red-50 text-red-700"
                          }`}
                      >
                        {inv.status === "AUTORIZADA" && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        {inv.status === "PENDENTE" && (
                          <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        )}
                        <span>
                          {inv.status === "AUTORIZADA"
                            ? "Autorizada"
                            : inv.status === "PENDENTE"
                              ? "Processando"
                              : inv.status === "CANCELADA"
                                ? "Cancelada"
                                : "Rejeitada"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Linha 2: Dados Principais (Número, Fábrica e Valor) */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div>
                      <h3 className="text-base font-bold text-ink leading-tight">
                        NF-e Nº {inv.numero}{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          (Série {inv.serie})
                        </span>
                      </h3>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">
                        {inv.partner?.razaoSocial || "Fábrica Parceira"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }).format(new Date(inv.dataEmissao))}
                        </span>
                        {inv.espelhoNumero && (
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
                            Espelho #{inv.espelhoNumero}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-400 block font-medium">Valor Total</span>
                      <span className="text-lg font-black text-slate-900">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(inv.valorTotal))}
                      </span>
                    </div>
                  </div>

                  {/* Linha 3: Ações de Produção / Lote */}
                  {inv.tipo === "ENTRADA" && (
                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      {/* Mini Indicador de Etapas */}
                      <div className="flex items-center justify-between text-[10px] font-bold py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-600">
                        <span className="text-blue-700 font-extrabold">1. Tecido Recebido ✓</span>
                        <span className="text-slate-300">➔</span>
                        <span className={linkedRetorno ? "text-emerald-700 font-extrabold" : "text-amber-700 font-black animate-pulse"}>
                          2. Devolver Tecido {linkedRetorno ? "✓" : "⏳"}
                        </span>
                        <span className="text-slate-300">➔</span>
                        <span className={linkedCobranca ? "text-emerald-700 font-extrabold" : linkedRetorno ? "text-amber-700 font-black animate-pulse" : "text-slate-400"}>
                          3. Faturar Costura {linkedCobranca ? "✓" : linkedRetorno ? "⏳" : ""}
                        </span>
                      </div>

                      {linkedRetorno && linkedCobranca ? (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              Lote 100% Concluído
                            </span>
                            <button
                              onClick={() => {
                                setSelectedInvoiceForRomaneio(linkedRetorno || linkedCobranca);
                                setShowRomaneioModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 font-bold text-[11px] shadow-2xs hover:bg-emerald-100/60 cursor-pointer min-h-[36px]"
                            >
                              <Truck className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Romaneio</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/60 text-xs">
                            {linkedRetorno.pdfUrl && (
                              <a
                                href={linkedRetorno.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 font-semibold hover:underline"
                              >
                                Retorno #{linkedRetorno.numero}
                              </a>
                            )}
                            <span className="text-emerald-300">•</span>
                            {linkedCobranca.pdfUrl && (
                              <a
                                href={linkedCobranca.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-700 font-semibold hover:underline"
                              >
                                Cobrança #{linkedCobranca.numero}
                              </a>
                            )}
                          </div>
                        </div>
                      ) : linkedRetorno && !linkedCobranca ? (
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
                              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>Passo 1 OK (Retorno #{linkedRetorno.numero})</span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedInvoiceForRomaneio(linkedRetorno);
                                setShowRomaneioModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-blue-200 text-blue-800 font-bold text-[11px] hover:bg-blue-100 cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Romaneio</span>
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedInvoiceForEspelho(inv);
                              setShowEspelhoModal(true);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xs transition-all cursor-pointer min-h-[46px]"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Passo 2: Faturar Costura com Espelho (5124)</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleStartInversion(inv.id)}
                            disabled={inversionLoadingId === inv.id}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-xs transition-all cursor-pointer min-h-[46px]"
                          >
                            {inversionLoadingId === inv.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 text-emerald-400" />
                            )}
                            <span>Passo 1: Emitir Retorno do Tecido (5904 / 5902)</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedInvoiceForEspelho(inv);
                              setShowEspelhoModal(true);
                            }}
                            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer min-h-[42px] flex items-center justify-center gap-1.5"
                          >
                            <span>Passo 2: Faturar Costura Direto com Espelho (5124)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Linha 4: Botões de Ação Táteis (PDF, WhatsApp, Romaneio, etc.) */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs border border-rose-200/60 min-h-[44px]"
                      >
                        <Download className="w-4 h-4 text-rose-600" />
                        <span>DANFE (PDF)</span>
                      </a>
                    )}

                    {inv.status === "AUTORIZADA" && (
                      <button
                        onClick={() => handleShareInvoice(inv)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs border border-emerald-200/60 min-h-[44px] cursor-pointer"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    {inv.status === "AUTORIZADA" && inv.tipo === "SAIDA" && (
                      <button
                        onClick={() => {
                          setSelectedInvoiceForRomaneio(inv);
                          setShowRomaneioModal(true);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 min-h-[44px] cursor-pointer shadow-2xs"
                      >
                        <Truck className="w-4 h-4 text-amber-700" />
                        <span>Exportar Transporte</span>
                      </button>
                    )}

                    {/* Ações secundárias compactas */}
                    <div className="flex items-center gap-1">
                      {inv.tipo === "SAIDA" && (
                        <button
                          onClick={() => handleCheckStatus(inv.id)}
                          disabled={statusCheckingId === inv.id}
                          title="Consultar SEFAZ"
                          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        >
                          <RefreshCw className={`w-4 h-4 ${statusCheckingId === inv.id ? "animate-spin text-primary" : ""}`} />
                        </button>
                      )}

                      {inv.xmlUrl && (
                        <a
                          href={inv.xmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Baixar XML"
                          className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      )}

                      {inv.status === "AUTORIZADA" && (
                        <button
                          onClick={() => {
                            setSelectedInvoiceForEmail({
                              id: inv.id,
                              numero: inv.numero,
                              serie: inv.serie,
                              chaveAcesso: inv.chaveAcesso,
                              valorTotal: Number(inv.valorTotal),
                              modalidade: inv.modalidade,
                              partnerNome: inv.partner?.razaoSocial || inv.partner?.nomeFantasia || null,
                              partnerEmail: inv.partner?.emailPrincipal || null,
                              pdfUrl: inv.pdfUrl,
                              xmlUrl: inv.xmlUrl,
                            });
                            setShowEmailModal(true);
                          }}
                          title="Enviar por E-mail"
                          className="p-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/60 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      )}

                      {/* Excluir Nota */}
                      {(inv.tipo === "ENTRADA" || inv.status !== "AUTORIZADA") && (
                        <button
                          onClick={() => setSelectedInvoiceForDelete(inv)}
                          title="Excluir Nota"
                          className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ======================================================== */}
          {/* 2. VISÃO DESKTOP: TABELA OTIMIZADA FLUIDA (>= 768px)    */}
          {/* ======================================================== */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden max-w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredInvoices.some((i) => i.tipo === "ENTRADA") &&
                          filteredInvoices
                            .filter((i) => i.tipo === "ENTRADA")
                            .every((i) => selectedEntryIds.includes(i.id))
                        }
                        onChange={handleSelectAllEntries}
                        title="Selecionar todas as remessas visíveis"
                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary/20 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3.5">Data Emissão</th>
                    <th className="py-3 px-3.5">Tipo & NF-e</th>
                    <th className="py-3 px-3.5">Fábrica</th>
                    <th className="py-3 px-3.5">Chave</th>
                    <th className="py-3 px-3.5">Valor Total</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-right">Ações Fiscais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 text-center">
                        {inv.tipo === "ENTRADA" ? (
                          <input
                            type="checkbox"
                            checked={selectedEntryIds.includes(inv.id)}
                            onChange={() => handleToggleSelectEntry(inv.id)}
                            title="Selecionar para retorno agrupado"
                            className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary/20 cursor-pointer"
                          />
                        ) : (
                          <span className="w-4 h-4 inline-block" />
                        )}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-ink font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Intl.DateTimeFormat("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }).format(new Date(inv.dataEmissao))}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block ml-5 font-mono">
                          {new Intl.DateTimeFormat("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(inv.dataEmissao))}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${inv.tipo === "ENTRADA"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-emerald-50 text-emerald-600"
                              }`}
                          >
                            {inv.tipo === "ENTRADA" ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-ink whitespace-nowrap">
                              NF-e Nº {inv.numero} (Série {inv.serie})
                            </p>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {inv.tipo === "ENTRADA" ? (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-800 whitespace-nowrap">
                                  Remessa (5901)
                                </span>
                              ) : inv.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO" || inv.finalidade?.includes("COBRANÇA") ? (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300/60 whitespace-nowrap">
                                  Cobrança (5124)
                                </span>
                              ) : inv.modalidadeEmissao === "CONJUNTA" ? (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-violet-100 text-violet-800 border border-violet-200 whitespace-nowrap">
                                  Nota Única
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 whitespace-nowrap">
                                  Retorno (5902)
                                </span>
                              )}
                              {inv.espelhoNumero && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 whitespace-nowrap">
                                  Espelho #{inv.espelhoNumero}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 max-w-[180px]">
                        <div className="font-semibold text-ink truncate" title={inv.partner?.razaoSocial}>
                          {inv.partner?.razaoSocial || "Fábrica"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {inv.partner?.cnpj || "-"}
                        </div>
                      </td>

                      {/* Chave de acesso condensada (economiza 120px) */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {inv.chaveAcesso ? (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(inv.chaveAcesso);
                              setToastMessage("Chave SEFAZ copiada para a área de transferência!");
                            }}
                            title={`Clique para copiar a chave completa: ${inv.chaveAcesso}`}
                            className="hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>...{inv.chaveAcesso.slice(-8)}</span>
                            <FileText className="w-3 h-3 text-slate-400" />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Aguardando</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-bold text-ink whitespace-nowrap">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(inv.valorTotal))}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${inv.status === "AUTORIZADA"
                              ? "bg-emerald-50 text-emerald-700"
                              : inv.status === "PENDENTE"
                                ? "bg-amber-50 text-amber-700"
                                : inv.status === "CANCELADA"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-red-50 text-red-700"
                            }`}
                        >
                          {inv.status === "AUTORIZADA" && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          )}
                          {inv.status === "PENDENTE" && (
                            <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                          )}
                          {inv.status === "CANCELADA" && (
                            <FileX className="w-3 h-3 text-slate-400" />
                          )}
                          {inv.status === "REJEITADA" && (
                            <AlertCircle className="w-3 h-3 text-red-500" />
                          )}
                          <span>
                            {inv.status === "AUTORIZADA"
                              ? "Autorizada"
                              : inv.status === "PENDENTE"
                                ? "Processando"
                                : inv.status === "CANCELADA"
                                  ? "Cancelada"
                                  : "Rejeitada"}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ações contextuais inteligentes para notas de ENTRADA */}
                          {inv.tipo === "ENTRADA" && (() => {
                            const linkedRetorno = inv.chaveAcesso
                              ? invoices.find(
                                (s) =>
                                  s.tipo === "SAIDA" &&
                                  s.chaveNfeReferenciada === inv.chaveAcesso &&
                                  (s.modalidadeEmissao === "RETORNO_MERCADORIA" || s.modalidadeEmissao === "CONJUNTA") &&
                                  s.status !== "CANCELADA"
                              )
                              : null;

                            const linkedCobranca = inv.chaveAcesso
                              ? invoices.find(
                                (s) =>
                                  s.tipo === "SAIDA" &&
                                  (s.chaveNfeReferenciada === inv.chaveAcesso || s.rawJson?.remessaOrigemId === inv.id) &&
                                  (s.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO" || s.modalidadeEmissao === "CONJUNTA") &&
                                  s.status !== "CANCELADA"
                              )
                              : null;

                            if (linkedRetorno && linkedCobranca) {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                    ✓ Lote Concluído
                                  </span>
                                  {linkedRetorno.pdfUrl && (
                                    <a
                                      href={linkedRetorno.pdfUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200"
                                      title="Ver DANFE de Retorno"
                                    >
                                      Retorno #{linkedRetorno.numero}
                                    </a>
                                  )}
                                  {linkedCobranca.pdfUrl && (
                                    <a
                                      href={linkedCobranca.pdfUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-mono border border-emerald-200"
                                      title="Ver DANFE de Cobrança"
                                    >
                                      Cobrança #{linkedCobranca.numero}
                                    </a>
                                  )}
                                  <button
                                    onClick={() => {
                                      setSelectedInvoiceForRomaneio(linkedRetorno || linkedCobranca);
                                      setShowRomaneioModal(true);
                                    }}
                                    title="Exportar Romaneio de Carga para Transporte"
                                    className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 cursor-pointer shadow-2xs"
                                  >
                                    Romaneio
                                  </button>
                                </div>
                              );
                            }

                            if (linkedRetorno && !linkedCobranca) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                    ✓ Retorno #{linkedRetorno.numero}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setSelectedInvoiceForRomaneio(linkedRetorno);
                                      setShowRomaneioModal(true);
                                    }}
                                    title="Exportar Romaneio de Carga para Transporte"
                                    className="px-2 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 cursor-pointer shadow-2xs"
                                  >
                                    Romaneio
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedInvoiceForEspelho(inv);
                                      setShowEspelhoModal(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Passo 2: Faturar (5124)</span>
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleStartInversion(inv.id)}
                                  disabled={inversionLoadingId === inv.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-60"
                                  title="Devolver o tecido à fábrica copiando peso, volumes e frete"
                                >
                                  {inversionLoadingId === inv.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                                  )}
                                  <span>Passo 1: Retorno (5904/5902)</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedInvoiceForEspelho(inv);
                                    setShowEspelhoModal(true);
                                  }}
                                  title="Faturar a costura com o espelho da fábrica"
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  Passo 2: Faturar (5124)
                                </button>
                              </div>
                            );
                          })()}

                          {/* Ações para notas de SAÍDA */}
                          {inv.tipo === "SAIDA" && (
                            <>
                              <button
                                onClick={() => handleCheckStatus(inv.id)}
                                disabled={statusCheckingId === inv.id}
                                title="Consultar status SEFAZ"
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw
                                  className={`w-3.5 h-3.5 text-slate-600 ${statusCheckingId === inv.id ? "animate-spin text-primary" : ""
                                    }`}
                                />
                              </button>

                              {(inv.status === "AUTORIZADA" || inv.status === "PENDENTE") && (
                                <button
                                  onClick={() => handleOpenCancel(inv)}
                                  title="Cancelar NF-e na SEFAZ"
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition-colors"
                                >
                                  <FileX className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}

                          {/* Downloads */}
                          {inv.pdfUrl && (
                            <a
                              href={inv.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors font-bold text-[11px] border border-rose-200/60"
                              title="Visualizar ou Baixar DANFE em PDF"
                            >
                              <Download className="w-3 h-3 text-rose-600" />
                              <span>PDF</span>
                            </a>
                          )}

                          {inv.xmlUrl && (
                            <a
                              href={inv.xmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-bold text-[11px] border border-blue-200/60"
                              title="Baixar XML SEFAZ"
                            >
                              <FileText className="w-3 h-3 text-blue-600" />
                              <span>XML</span>
                            </a>
                          )}

                          {/* WhatsApp */}
                          {inv.status === "AUTORIZADA" && (
                            <button
                              onClick={() => handleShareInvoice(inv)}
                              title="Enviar pelo WhatsApp"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-[#25D366] cursor-pointer transition-colors"
                            >
                              <WhatsAppIcon className="w-4 h-4" />
                            </button>
                          )}

                          {/* E-mail */}
                          {inv.status === "AUTORIZADA" && (
                            <button
                              onClick={() => {
                                setSelectedInvoiceForEmail({
                                  id: inv.id,
                                  numero: inv.numero,
                                  serie: inv.serie,
                                  chaveAcesso: inv.chaveAcesso,
                                  valorTotal: Number(inv.valorTotal),
                                  modalidade: inv.modalidade,
                                  partnerNome: inv.partner?.razaoSocial || inv.partner?.nomeFantasia || null,
                                  partnerEmail: inv.partner?.emailPrincipal || null,
                                  pdfUrl: inv.pdfUrl,
                                  xmlUrl: inv.xmlUrl,
                                });
                                setShowEmailModal(true);
                              }}
                              title="Enviar por E-mail"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-sky-50 hover:text-sky-600 cursor-pointer transition-colors"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}

                          {/* Romaneio */}
                          {inv.status === "AUTORIZADA" && inv.tipo === "SAIDA" && (
                            <button
                              onClick={() => {
                                setSelectedInvoiceForRomaneio(inv);
                                setShowRomaneioModal(true);
                              }}
                              title="Exportar Romaneio de Carga para Transporte e Despacho"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors font-bold text-[11px] border border-amber-300 cursor-pointer shadow-2xs"
                            >
                              <Truck className="w-3 h-3 text-amber-700" />
                              <span>Exportar p/ Transporte</span>
                            </button>
                          )}

                          {/* Excluir Nota */}
                          {(inv.tipo === "ENTRADA" || inv.status !== "AUTORIZADA") && (
                            <button
                              onClick={() => setSelectedInvoiceForDelete(inv)}
                              title="Excluir Nota"
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Barra de Ações em Lote Flutuante (Posicionada com folga no mobile e desktop) */}
      {selectedEntryIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-auto max-w-lg bg-slate-900/95 backdrop-blur-md text-white px-4 sm:px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-bold">
              {selectedEntriesSummary.count}{" "}
              {selectedEntriesSummary.count === 1 ? "remessa selecionada" : "remessas selecionadas"}
            </span>
            <span className="text-slate-400 font-mono text-xs">
              (
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(selectedEntriesSummary.totalValor)}
              )
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setSelectedEntryIds([])}
              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer min-h-[40px] sm:min-h-0"
            >
              Desmarcar
            </button>
            <button
              onClick={handleStartBatchInversion}
              disabled={batchInversionLoading || selectedEntryIds.length < 2}
              title={
                selectedEntryIds.length < 2
                  ? "Selecione pelo menos 2 remessas para agrupar"
                  : "Gerar uma única NF-e 5902 referenciando todas as remessas selecionadas"
              }
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-1.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] sm:min-h-0"
            >
              {batchInversionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Layers className="w-4 h-4" />
              )}
              <span className="whitespace-nowrap">
                {selectedEntryIds.length < 2
                  ? "Selecione +1 para Agrupar"
                  : "Gerar Retorno Agrupado (5902)"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Modais */}
      <InversionPreviewDialog
        inversionData={inversionData}
        isOpen={showInversionModal}
        onClose={() => {
          setShowInversionModal(false);
          setInversionData(null);
        }}
        onSuccess={(numeroRetorno) => {
          setToastMessage(`Nota de retorno Nº ${numeroRetorno} transmitida com sucesso para a SEFAZ!`);
          setSelectedEntryIds([]);
          loadInvoices(true);
        }}
      />

      <ImportXmlModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={(newInvoiceId) => {
          setToastMessage("Nota fiscal importada com sucesso!");
          loadInvoices(true);
          if (newInvoiceId) {
            handleStartInversion(newInvoiceId);
          }
        }}
      />

      <MonthlyCloseModal
        isOpen={showMonthlyCloseModal}
        onClose={() => setShowMonthlyCloseModal(false)}
        onSuccess={(msg) => {
          setToastMessage(msg);
        }}
      />

      <ImportEspelhoModal
        isOpen={showEspelhoModal}
        targetInvoice={selectedInvoiceForEspelho}
        onClose={() => {
          setShowEspelhoModal(false);
          setSelectedInvoiceForEspelho(null);
        }}
        onSuccess={() => {
          setToastMessage("NF-e de Cobrança (Industrialização) transmitida com sucesso para a SEFAZ!");
          loadInvoices(true);
        }}
      />

      <CancelInvoiceModal
        isOpen={showCancelModal}
        invoice={selectedInvoiceForCancel}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedInvoiceForCancel(null);
        }}
        onSuccess={(msg) => {
          setToastMessage(msg);
          loadInvoices(true);
        }}
      />

      <SendInvoiceEmailModal
        isOpen={showEmailModal}
        invoice={selectedInvoiceForEmail}
        tenantName={session?.user?.tenantName || undefined}
        onClose={() => {
          setShowEmailModal(false);
          setSelectedInvoiceForEmail(null);
        }}
        onSuccess={(msg) => {
          setToastMessage(msg);
        }}
      />

      <RomaneioModal
        isOpen={showRomaneioModal}
        invoice={selectedInvoiceForRomaneio}
        tenantInfo={session?.user}
        onClose={() => {
          setShowRomaneioModal(false);
          setSelectedInvoiceForRomaneio(null);
        }}
      />

      <DeleteInvoiceModal
        isOpen={!!selectedInvoiceForDelete}
        invoice={selectedInvoiceForDelete}
        onClose={() => setSelectedInvoiceForDelete(null)}
        onSuccess={(msg) => {
          setToastMessage(msg);
          loadInvoices(true);
        }}
      />
    </div>
  );
}
