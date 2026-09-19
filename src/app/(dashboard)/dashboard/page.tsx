"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Upload,
  RefreshCw,
  FileText,
  ExternalLink,
  Factory,
  CheckCircle2,
  Calendar,
  Wallet,
  Truck,
  ArrowRight,
  Download,
  Send,
  CalendarClock,
  ChevronRight,
  Filter,
  Mail,
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
  getDashboardDataAction,
  DashboardMetrics,
  PeriodoFiltro,
} from "@/actions/dashboard";
import { getInversionPreviewAction } from "@/actions/invoices";
import { InversionPreviewDialog } from "@/components/modules/invoices/InversionPreviewDialog";
import { ImportXmlModal } from "@/components/modules/invoices/ImportXmlModal";
import { ImportEspelhoModal } from "@/components/modules/invoices/ImportEspelhoModal";
import { MonthlyCloseModal } from "@/components/modules/invoices/MonthlyCloseModal";
import { SendInvoiceEmailModal } from "@/components/modules/invoices/SendInvoiceEmailModal";
import { InversionPreparationResult } from "@/lib/services/inversion";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtro Temporal
  const [filtroAtivo, setFiltroAtivo] = useState<PeriodoFiltro>("mes_atual");
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Modais de ação rápida
  const { data: session } = useSession();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEspelhoModal, setShowEspelhoModal] = useState(false);
  const [selectedInvoiceForEspelho, setSelectedInvoiceForEspelho] = useState<any | null>(null);
  const [showInversionModal, setShowInversionModal] = useState(false);
  const [showMonthlyCloseModal, setShowMonthlyCloseModal] = useState(false);
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<any | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [inversionData, setInversionData] = useState<InversionPreparationResult | null>(null);
  const [inversionLoadingId, setInversionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleShareInvoice = (inv: any) => {
    if (!inv.pdfUrl) return;
    const msg = encodeURIComponent(
      `Olá! Segue a DANFE da NF-e nº ${inv.numero || "S/N"} referente ao lote industrializado:\n${inv.pdfUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const loadData = async (
    isRefresh = false,
    periodo: PeriodoFiltro = filtroAtivo,
    dtStart?: string,
    dtEnd?: string
  ) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getDashboardDataAction({
        periodo,
        dataInicio: dtStart,
        dataFim: dtEnd,
      });
      setData(res);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false, "mes_atual");
  }, []);

  const handleMudarFiltro = (periodo: PeriodoFiltro) => {
    setFiltroAtivo(periodo);
    if (periodo === "custom") {
      setShowCustomDates(true);
    } else {
      setShowCustomDates(false);
      loadData(false, periodo);
    }
  };

  const handleAplicarFiltroCustomizado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      alert("Selecione data de início e término.");
      return;
    }
    loadData(false, "custom", customStart, customEnd);
  };

  const handleInvertClick = async (invoiceId: string) => {
    setInversionLoadingId(invoiceId);
    try {
      const res = await getInversionPreviewAction(invoiceId);
      if (!res.success || !res.data) {
        alert(res.error || "Erro ao preparar prévia de inversão.");
        return;
      }
      setInversionData(res.data);
      setShowInversionModal(true);
    } catch (err: any) {
      alert(err.message || "Erro ao preparar espelho de inversão.");
    } finally {
      setInversionLoadingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  const formatDate = (d: Date | string) => {
    try {
      return new Date(d).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // Status resumido do certificado A1
  const getCertificadoStatus = () => {
    if (!data?.tenantInfo?.certificadoValidoAte) {
      return { label: "A1 Ativo", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    }
    const expDate = new Date(data.tenantInfo.certificadoValidoAte);
    const now = new Date();
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { label: "A1 Expirado", color: "text-rose-700 bg-rose-50 border-rose-200" };
    }
    if (diffDays <= 30) {
      return { label: `A1 vence em ${diffDays}d`, color: "text-amber-700 bg-amber-50 border-amber-200" };
    }
    return { label: `A1 Válido (${diffDays}d)`, color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  };

  const certStatus = getCertificadoStatus();

  // Opções de filtros rápidos
  const filtrosRapidos: Array<{ id: PeriodoFiltro; label: string }> = [
    { id: "mes_atual", label: "Este Mês" },
    { id: "mes_anterior", label: "Mês Anterior" },
    { id: "ultimos_30", label: "Últimos 30 Dias" },
    { id: "ultimos_90", label: "Últimos 90 Dias" },
    { id: "ano_atual", label: "Este Ano" },
    { id: "semana_atual", label: "Esta Semana" },
    { id: "hoje", label: "Hoje" },
    { id: "custom", label: "Personalizado" },
  ];

  // Cálculo para o gráfico de evolução
  const maxEvolucaoValor = Math.max(
    ...(data?.evolucaoFaturamento?.map((e) => e.valor) || [1000]),
    1000
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 border border-slate-700 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            Visão Geral
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              {data?.tenantInfo?.razaoSocial || "Painel da Facção"}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${certStatus.color}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{certStatus.label}</span>
            </span>
            <button
              onClick={() => loadData(true)}
              title="Atualizar dados"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`}
              />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestão de faturamento de costura, retorno de matéria-prima e previsão de recebimentos
          </p>
        </div>

        {/* Botões de Ação Direta - Área tátil confortável para mobile */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <Link
            href="/notas"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-primary hover:bg-primaryDark text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer flex-1 sm:flex-initial"
          >
            <RefreshCw className="w-4 h-4 text-white shrink-0" />
            <span>Gerar NF de Retorno</span>
          </Link>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex-1 sm:flex-initial"
          >
            <Upload className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Importar Nota</span>
          </button>
          <button
            onClick={() => setShowMonthlyCloseModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs w-full sm:w-auto"
          >
            <Send className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Contador</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Temporais */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <div className="flex items-center gap-1 text-xs font-bold text-slate-400 mr-2 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Período:</span>
          </div>
          {filtrosRapidos.map((f) => {
            const isAtivo = filtroAtivo === f.id;
            return (
              <button
                key={f.id}
                onClick={() => handleMudarFiltro(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  isAtivo
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {data?.filtroAplicado && (
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-auto">
            {data.filtroAplicado.label}
          </span>
        )}
      </div>

      {/* Formulário de Datas Customizadas (se selecionado) */}
      {showCustomDates && (
        <form
          onSubmit={handleAplicarFiltroCustomizado}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">De:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Até:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primaryDark text-white text-xs font-bold transition-all cursor-pointer"
          >
            Aplicar Filtro
          </button>
        </form>
      )}

      {/* Alerta de Lotes Retornados há mais de 48h sem Cobrança Emitida */}
      {data?.previsaoRecebimento?.lotesAguardandoEspelho &&
        data.previsaoRecebimento.lotesAguardandoEspelho.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  {data.previsaoRecebimento.lotesAguardandoEspelho.length} lote(s) entregue(s) há
                  mais de 48h aguardando Espelho de Cobrança!
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  As peças já voltaram para a fábrica. Solicite o Espelho de Produção para emitir sua
                  NF de Cobrança de costura (CFOP 5124) e receber o pagamento.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowEspelhoModal(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs self-end sm:self-auto"
            >
              Emitir Cobrança Agora
            </button>
          </div>
        )}

      {/* KPI Cards Grid - Foco Financeiro da Facção */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Faturamento Real de Costura (CFOP 5124) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Faturamento de Costura
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 bg-slate-100 animate-pulse rounded-md w-32 mb-1"></div>
            ) : (
              <span className="text-2xl font-bold text-ink">
                {formatCurrency(data?.faturamentoReal || 0)}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">
                {data?.quantidadeNotasCobranca || 0} cobrança(s)
              </span>
              <span>• CFOP 5124 (Mão de Obra)</span>
            </p>
          </div>
        </div>

        {/* Card 2: A Receber (Previsão de Caixa) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contas a Receber
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 bg-slate-100 animate-pulse rounded-md w-32 mb-1"></div>
            ) : (
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(data?.previsaoRecebimento?.totalAReceber || 0)}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {formatCurrency(data?.previsaoRecebimento?.aReceberProximos7Dias || 0)} nos próximos 7 dias
            </p>
          </div>
        </div>

        {/* Card 3: Receita Prevista na Linha de Produção (FlyERP) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Receita na Linha
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 bg-slate-100 animate-pulse rounded-md w-28 mb-1"></div>
            ) : (
              <span className="text-2xl font-bold text-amber-700">
                {formatCurrency(data?.receitaPrevistaLinha?.valorEstimado || 0)}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              ~{data?.receitaPrevistaLinha?.quantidadePecas || 0} peças ({data?.receitaPrevistaLinha?.quantidadeRemessas || 0} remessas em corte)
            </p>
          </div>
        </div>

        {/* Card 4: Movimentação Física de Insumos (Retornos CFOP 5902) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Retorno de Insumos
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 bg-slate-100 animate-pulse rounded-md w-16 mb-1"></div>
            ) : (
              <span className="text-2xl font-bold text-ink">
                {data?.totalRetornosFisicos || 0} retorno(s)
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {formatCurrency(data?.valorInsumosDevolvidos || 0)} em tecidos (R$ 0 financeiro)
            </p>
          </div>
        </div>

        {/* Card 5: Principal Fábrica Parceira */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Principal Fábrica
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Factory className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 bg-slate-100 animate-pulse rounded-md w-28 mb-1"></div>
            ) : (
              <span
                className="text-base font-bold text-ink truncate block"
                title={data?.parceiroTop?.nome || "Nenhum parceiro"}
              >
                {data?.parceiroTop?.nome || "Sem movimentação"}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {data?.parceiroTop
                ? `${formatCurrency(data.parceiroTop.total)} em costura`
                : "Aguardando primeiras cobranças"}
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO NOBRE: Previsão de Recebimentos ("Quando você vai receber") */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-emerald-600" />
              <span>Previsão de Recebimentos — Quando você vai receber</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cronograma de depósitos e liquidações das faturas de costura emitidas para as fábricas
            </p>
          </div>
          <button
            onClick={() => setShowEspelhoModal(true)}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Emitir nova cobrança via espelho</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Métricas de Entrada de Caixa */}
          <div className="space-y-3 lg:border-r lg:border-slate-100 lg:pr-6">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Próximos 7 Dias
                </span>
                <span className="text-xl font-bold text-emerald-900 mt-0.5 block">
                  {formatCurrency(data?.previsaoRecebimento?.aReceberProximos7Dias || 0)}
                </span>
                <p className="text-[10px] text-emerald-600 mt-0.5">Entrada imediata de caixa</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                7d
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                  Neste Mês
                </span>
                <span className="text-xl font-bold text-blue-900 mt-0.5 block">
                  {formatCurrency(data?.previsaoRecebimento?.aReceberNoMes || 0)}
                </span>
                <p className="text-[10px] text-blue-600 mt-0.5">Previsão até fim do mês</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                30d
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total em Aberto
                </span>
                <span className="text-xl font-bold text-ink mt-0.5 block">
                  {formatCurrency(data?.previsaoRecebimento?.totalAReceber || 0)}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Todas as faturas faturadas</p>
              </div>
              <Wallet className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          {/* Coluna 2 e 3: Timeline de Próximos Pagamentos */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Próximos Vencimentos das Fábricas
            </h3>

            {loading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : !data?.previsaoRecebimento?.proximosPagamentos ||
              data.previsaoRecebimento.proximosPagamentos.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-ink">Nenhum pagamento agendado no momento</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                  Ao emitir notas de cobrança a partir dos espelhos de produção, as datas de depósito
                  aparecerão listadas aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.previsaoRecebimento.proximosPagamentos.map((pag) => {
                  let badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  let statusText = `Em ${pag.diasRestantes} dias (${formatDate(pag.dataVencimento)})`;

                  if (pag.status === "HOJE") {
                    badgeStyle = "bg-amber-100 text-amber-800 border-amber-300 animate-pulse";
                    statusText = "Vence Hoje!";
                  } else if (pag.status === "ATRASADO") {
                    badgeStyle = "bg-rose-100 text-rose-800 border-rose-200";
                    statusText = `Venceu há ${Math.abs(pag.diasRestantes)} dias`;
                  }

                  return (
                    <div
                      key={pag.id}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-ink truncate">
                              {pag.partnerNome}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              NF #{pag.invoiceNumero}
                            </span>
                            {pag.espelhoNumero && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                                Espelho #{pag.espelhoNumero}
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}
                          >
                            {statusText}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-ink block">
                          {formatCurrency(pag.valor)}
                        </span>
                        <span className="text-[10px] text-slate-400">A receber</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Gráfico de Evolução Financeira + Distribuição por Fábrica */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Evolução do Faturamento de Costura (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>Evolução do Faturamento de Costura</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Receita real de serviços de industrialização (CFOP 5124) ao longo do tempo
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                Total: {formatCurrency(data?.faturamentoReal || 0)}
              </span>
            </div>

            {loading ? (
              <div className="h-44 bg-slate-100 animate-pulse rounded-xl"></div>
            ) : !data?.evolucaoFaturamento || data.evolucaoFaturamento.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl my-2">
                <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-ink">Sem cobranças no período filtrado</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                  Importe um espelho de produção para emitir sua cobrança de costura e visualizar a
                  curva de faturamento.
                </p>
              </div>
            ) : (
              <div className="pt-6 pb-2">
                {/* Gráfico de Barras Responsivo */}
                <div className="flex items-end gap-2 sm:gap-3 h-44 w-full border-b border-slate-200 pb-2">
                  {data.evolucaoFaturamento.map((item, idx) => {
                    const percent = Math.max(
                      Math.round((item.valor / maxEvolucaoValor) * 100),
                      8
                    );
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1.5 group relative"
                      >
                        {/* Tooltip Hover */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-ink text-white text-[10px] py-1 px-2 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-20">
                          <p className="font-bold">{formatCurrency(item.valor)}</p>
                          <p className="text-slate-300">{item.quantidade} nota(s) em {item.label}</p>
                        </div>

                        {/* Barra */}
                        <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-36">
                          <div
                            className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                            style={{ height: `${percent}%` }}
                          ></div>
                        </div>

                        {/* Rótulo da Data */}
                        <span className="text-[10px] font-mono text-slate-400 truncate w-full text-center">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Considera apenas notas de cobrança com status AUTORIZADA</span>
            <Link
              href="/notas"
              className="text-primary hover:text-primaryDark font-semibold flex items-center gap-1"
            >
              <span>Ver todas as notas</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Gráfico 2: Distribuição por Fábrica Parceira (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <Factory className="w-4 h-4 text-indigo-600" />
                  <span>Fábricas Parceiras</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribuição percentual da receita de costura
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                {data?.faturamentoPorParceiro?.length || 0} fábrica(s)
              </span>
            </div>

            {loading ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-4 bg-slate-100 animate-pulse rounded w-1/3"></div>
                    <div className="h-3 bg-slate-100 animate-pulse rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : !data?.faturamentoPorParceiro || data.faturamentoPorParceiro.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl my-4">
                <Factory className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-ink">Sem faturamento registrado</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                  Ao emitir cobranças, a divisão de receita por marca aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-4 my-2">
                {data.faturamentoPorParceiro.map((parceiro, index) => {
                  const barColors = [
                    "bg-emerald-500",
                    "bg-primary",
                    "bg-teal-500",
                    "bg-indigo-500",
                    "bg-blue-500",
                  ];
                  const barColor = barColors[index % barColors.length];

                  return (
                    <div key={parceiro.partnerId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                          {parceiro.nome}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">
                            {formatCurrency(parceiro.total)}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-500 w-8 text-right">
                            {parceiro.percentual}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.max(parceiro.percentual, 4)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100">
            <Link
              href="/parceiros"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              <span>Gerenciar Fábricas Parceiras</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Tabela Rápida: Últimas Notas Fiscais com Modalidades Claras */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>Últimas Notas da Oficina</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Movimentações fiscais mais recentes com distinção entre Retorno e Cobrança
            </p>
          </div>
          <Link
            href="/notas"
            className="text-xs font-semibold text-primary hover:text-primaryDark flex items-center gap-1"
          >
            <span>Ver todas as notas</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : !data?.ultimasNotas || data.ultimasNotas.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-ink">Nenhuma nota registrada ainda</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Quando notas de remessa da fábrica forem recebidas via MDe ou importadas, elas aparecerão aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Visão Mobile: Cards Táteis (block md:hidden) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {data.ultimasNotas.map((inv) => {
                const isEntrada = inv.tipo === "ENTRADA";
                const isAutorizada = inv.status === "AUTORIZADA";
                const isPendente = inv.status === "PENDENTE";
                const isCobranca = inv.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO";

                return (
                  <div key={inv.id} className="p-4 space-y-3 bg-white">
                    {/* Linha Topo: Modalidade + Status */}
                    <div className="flex items-center justify-between gap-2">
                      {isEntrada ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                          <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                          <span>Remessa (1902)</span>
                        </span>
                      ) : isCobranca ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <DollarSign className="w-3.5 h-3.5 shrink-0" />
                          <span>Cobrança (5124)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                          <Truck className="w-3.5 h-3.5 shrink-0" />
                          <span>Retorno Insumos (5902)</span>
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isAutorizada
                            ? "bg-emerald-100 text-emerald-800"
                            : isPendente
                            ? "bg-amber-100 text-amber-800"
                            : inv.status === "CANCELADA"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isAutorizada && <CheckCircle2 className="w-3 h-3" />}
                        {isPendente && <Clock className="w-3 h-3" />}
                        {inv.status}
                      </span>
                    </div>

                    {/* Informações da Nota */}
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-base font-bold text-ink">
                          NF-e #{inv.numero || "S/N"}
                        </span>
                        <span className="text-base font-bold text-slate-900">
                          {formatCurrency(inv.valorTotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium text-slate-700 truncate max-w-[200px]">
                          {inv.partnerNome || "Fábrica Parceira"}
                        </span>
                        <span>{formatDate(inv.dataEmissao)}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Série {inv.serie || "1"}
                        {inv.espelhoNumero ? ` • Espelho #${inv.espelhoNumero}` : ""}
                      </div>
                    </div>

                    {/* Botões de Ação Táteis Mobile (min-h-[44px]) */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                      {isEntrada && isAutorizada && (
                        <>
                          <button
                            onClick={() => handleInvertClick(inv.id)}
                            disabled={inversionLoadingId === inv.id}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                inversionLoadingId === inv.id ? "animate-spin" : ""
                              }`}
                            />
                            <span>Retorno (5902)</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedInvoiceForEspelho(inv);
                              setShowEspelhoModal(true);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Faturar (5124)</span>
                          </button>
                        </>
                      )}

                      {!isEntrada && isAutorizada && (
                        <div className="w-full flex items-center gap-2">
                          {inv.pdfUrl && (
                            <button
                              onClick={() => handleShareInvoice(inv)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl bg-emerald-50 text-[#128C7E] hover:bg-emerald-100 text-xs font-bold transition-all border border-emerald-200 cursor-pointer"
                            >
                              <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedInvoiceForEmail({
                                id: inv.id,
                                numero: inv.numero,
                                serie: inv.serie,
                                chaveAcesso: inv.chaveAcesso,
                                valorTotal: Number(inv.valorTotal),
                                modalidade: inv.modalidadeEmissao,
                                partnerNome: inv.partnerNome || null,
                                partnerEmail: null,
                                pdfUrl: inv.pdfUrl,
                                xmlUrl: inv.xmlUrl,
                              });
                              setShowEmailModal(true);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition-all border border-sky-200 cursor-pointer"
                          >
                            <Mail className="w-4 h-4" />
                            <span>E-mail</span>
                          </button>
                          {inv.pdfUrl && (
                            <a
                              href={inv.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center px-3 py-2.5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visão Desktop: Tabela (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Tipo / Modalidade</th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Fábrica / Parceiro</th>
                    <th className="px-4 py-3">Valor Total</th>
                    <th className="px-4 py-3">Emissão</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.ultimasNotas.map((inv) => {
                    const isEntrada = inv.tipo === "ENTRADA";
                    const isAutorizada = inv.status === "AUTORIZADA";
                    const isPendente = inv.status === "PENDENTE";
                    const isCobranca = inv.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO";

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Tipo / Modalidade */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {isEntrada ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>Remessa (1902)</span>
                            </span>
                          ) : isCobranca ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <DollarSign className="w-3 h-3" />
                              <span>Cobrança (5124)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                              <Truck className="w-3 h-3" />
                              <span>Retorno Insumos (5902)</span>
                            </span>
                          )}
                        </td>

                        {/* Documento */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-ink">
                            NF-e #{inv.numero || "S/N"}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Série {inv.serie || "1"}
                            {inv.espelhoNumero ? ` • Espelho #${inv.espelhoNumero}` : ""}
                          </span>
                        </td>

                        {/* Parceiro */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-800">
                          {inv.partnerNome || "Fábrica Parceira"}
                        </td>

                        {/* Valor Total */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-ink">
                          {formatCurrency(inv.valorTotal)}
                        </td>

                        {/* Data Emissão */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                          {formatDate(inv.dataEmissao)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isAutorizada
                                ? "bg-emerald-100 text-emerald-800"
                                : isPendente
                                ? "bg-amber-100 text-amber-800"
                                : inv.status === "CANCELADA"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {isAutorizada && <CheckCircle2 className="w-2.5 h-2.5" />}
                            {isPendente && <Clock className="w-2.5 h-2.5" />}
                            {inv.status}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEntrada && isAutorizada && (
                              <>
                                <button
                                  onClick={() => handleInvertClick(inv.id)}
                                  disabled={inversionLoadingId === inv.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primaryDark text-white text-[11px] font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                                >
                                  <RefreshCw
                                    className={`w-3 h-3 ${
                                      inversionLoadingId === inv.id ? "animate-spin" : ""
                                    }`}
                                  />
                                  <span>Retorno (5902)</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedInvoiceForEspelho(inv);
                                    setShowEspelhoModal(true);
                                  }}
                                  title="Faturar costura com o espelho da fábrica"
                                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-white text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
                                >
                                  <span>Faturar (5124)</span>
                                </button>
                              </>
                            )}

                            {/* Enviar pelo WhatsApp Oficial */}
                            {!isEntrada && isAutorizada && inv.pdfUrl && (
                              <button
                                onClick={() => handleShareInvoice(inv)}
                                title="Enviar DANFE pelo WhatsApp para o financeiro da fábrica"
                                className="p-1 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-[#25D366] transition-colors cursor-pointer"
                              >
                                <WhatsAppIcon className="w-4 h-4" />
                              </button>
                            )}

                            {/* Enviar por E-mail Oficial com Identificação da Facção */}
                            {!isEntrada && isAutorizada && (
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForEmail({
                                    id: inv.id,
                                    numero: inv.numero,
                                    serie: inv.serie,
                                    chaveAcesso: inv.chaveAcesso,
                                    valorTotal: Number(inv.valorTotal),
                                    modalidade: inv.modalidadeEmissao,
                                    partnerNome: inv.partnerNome || null,
                                    partnerEmail: null,
                                    pdfUrl: inv.pdfUrl,
                                    xmlUrl: inv.xmlUrl,
                                  });
                                  setShowEmailModal(true);
                                }}
                                title="Enviar DANFE e XML por E-mail para a fábrica"
                                className="p-1 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors cursor-pointer"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            )}

                            {inv.pdfUrl && (
                              <a
                                href={inv.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Baixar DANFE PDF"
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal de Importação de XML */}
      <ImportXmlModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false);
          setToastMessage("XML importado com sucesso!");
          loadData(true);
        }}
      />

      {/* Modal de Importação de Espelho para Cobrança (CFOP 5124) */}
      <ImportEspelhoModal
        isOpen={showEspelhoModal}
        targetInvoice={selectedInvoiceForEspelho}
        onClose={() => {
          setShowEspelhoModal(false);
          setSelectedInvoiceForEspelho(null);
        }}
        onSuccess={() => {
          setShowEspelhoModal(false);
          setSelectedInvoiceForEspelho(null);
          setToastMessage("NF-e de Cobrança (CFOP 5124) emitida com sucesso!");
          loadData(true);
        }}
      />

      {/* Modal de Confirmação e Transmissão de Retorno */}
      <InversionPreviewDialog
        isOpen={showInversionModal}
        inversionData={inversionData}
        onClose={() => {
          setShowInversionModal(false);
          setInversionData(null);
        }}
        onSuccess={(numeroRetorno) => {
          setShowInversionModal(false);
          setInversionData(null);
          setToastMessage(
            `Nota de Retorno Nº ${numeroRetorno} gerada e transmitida com sucesso!`
          );
          loadData(true);
        }}
      />

      {/* Modal de Fechamento Mensal do Contador */}
      <MonthlyCloseModal
        isOpen={showMonthlyCloseModal}
        onClose={() => setShowMonthlyCloseModal(false)}
        onSuccess={(msg) => {
          setToastMessage(msg);
        }}
      />

      {/* Modal de Envio de NF-e por E-mail */}
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
    </div>
  );
}
