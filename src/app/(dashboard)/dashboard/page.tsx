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
  XCircle,
  FileCheck,
  ArrowRight,
  Download,
  FileArchive,
} from "lucide-react";
import { getDashboardDataAction, DashboardMetrics } from "@/actions/dashboard";
import { getInversionPreviewAction } from "@/actions/invoices";
import { InversionPreviewDialog } from "@/components/modules/invoices/InversionPreviewDialog";
import { ImportXmlModal } from "@/components/modules/invoices/ImportXmlModal";
import { MonthlyCloseModal } from "@/components/modules/invoices/MonthlyCloseModal";
import { InversionPreparationResult } from "@/lib/services/inversion";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modais de ação rápida
  const [showImportModal, setShowImportModal] = useState(false);
  const [showInversionModal, setShowInversionModal] = useState(false);
  const [showMonthlyCloseModal, setShowMonthlyCloseModal] = useState(false);
  const [inversionData, setInversionData] = useState<InversionPreparationResult | null>(null);
  const [inversionLoadingId, setInversionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getDashboardDataAction();
      setData(res);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // Cálculo de dias restantes do certificado digital
  const getCertificadoStatus = () => {
    if (!data?.tenantInfo?.certificadoValidoAte) {
      return {
        label: "Certificado Ativo (Focus)",
        subtext: "Conexão SEFAZ pronta",
        color: "text-emerald-700",
        bg: "bg-emerald-50 text-emerald-600",
        dot: "bg-emerald-500",
      };
    }

    const expDate = new Date(data.tenantInfo.certificadoValidoAte);
    const now = new Date();
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        label: "Certificado Expirado",
        subtext: "Renovação necessária",
        color: "text-rose-700",
        bg: "bg-rose-50 text-rose-600",
        dot: "bg-rose-500",
      };
    }

    if (diffDays <= 30) {
      return {
        label: `Vence em ${diffDays} dias`,
        subtext: `Até ${formatDate(expDate)}`,
        color: "text-amber-700",
        bg: "bg-amber-50 text-amber-600",
        dot: "bg-amber-500",
      };
    }

    return {
      label: "Válido na SEFAZ",
      subtext: `${diffDays} dias restantes (${formatDate(expDate)})`,
      color: "text-emerald-700",
      bg: "bg-emerald-50 text-emerald-600",
      dot: "bg-emerald-500",
    };
  };

  const certStatus = getCertificadoStatus();

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

      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              {data?.tenantInfo?.razaoSocial || "Painel da Facção"}
            </h1>
            <button
              onClick={() => loadData(true)}
              title="Atualizar dados"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`}
              />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Visão consolidada de faturamento, retornos de industrialização e remessas recebidas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowMonthlyCloseModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <FileArchive className="w-4 h-4 text-emerald-400" />
            <span>Fechar Mês (.ZIP)</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Importar XML</span>
          </button>
          <Link
            href="/notas"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-white" />
            <span>Inverter Nota em 1 Clique</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento do Mês */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Faturamento do Mês
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
                {formatCurrency(data?.faturamentoMes || 0)}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {data?.totalRetornosMes || 0} nota(s) de retorno autorizada(s)
            </p>
          </div>
        </div>

        {/* Card 2: Volume de Peças / Devoluções */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Volume de Retornos
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 bg-slate-100 animate-pulse rounded-md w-16 mb-1"></div>
            ) : (
              <span className="text-2xl font-bold text-ink">
                {data?.totalRetornosMes || 0}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              vs. {data?.totalRemessasMes || 0} remessa(s) recebida(s) no mês
            </p>
          </div>
        </div>

        {/* Card 3: Parceiro com Maior Volume */}
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
                ? `${formatCurrency(data.parceiroTop.total)} (${data.parceiroTop.quantidadeNotas} notas)`
                : "Aguardando primeiras notas"}
            </p>
          </div>
        </div>

        {/* Card 4: Certificado Digital A1 & SEFAZ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Certificado Digital A1
            </span>
            <div className={`w-8 h-8 rounded-lg ${certStatus.bg} flex items-center justify-center`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 bg-slate-100 animate-pulse rounded-md w-24 mb-1"></div>
            ) : (
              <span className={`text-sm font-bold flex items-center gap-1.5 ${certStatus.color}`}>
                <span className={`w-2 h-2 rounded-full ${certStatus.dot} inline-block`}></span>
                {certStatus.label}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">{certStatus.subtext}</p>
          </div>
        </div>
      </div>

      {/* Middle Grid: Breakdown por Parceiro + Resumo Operacional */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico / Distribuição por Fábrica Parceira (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>Faturamento por Fábrica Parceira</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribuição percentual de receita e volume de retornos emitidos
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
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
                <p className="text-xs font-semibold text-ink">Nenhuma devolução registrada ainda</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                  Ao emitir suas notas de retorno de industrialização, a distribuição por fábrica aparecerá aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-4 my-2">
                {data.faturamentoPorParceiro.map((parceiro, index) => {
                  // Paleta de gradientes visuais suaves para cada fábrica
                  const barColors = [
                    "bg-primary",
                    "bg-emerald-500",
                    "bg-teal-500",
                    "bg-indigo-500",
                    "bg-blue-500",
                  ];
                  const barColor = barColors[index % barColors.length];

                  return (
                    <div key={parceiro.partnerId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[220px] sm:max-w-xs">
                          {parceiro.nome}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[11px]">
                            {parceiro.quantidadeNotas} nota(s)
                          </span>
                          <span className="font-bold text-ink">
                            {formatCurrency(parceiro.total)}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-500 w-10 text-right">
                            {parceiro.percentual}%
                          </span>
                        </div>
                      </div>
                      {/* Barra de Progresso */}
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.max(parceiro.percentual, 3)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Valores calculados sobre notas com status AUTORIZADA</span>
            <Link
              href="/notas"
              className="text-primary hover:text-primaryDark font-semibold flex items-center gap-1"
            >
              <span>Ver todas as notas</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Resumo Operacional & Atalhos Rápidos (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-ink mb-1">Status Operacional</h2>
            <p className="text-xs text-slate-500 mb-4">
              Rotinas fiscais e pendências de conferência
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink">Aguardando Inversão</p>
                    <p className="text-[11px] text-slate-500">Remessas prontas para retorno</p>
                  </div>
                </div>
                <span className="text-base font-bold text-amber-600">
                  {data?.pendentesInversaoCount || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink">Ambiente Fiscal</p>
                    <p className="text-[11px] text-slate-500">SEFAZ Nacional</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                  {data?.tenantInfo?.ambiente || "Homologação"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-700 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink">Sincronização MDe</p>
                    <p className="text-[11px] text-slate-500">BullMQ em 2 horas</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-600">Automático</span>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-100">
            <Link
              href="/notas"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Acessar Painel Fiscal Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Tabela Rápida: Últimas Notas Fiscais */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>Últimas Notas da Oficina</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Movimentações fiscais mais recentes processadas pelo sistema
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
              Quando notas de remessa da fábrica forem recebidas via MDe ou importadas, elas aparecerão aqui prontas para inversão em 1 clique.
            </p>
            <div className="mt-4 flex justify-center gap-2.5">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Importar 1º XML</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Tipo</th>
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

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Tipo */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isEntrada
                              ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                          }`}
                        >
                          {isEntrada ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>Remessa</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Retorno</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Documento */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-ink">
                          NF-e #{inv.numero || "S/N"}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Série {inv.serie || "1"}
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
                          {/* Se for entrada e autorizada, permite inverter em 1 clique */}
                          {isEntrada && isAutorizada && (
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
                              <span>Inverter</span>
                            </button>
                          )}

                          {/* Se houver PDF para download */}
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

      {/* Modal de Confirmação e Transmissão de Inversão */}
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
    </div>
  );
}
