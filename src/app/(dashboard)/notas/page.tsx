"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  RefreshCw,
  Upload,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Send,
  FileArchive,
  FileX,
  MessageCircle,
} from "lucide-react";
import {
  getInvoicesAction,
  getInversionPreviewAction,
  checkInvoiceStatusAction,
} from "@/actions/invoices";
import { InversionPreviewDialog } from "@/components/modules/invoices/InversionPreviewDialog";
import { ImportXmlModal } from "@/components/modules/invoices/ImportXmlModal";
import { MonthlyCloseModal } from "@/components/modules/invoices/MonthlyCloseModal";
import { CancelInvoiceModal } from "@/components/modules/invoices/CancelInvoiceModal";
import { InversionPreparationResult } from "@/lib/services/inversion";

export default function NotasPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fechamento Mensal Contador
  const [showMonthlyCloseModal, setShowMonthlyCloseModal] = useState(false);

  // Cancelamento de NF-e
  const [selectedInvoiceForCancel, setSelectedInvoiceForCancel] = useState<any | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [statusCheckingId, setStatusCheckingId] = useState<string | null>(null);

  // Inversão
  const [inversionLoadingId, setInversionLoadingId] = useState<string | null>(null);
  const [inversionData, setInversionData] = useState<InversionPreparationResult | null>(null);
  const [showInversionModal, setShowInversionModal] = useState(false);

  // Importação
  const [showImportModal, setShowImportModal] = useState(false);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await getInvoicesAction({
        tipo: tipoFilter,
        status: statusFilter,
        search,
      });
      setInvoices(data);
    } catch (err) {
      console.error("Erro ao carregar notas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [tipoFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices();
  };

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

  const handleCheckStatus = async (invoiceId: string) => {
    setStatusCheckingId(invoiceId);
    try {
      const res = await checkInvoiceStatusAction(invoiceId);
      if (res.success) {
        setToastMessage(res.message);
        loadInvoices();
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
    const shareText = `*Nota Fácil — NF-e Nº ${inv.numero} (Série ${inv.serie})*\n` +
      `📄 *Destinatário/Emissor:* ${partnerName}\n` +
      `💰 *Valor Total:* ${formattedValue}\n` +
      `🔑 *Chave SEFAZ:* ${inv.chaveAcesso || "Aguardando homologação"}\n` +
      (inv.pdfUrl ? `📥 *DANFE (PDF):* ${inv.pdfUrl}\n` : "") +
      (inv.xmlUrl ? `📁 *XML SEFAZ:* ${inv.xmlUrl}\n` : "");

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: `NF-e Nº ${inv.numero} - ${partnerName}`,
        text: shareText,
        url: inv.pdfUrl || window.location.href,
      }).catch(() => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
      });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Gestão de Notas Fiscais
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Receba notas de remessa da fábrica e gere o retorno fiscal em 1 clique
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/configuracoes?tab=fechamento"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <FileArchive className="w-4 h-4 text-emerald-400" />
            <span>Fechamento Mensal (.ZIP)</span>
          </Link>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Importar XML</span>
          </button>
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
            className="text-emerald-700 font-bold hover:underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Chave de Acesso da SEFAZ ou Fábrica..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs cursor-pointer"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="ENTRADA">Entrada (Remessa)</option>
            <option value="SAIDA">Retorno / Saída (Devolução)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="AUTORIZADA">Autorizada</option>
            <option value="PENDENTE">Pendente</option>
            <option value="REJEITADA">Rejeitada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Tabela de Notas */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Carregando notas fiscais...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-ink">Nenhuma nota fiscal encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Importe o primeiro arquivo XML emitido pela fábrica parceira para liberar a inversão em 1 clique.
          </p>
          <div className="mt-4">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar 1º XML</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Tipo & NF-e</th>
                  <th className="py-3.5 px-4">Fábrica / Parceiro</th>
                  <th className="py-3.5 px-4">Chave de Acesso</th>
                  <th className="py-3.5 px-4">Valor Total</th>
                  <th className="py-3.5 px-4">Status SEFAZ</th>
                  <th className="py-3.5 px-4 text-right">Ações Fiscais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            inv.tipo === "ENTRADA"
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
                          <p className="font-bold text-ink">
                            NF-e Nº {inv.numero} (Série {inv.serie})
                          </p>
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              inv.tipo === "ENTRADA"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {inv.tipo === "ENTRADA" ? "Entrada / Remessa" : "Retorno / Devolução"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink">
                        {inv.partner?.razaoSocial || "Fábrica Parceira"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {inv.partner?.cnpj || "-"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-600 max-w-[200px] truncate" title={inv.chaveAcesso}>
                      {inv.chaveAcesso || "Aguardando SEFAZ"}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-ink">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(inv.valorTotal))}
                    </td>

                    <td className="py-3.5 px-4">
                      {inv.status === "AUTORIZADA" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Autorizada
                        </span>
                      ) : inv.status === "PENDENTE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" />
                          Processando
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                          {inv.status}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão de Inversão em 1 Clique (disponível para notas de ENTRADA) */}
                        {inv.tipo === "ENTRADA" && (
                          <button
                            onClick={() => handleStartInversion(inv.id)}
                            disabled={inversionLoadingId === inv.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primaryDark text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer disabled:opacity-60"
                          >
                            {inversionLoadingId === inv.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            <span>Inverter (1 Clique)</span>
                          </button>
                        )}

                        {/* Ações para notas de SAÍDA */}
                        {inv.tipo === "SAIDA" && (
                          <>
                            {/* Consulta manual de status SEFAZ */}
                            <button
                              onClick={() => handleCheckStatus(inv.id)}
                              disabled={statusCheckingId === inv.id}
                              title="Consultar status atualizado na SEFAZ"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 text-slate-600 ${
                                  statusCheckingId === inv.id ? "animate-spin text-primary" : ""
                                }`}
                              />
                            </button>

                            {/* Cancelamento na SEFAZ (disponível se autorizada ou pendente) */}
                            {(inv.status === "AUTORIZADA" || inv.status === "PENDENTE") && (
                              <button
                                onClick={() => handleOpenCancel(inv)}
                                title="Cancelar NF-e na SEFAZ (até 24h)"
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
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink"
                            title="Baixar DANFE PDF"
                          >
                            <Download className="w-4 h-4 text-red-600" />
                          </a>
                        )}

                        {inv.xmlUrl && (
                          <a
                            href={inv.xmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink"
                            title="Baixar XML SEFAZ"
                          >
                            <FileText className="w-4 h-4 text-blue-600" />
                          </a>
                        )}

                        {/* Compartilhar / WhatsApp pelo celular */}
                        {inv.status === "AUTORIZADA" && (
                          <button
                            onClick={() => handleShareInvoice(inv)}
                            title="Enviar por WhatsApp / Compartilhar no Celular"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
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
          loadInvoices();
        }}
      />

      <ImportXmlModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={(newInvoiceId) => {
          setToastMessage("XML importado com sucesso!");
          loadInvoices();
          // Opcional: já inicia a inversão imediatamente
          handleStartInversion(newInvoiceId);
        }}
      />

      <MonthlyCloseModal
        isOpen={showMonthlyCloseModal}
        onClose={() => setShowMonthlyCloseModal(false)}
        onSuccess={(msg) => {
          setToastMessage(msg);
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
          loadInvoices();
        }}
      />
    </div>
  );
}
