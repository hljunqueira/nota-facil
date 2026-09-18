"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileArchive,
  Mail,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  ExternalLink,
  FileText,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  getMonthlyCloseConfigAction,
  enqueueMonthlyCloseAction,
  getMonthlyCloseHistoryAction,
} from "@/actions/monthlyClose";
import { MonthlyCloseModal } from "@/components/modules/invoices/MonthlyCloseModal";

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

export default function FechamentoPage() {
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
  const [showModal, setShowModal] = useState(false);

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
      console.error("Erro ao carregar dados do fechamento:", err);
    } finally {
      setLoadingConfig(false);
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await enqueueMonthlyCloseAction({
        mes,
        ano,
        contadorEmail: emailContador.trim() || undefined,
      });

      setToastMessage(
        `Fechamento de ${String(mes).padStart(2, "0")}/${ano} agendado com sucesso! O arquivo .ZIP será despachado para ${
          emailContador || "o e-mail do contador"
        }.`
      );
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao iniciar fechamento mensal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automação Contábil</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Fechamento Mensal do Contador
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Gere o pacote fiscal completo (.ZIP com todos os XMLs de entrada, retorno de industrialização e relatórios) e envie diretamente para o escritório contábil em 1 clique.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
        >
          <FileArchive className="w-4 h-4" />
          <span>Novo Fechamento</span>
        </button>
      </div>

      {/* Alertas */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
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

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-700 font-bold hover:underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cards Informativos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Mail className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-ink">E-mail do Contador</h2>
          <p className="text-xs text-slate-500 mt-1">
            {emailContador ? (
              <span className="font-semibold text-slate-700">
                {emailContador} {contadorNome ? `(${contadorNome})` : ""}
              </span>
            ) : (
              <span className="text-amber-600">Nenhum contador configurado ainda.</span>
            )}
          </p>
          <Link
            href="/configuracoes"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primaryDark mt-3"
          >
            <span>Gerenciar contatos</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-ink">Envio Automático</h2>
          <p className="text-xs text-slate-500 mt-1">
            Todo dia <strong>1º de cada mês</strong>, o Nota Fácil empacota e envia os arquivos do mês anterior automaticamente.
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-3">
            <CheckCircle2 className="w-3 h-3" />
            Ativado na sua conta
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <Layers className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-ink">Conteúdo do Pacote .ZIP</h2>
          <p className="text-xs text-slate-500 mt-1">
            XMLs de entrada (5.901), XMLs emitidos (5.902 / 5.124), DANFEs em PDF e relatório analítico de conciliação.
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 mt-3">
            Padrão contábil nacional
          </span>
        </div>
      </div>

      {/* Formulário de Disparo Rápido */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <FileArchive className="w-5 h-5 text-primary" />
              Disparar Fechamento Manual
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha a competência desejada e confirme o envio para o contador ou para download.
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerateClose} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mês de Competência
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({String(m.value).padStart(2, "0")})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ano
              </label>
              <input
                type="number"
                min={2020}
                max={2030}
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              E-mail de Envio (Contador ou Financeiro)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={emailContador}
                onChange={(e) => setEmailContador(e.target.value)}
                placeholder="contador@escritorio.com.br"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              O pacote .ZIP será anexado e despachado automaticamente via e-mail.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !emailContador}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold shadow-md shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando e Enfileirando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gerar Fechamento e Enviar (.ZIP)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Histórico Recente de Fechamentos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Histórico de Fechamentos</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Registros e auditorias dos fechamentos mensais processados pela plataforma
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loadingHistory}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Atualizar histórico"
          >
            <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            Carregando histórico...
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <FileArchive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            Nenhum fechamento disparado ainda. Utilize o formulário acima para gerar seu primeiro fechamento!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Data/Hora</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Detalhes</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {new Date(h.timestamp || h.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {h.acao === "FECHAMENTO_MENSAL_CONCLUIDO"
                        ? "Fechamento Concluído"
                        : "Fechamento Iniciado"}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {typeof h.detalhe === "object" && h.detalhe ? (
                        <span>
                          {h.detalhe.mes && h.detalhe.ano
                            ? `Competência: ${String(h.detalhe.mes).padStart(2, "0")}/${h.detalhe.ano} • Destinatário: ${
                                h.detalhe.contadorEmail || "Contador"
                              }`
                            : JSON.stringify(h.detalhe)}
                        </span>
                      ) : (
                        <span>{String(h.detalhe || "Processamento registrado")}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Sucesso
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <MonthlyCloseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={(msg) => {
          setToastMessage(msg);
          loadData();
        }}
      />
    </div>
  );
}
