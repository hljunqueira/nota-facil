"use client";

import React, { useState, useEffect } from "react";
import {
  FileArchive,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  Download,
  Share2,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  Smartphone,
  MessageCircle,
} from "lucide-react";
import {
  getMonthlyCloseConfigAction,
  enqueueMonthlyCloseAction,
  getMonthlyCloseHistoryAction,
} from "@/actions/monthlyClose";

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

export function MonthlyCloseTab() {
  const now = new Date();
  const defaultMes = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultAno = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [mes, setMes] = useState<number>(defaultMes);
  const [ano, setAno] = useState<number>(defaultAno);
  const [emailContador, setEmailContador] = useState<string>("");
  const [contadorNome, setContadorNome] = useState<string | null>(null);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadData = async () => {
    setLoadingConfig(true);
    setLoadingHistory(true);

    try {
      const [cfg, hist] = await Promise.all([
        getMonthlyCloseConfigAction(),
        getMonthlyCloseHistoryAction(),
      ]);

      if (cfg.contadorEmail) {
        setEmailContador(cfg.contadorEmail);
      }
      if (cfg.contadorNome) {
        setContadorNome(cfg.contadorNome);
      }
      setHistory(hist || []);
    } catch (err: any) {
      console.error("[MonthlyCloseTab] Erro ao carregar dados:", err);
      setErrorMessage("Erro ao carregar configurações de fechamento.");
    } finally {
      setLoadingConfig(false);
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setToastMessage(null);

    try {
      const res = await enqueueMonthlyCloseAction({
        mes,
        ano,
        contadorEmail: emailContador?.trim() || undefined,
      });

      if (res.success) {
        setToastMessage(res.message);
        setTimeout(() => loadData(), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao iniciar fechamento mensal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareMobile = (zipUrl?: string) => {
    const mesNome = MESES.find((m) => m.value === mes)?.label || mes;
    const text = `📦 *Fechamento Fiscal ${mesNome}/${ano}*\n\nOlá! Segue o pacote fiscal com XMLs e relatórios de conferência contábil da oficina.\n\n${
      zipUrl ? `📥 *Download do arquivo ZIP:* ${zipUrl}` : "O pacote foi processado no sistema."
    }`;

    if (navigator.share) {
      navigator
        .share({
          title: `Fechamento Fiscal ${mesNome}/${ano}`,
          text,
          url: zipUrl || window.location.href,
        })
        .catch(() => null);
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast de Sucesso */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Alerta de Erro */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Card de Disparo do Fechamento */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <FileArchive className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-slate-900">
                Fechamento Fiscal Mensal do Contador
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Gera automaticamente o pacote ZIP com todos os XMLs, PDFs de notas autorizadas e planilha CSV de conferência para a contabilidade.
            </p>
          </div>
        </div>

        <form onSubmit={handleTriggerClose} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Mês de Referência *
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:bg-white transition-all cursor-pointer"
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Ano *
              </label>
              <input
                type="number"
                min={2020}
                max={2035}
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                E-mail do Contador (Destino)
              </label>
              <input
                type="email"
                placeholder="fiscal@contabilidade.com"
                value={emailContador}
                onChange={(e) => setEmailContador(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white transition-all"
              />
              {contadorNome && (
                <span className="text-[10px] text-slate-400 block mt-1">
                  Contador: <strong>{contadorNome}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Se o seu WhatsApp estiver conectado, o contador também receberá a notificação instantânea pelo WhatsApp.
              </span>
            </p>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                disabled={submitting || loadingConfig}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{submitting ? "Processando..." : "Gerar e Enviar Fechamento"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Histórico dos Fechamentos Anteriores */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-xs text-slate-900">
              Histórico de Fechamentos Enviados
            </h3>
          </div>
          <button
            onClick={loadData}
            disabled={loadingHistory}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
            title="Atualizar histórico"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-semibold bg-slate-50/50">
                <th className="py-2.5 px-4">Data do Envio</th>
                <th className="py-2.5 px-4">Mês/Ano</th>
                <th className="py-2.5 px-4">Qtd. Notas</th>
                <th className="py-2.5 px-4">Destinatário</th>
                <th className="py-2.5 px-4 text-right">Ações Mobile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length > 0 ? (
                history.map((h) => {
                  const detalhe = (h.detalhe as any) || {};
                  const mesAnoLabel = detalhe.mes && detalhe.ano ? `${detalhe.mes}/${detalhe.ano}` : h.entidadeId || "-";
                  const zipUrl = detalhe.zipUrl;

                  return (
                    <tr key={h.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(h.timestamp).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {mesAnoLabel}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {detalhe.totalNotas ?? "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[180px]">
                        {detalhe.contadorEmail || "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {zipUrl ? (
                            <>
                              <a
                                href={zipUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors inline-flex items-center gap-1 text-[11px]"
                                title="Baixar pacote ZIP"
                              >
                                <Download className="w-3.5 h-3.5 text-primary" />
                                <span>Baixar ZIP</span>
                              </a>

                              <button
                                onClick={() => handleShareMobile(zipUrl)}
                                type="button"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors inline-flex items-center gap-1 text-[11px] cursor-pointer"
                                title="Compartilhar pelo WhatsApp ou celular"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Concluído
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                    Nenhum fechamento registrado até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
