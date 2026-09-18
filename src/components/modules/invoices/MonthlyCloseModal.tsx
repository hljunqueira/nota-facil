"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileArchive,
  Mail,
  Calendar,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Send,
  Smartphone,
  MessageCircle,
} from "lucide-react";
import {
  enqueueMonthlyCloseAction,
  getMonthlyCloseConfigAction,
} from "@/actions/monthlyClose";

interface MonthlyCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

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

export function MonthlyCloseModal({
  isOpen,
  onClose,
  onSuccess,
}: MonthlyCloseModalProps) {
  const now = new Date();
  const defaultMes = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultAno = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [mes, setMes] = useState<number>(defaultMes);
  const [ano, setAno] = useState<number>(defaultAno);
  const [emailContador, setEmailContador] = useState<string>("");
  const [contadorNome, setContadorNome] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setLoadingConfig(true);
      getMonthlyCloseConfigAction()
        .then((cfg) => {
          if (cfg.contadorEmail) {
            setEmailContador(cfg.contadorEmail);
          }
          if (cfg.contadorNome) {
            setContadorNome(cfg.contadorNome);
          }
        })
        .catch((err) => console.error("Erro ao carregar dados do contador:", err))
        .finally(() => setLoadingConfig(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const downloadUrl = `/api/contador/download?mes=${mes}&ano=${ano}`;
  const mesNome = MESES.find((m) => m.value === mes)?.label || String(mes);

  // 1. Download Direto no Celular ou Computador
  const handleDownloadDirect = () => {
    setDownloadingZip(true);
    setError(null);
    try {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `Notas_Contador_${String(mes).padStart(2, "0")}_${ano}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMsg("Download iniciado! O arquivo .ZIP está sendo salvo no seu aparelho.");
      setTimeout(() => {
        if (onSuccess) onSuccess("Download do pacote de notas iniciado com sucesso!");
      }, 1500);
    } catch (err: any) {
      setError("Não foi possível iniciar o download automático.");
    } finally {
      setTimeout(() => setDownloadingZip(false), 2000);
    }
  };

  // 2. Enviar ou Compartilhar no WhatsApp
  const handleShareWhatsApp = () => {
    const fullUrl = `${window.location.origin}${downloadUrl}`;
    const textMsg =
      `*Nota Fácil — Envio de Notas Fiscais*\n` +
      `📅 *Competência:* ${mesNome} / ${ano}\n` +
      `📁 Segue o link direto para baixar o pacote de notas fiscais (.ZIP):\n${fullUrl}\n\n` +
      `_Contém todos os XMLs autorizados, DANFEs em PDF e relatório para importação contábil._`;

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `Notas Fiscais - ${mesNome}/${ano}`,
          text: textMsg,
          url: fullUrl,
        })
        .catch(() => {
          window.open(`https://wa.me/?text=${encodeURIComponent(textMsg)}`, "_blank");
        });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(textMsg)}`, "_blank");
    }
  };

  // 3. Enviar por E-mail
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailContador.trim()) {
      setError("Por favor, digite o e-mail do contador.");
      return;
    }

    setSubmittingEmail(true);
    setError(null);

    try {
      await enqueueMonthlyCloseAction({
        mes,
        ano,
        contadorEmail: emailContador.trim(),
      });

      setSuccessMsg(`Pacote de notas enviado com sucesso para ${emailContador}!`);
      if (onSuccess) {
        onSuccess(`Notas de ${mesNome}/${ano} enviadas para ${emailContador}!`);
      }
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.message || "Falha ao enviar e-mail para o contador.");
    } finally {
      setSubmittingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                Enviar para o Contador
              </h2>
              <p className="text-xs text-slate-500">
                Baixe no celular/computador ou envie os XMLs e PDFs diretamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submittingEmail}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Seleção de Mês e Ano */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Mês das Notas</span>
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                disabled={submittingEmail}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-ink bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Ano
              </label>
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                disabled={submittingEmail}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-ink bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              >
                {[2026, 2025, 2024].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* OPÇÃO 1: BAIXAR NO CELULAR OU COMPUTADOR (DESTAQUE) */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Opção 1: Baixar no Aparelho
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Download Imediato
              </span>
            </div>
            <p className="text-[11px] text-emerald-900/80 leading-relaxed">
              Baixa o arquivo compactado <strong>.ZIP</strong> com todos os XMLs, PDFs e Relatório no seu celular ou computador.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadDirect}
                disabled={downloadingZip}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {downloadingZip ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Baixar no Celular ou Computador (.ZIP)</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                title="Compartilhar no WhatsApp"
                className="py-2.5 px-3.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* OPÇÃO 2: ENVIAR POR E-MAIL */}
          <form onSubmit={handleSendEmail} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-primary" />
                Opção 2: Enviar por E-mail ao Contador
              </span>
              {loadingConfig && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Buscando...
                </span>
              )}
            </div>

            <div>
              <input
                type="email"
                value={emailContador}
                onChange={(e) => setEmailContador(e.target.value)}
                placeholder="ex: fiscal@contabilidade.com.br"
                disabled={submittingEmail}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-ink placeholder:text-slate-400 bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {contadorNome ? `Contador cadastrado: ${contadorNome}` : "Digite o e-mail da sua contabilidade."}
              </p>
            </div>

            <button
              type="submit"
              disabled={submittingEmail}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {submittingEmail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-emerald-400" />
              )}
              <span>Disparar por E-mail</span>
            </button>
          </form>

          {/* Card explicativo */}
          <div className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200/60 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>O que vai no pacote:</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Arquivos XMLs autorizados pela SEFAZ, DANFEs em PDF de cada nota e a planilha de resumo para o contador importar no sistema dele.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-white text-xs font-semibold text-slate-700 transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
