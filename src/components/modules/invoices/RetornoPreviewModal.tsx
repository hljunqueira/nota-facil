"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Package,
  FileText,
  Download,
  ArrowRight,
  Loader2,
  Building2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { getRetornoConferenciaAction } from "@/actions/invoices";
import { RetornoConferenciaResult, ItemConferenciaRetorno, NotaRetornoVinculada } from "@/lib/services/inversion";

interface RetornoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string | null;
  onEmitirRetornoSaldo?: (invoiceId: string) => void;
}

export function RetornoPreviewModal({
  isOpen,
  onClose,
  invoiceId,
  onEmitirRetornoSaldo,
}: RetornoPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RetornoConferenciaResult | null>(null);

  useEffect(() => {
    if (!isOpen || !invoiceId) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await getRetornoConferenciaAction(invoiceId!);
        if (!isMounted) return;
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error || "Não foi possível carregar a conferência da nota.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Erro inesperado ao consultar conferência.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoiceId]);

  if (!isOpen) return null;

  const percentualDevolvido =
    data?.resumo.totalPecasEntrada && data.resumo.totalPecasEntrada > 0
      ? Math.min(100, Math.round((data.resumo.totalPecasDevolvidas / data.resumo.totalPecasEntrada) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold truncate">
                  Conferência de Retorno (CFOP 5902)
                </h2>
                {data && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      data.resumo.statusGeral === "CONCLUIDO"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                        : data.resumo.statusGeral === "PARCIAL"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                        : data.resumo.statusGeral === "ERRO_SEFAZ"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {data.resumo.statusGeral === "CONCLUIDO" && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {data.resumo.statusGeral === "PARCIAL" && <AlertTriangle className="w-3.5 h-3.5" />}
                    {data.resumo.statusGeral === "ERRO_SEFAZ" && <XCircle className="w-3.5 h-3.5" />}
                    {data.resumo.statusGeral === "PENDENTE" && <Clock className="w-3.5 h-3.5" />}
                    {data.resumo.statusGeral === "CONCLUIDO"
                      ? "100% Concluído"
                      : data.resumo.statusGeral === "PARCIAL"
                      ? "Retorno Parcial"
                      : data.resumo.statusGeral === "ERRO_SEFAZ"
                      ? "Rejeição SEFAZ"
                      : "Pendente"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {data
                  ? `Remessa NF-e #${data.notaEntrada.numero} · ${data.notaEntrada.fabrica.nome}`
                  : "Carregando detalhes da remessa..."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-9 h-9 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
              <p className="text-sm font-medium">Analisando remessa e notas de retorno...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Não foi possível carregar a conferência</p>
                <p className="mt-1 opacity-90">{error}</p>
              </div>
            </div>
          )}

          {data && !loading && (
            <>
              {/* CARD DE DIAGNÓSTICO PRINCIPAL */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  data.resumo.statusGeral === "CONCLUIDO"
                    ? "bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800/80"
                    : data.resumo.statusGeral === "PARCIAL"
                    ? "bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200 dark:border-amber-800/80"
                    : data.resumo.statusGeral === "ERRO_SEFAZ"
                    ? "bg-gradient-to-br from-rose-50 to-red-50/50 dark:from-rose-950/30 dark:to-red-950/20 border-rose-200 dark:border-rose-800/80"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        data.resumo.statusGeral === "CONCLUIDO"
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                          : data.resumo.statusGeral === "PARCIAL"
                          ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                          : data.resumo.statusGeral === "ERRO_SEFAZ"
                          ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                          : "bg-slate-400 text-white"
                      }`}
                    >
                      {data.resumo.statusGeral === "CONCLUIDO" ? (
                        <Sparkles className="w-5 h-5" />
                      ) : data.resumo.statusGeral === "PARCIAL" ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : data.resumo.statusGeral === "ERRO_SEFAZ" ? (
                        <XCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold">
                        {data.resumo.statusGeral === "CONCLUIDO"
                          ? "Tudo Certo com o Retorno!"
                          : data.resumo.statusGeral === "PARCIAL"
                          ? "Atenção: Retorno Parcial Identificado"
                          : data.resumo.statusGeral === "ERRO_SEFAZ"
                          ? "Rejeição na Emissão de Retorno"
                          : "Retorno Não Iniciado"}
                      </h3>
                      <p className="text-sm mt-1 text-slate-600 dark:text-slate-300">
                        {data.resumo.mensagemDiagnostico}
                      </p>
                    </div>
                  </div>

                  {/* Ação rápida se for parcial ou pendente */}
                  {(data.resumo.statusGeral === "PARCIAL" || data.resumo.statusGeral === "PENDENTE") &&
                    onEmitirRetornoSaldo && (
                      <button
                        onClick={() => {
                          onClose();
                          onEmitirRetornoSaldo(data.notaEntrada.id);
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition-all shrink-0 min-h-[44px]"
                      >
                        <span>Emitir Retorno do Saldo</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                </div>

                {/* BARRA DE PROGRESSO DO RETORNO */}
                {data.resumo.totalPecasEntrada > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-600 dark:text-slate-400">
                        Progresso de Devolução de Peças:
                      </span>
                      <span
                        className={
                          data.resumo.tudoCerto
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }
                      >
                        {data.resumo.totalPecasDevolvidas} de {data.resumo.totalPecasEntrada} peças ({percentualDevolvido}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          data.resumo.tudoCerto
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${percentualDevolvido}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                      <span>Devolvidas: {data.resumo.totalPecasDevolvidas} pcs</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        Saldo restante: {data.resumo.saldoPecasRestante} pcs
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* NOTAS FISCAIS DE RETORNO EMITIDAS */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Notas Fiscais de Retorno Emitidas ({data.notasRetornoVinculadas.length})
                </h4>

                {data.notasRetornoVinculadas.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
                    Nenhuma nota de retorno foi emitida para esta remessa até o momento.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {data.notasRetornoVinculadas.map((nr) => (
                      <div
                        key={nr.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm shadow-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white">
                              NF-e #{nr.numero}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              (Série {nr.serie})
                            </span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                nr.status === "AUTORIZADA"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                                  : nr.status === "REJEITADA"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {nr.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {nr.dataEmissao && (
                              <span>
                                Emissão: {new Date(nr.dataEmissao).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                            <span>Valor: R$ {nr.valorTotal.toFixed(2)}</span>
                            {nr.chaveAcesso && (
                              <span className="truncate max-w-[180px] font-mono" title={nr.chaveAcesso}>
                                Chave: ...{nr.chaveAcesso.slice(-8)}
                              </span>
                            )}
                          </div>

                          {/* Se for rejeitada, exibe o motivo */}
                          {nr.status === "REJEITADA" && nr.mensagemSefaz && (
                            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium bg-rose-50 dark:bg-rose-950/30 p-1.5 rounded border border-rose-200 dark:border-rose-900">
                              Rejeição: {nr.mensagemSefaz}
                            </p>
                          )}
                        </div>

                        {/* Ações da nota de retorno */}
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                          {nr.pdfUrl && (
                            <a
                              href={nr.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors min-h-[36px]"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>DANFE PDF</span>
                            </a>
                          )}
                          {nr.xmlUrl && (
                            <a
                              href={nr.xmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors min-h-[36px]"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>XML</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TABELA DE CONFERÊNCIA ITEM A ITEM */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-4 h-4" />
                    Conferência Item a Item da Remessa
                  </span>
                  <span className="text-[11px] font-normal normal-case text-slate-500">
                    {data.itens.length} item(ns) na nota original
                  </span>
                </h4>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-3 py-2.5">Item / Descrição</th>
                        <th className="px-3 py-2.5 text-center">Un.</th>
                        <th className="px-3 py-2.5 text-right">Qtd Remessa</th>
                        <th className="px-3 py-2.5 text-right">Qtd Devolvida</th>
                        <th className="px-3 py-2.5 text-right">Saldo Restante</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {data.itens.map((it) => (
                        <tr key={it.numeroItem} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2.5 max-w-[220px]">
                            <div className="font-semibold text-slate-900 dark:text-white truncate" title={it.descricao}>
                              {it.descricao}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span>Cód: {it.codigo}</span>
                              <span>·</span>
                              <span>NCM: {it.ncm}</span>
                              {it.isVestuario ? (
                                <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-medium">
                                  Peça
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                                  Insumo/Aviamento
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-600 dark:text-slate-400">
                            {it.unidade}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-900 dark:text-white">
                            {it.quantidadeEntrada}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            {it.quantidadeDevolvida}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
                            {it.saldoRestante}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                it.status === "CONCLUIDO"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                                  : it.status === "PARCIAL"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {it.status === "CONCLUIDO" && <CheckCircle2 className="w-3 h-3" />}
                              {it.status === "PARCIAL" && <AlertTriangle className="w-3 h-3" />}
                              {it.status === "PENDENTE" && <Clock className="w-3 h-3" />}
                              {it.status === "CONCLUIDO" ? "Devolvido" : it.status === "PARCIAL" ? "Parcial" : "Pendente"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {data && (
              <span>
                NF-e Referenciada obrigatória:{" "}
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  ...{data.notaEntrada.chaveAcesso.slice(-8)}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors min-h-[44px]"
            >
              Fechar
            </button>
            {data && (data.resumo.statusGeral === "PARCIAL" || data.resumo.statusGeral === "PENDENTE") && onEmitirRetornoSaldo && (
              <button
                onClick={() => {
                  onClose();
                  onEmitirRetornoSaldo(data.notaEntrada.id);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition-all min-h-[44px]"
              >
                <span>Emitir Retorno do Saldo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
