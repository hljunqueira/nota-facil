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
  Mail,
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
  const [downloading, setDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const downloadUrl = `/api/contador/download?mes=${mes}&ano=${ano}`;
  const mesNome = MESES.find((m) => m.value === mes)?.label || String(mes);

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
      setErrorMessage("Erro ao carregar dados do contador.");
    } finally {
      setLoadingConfig(false);
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. Download Direto no Celular ou Computador
  const handleDownloadDirect = () => {
    setDownloading(true);
    setErrorMessage(null);
    try {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `Notas_Contador_${String(mes).padStart(2, "0")}_${ano}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToastMessage("Download iniciado! O arquivo .ZIP está sendo salvo no seu aparelho.");
    } catch {
      setErrorMessage("Não foi possível iniciar o download automático.");
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  // 2. Disparo por E-mail
  const handleSendEmail = async (e: React.FormEvent) => {
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
        setToastMessage(`Notas enviadas com sucesso para ${emailContador}!`);
        setTimeout(() => loadData(), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao enviar notas para o contador.");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Compartilhar / Enviar no WhatsApp
  const handleShareWhatsApp = (customUrl?: string) => {
    const url = customUrl || `${window.location.origin}${downloadUrl}`;
    const text = `📦 *Envio de Notas Fiscais — ${mesNome}/${ano}*\n\nOlá! Segue o pacote compactado (.ZIP) com todas as notas fiscais autorizadas, DANFEs em PDF e relatório de conferência contábil da oficina.\n\n📥 *Link para Baixar o Arquivo:* ${url}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `Notas Fiscais ${mesNome}/${ano}`,
          text,
          url,
        })
        .catch(() => {
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
        });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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
            className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
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
            className="text-rose-700 hover:text-rose-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Card Principal: Enviar para o Contador */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-slate-900">
                Enviar Notas para o Contador
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Baixe o pacote (.ZIP) no celular ou computador, ou envie diretamente para a sua contabilidade por WhatsApp e e-mail.
            </p>
          </div>
        </div>

        {/* Seleção do Mês e Ano */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
        </div>

        {/* BOX 1: BAIXAR NO CELULAR OU COMPUTADOR (OPÇÃO EM DESTAQUE) */}
        <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Opção 1: Baixar no Celular ou Computador
              </span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Gera o arquivo <strong>.ZIP</strong> com todos os XMLs, PDFs e planilha de conferência para salvar direto no seu dispositivo.
              </p>
            </div>
            <span className="self-start sm:self-auto text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full whitespace-nowrap">
              Download Imediato
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadDirect}
              disabled={downloading}
              className="flex-1 min-w-[220px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Baixar no Celular ou Computador (.ZIP)</span>
            </button>

            <button
              type="button"
              onClick={() => handleShareWhatsApp()}
              className="py-2.5 px-4 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-800 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Enviar por WhatsApp</span>
            </button>
          </div>
        </div>

        {/* BOX 2: ENVIAR POR E-MAIL AO CONTADOR */}
        <form onSubmit={handleSendEmail} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-primary" />
              Opção 2: Enviar Diretamente por E-mail
            </span>
            {loadingConfig && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Buscando cadastro...
              </span>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">
              E-mail do Contador
            </label>
            <input
              type="email"
              value={emailContador}
              onChange={(e) => setEmailContador(e.target.value)}
              placeholder="fiscal@contabilidade.com.br"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:border-primary transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {contadorNome
                ? `Contador vinculado: ${contadorNome}`
                : "Informe o e-mail da sua contabilidade para envio automático."}
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando e-mail...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Disparar por E-mail</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Histórico de Envios Anteriores */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-800">
              Histórico de Envios para a Contabilidade
            </h3>
          </div>
          <button
            onClick={loadData}
            disabled={loadingHistory}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            title="Atualizar histórico"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Carregando histórico...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhum envio registrado ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {history.map((log) => {
              const detalhe = (log.detalhe as any) || {};
              const zipUrl = detalhe.zipUrl;
              return (
                <div
                  key={log.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">
                        Competência {detalhe.mesAno || log.entidadeId}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {log.acao === "FECHAMENTO_MENSAL_CONCLUIDO" ? "Concluído" : "Processando"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {detalhe.totalNotas !== undefined
                        ? `${detalhe.totalNotas} nota(s) incluída(s)`
                        : "Notas empacotadas"}
                      {detalhe.contadorEmail ? ` • Enviado para ${detalhe.contadorEmail}` : ""}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {zipUrl ? (
                      <a
                        href={zipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        title="Baixar cópia ZIP"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar ZIP</span>
                      </a>
                    ) : (
                      <button
                        onClick={handleDownloadDirect}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        title="Baixar pacote"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar ZIP</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleShareWhatsApp(zipUrl)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                      title="Compartilhar no WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
