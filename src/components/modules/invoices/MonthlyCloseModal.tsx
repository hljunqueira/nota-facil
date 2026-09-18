"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileArchive,
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Send,
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
  // Padrão: mês anterior se não for janeiro, senão dezembro do ano anterior
  const defaultMes = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultAno = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [mes, setMes] = useState<number>(defaultMes);
  const [ano, setAno] = useState<number>(defaultAno);
  const [emailContador, setEmailContador] = useState<string>("");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoadingConfig(true);
      getMonthlyCloseConfigAction()
        .then((cfg) => {
          if (cfg.contadorEmail) {
            setEmailContador(cfg.contadorEmail);
          }
        })
        .catch((err) => console.error("Erro ao carregar e-mail do contador:", err))
        .finally(() => setLoadingConfig(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await enqueueMonthlyCloseAction({
        mes,
        ano,
        contadorEmail: emailContador.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess(
          `Fechamento de ${String(mes).padStart(2, "0")}/${ano} agendado com sucesso! O arquivo .ZIP será enviado para ${
            emailContador || "o e-mail do contador"
          }.`
        );
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Falha ao iniciar fechamento mensal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                Fechar Mês do Contador (.ZIP)
              </h2>
              <p className="text-xs text-slate-500">
                Empacotamento automático de XMLs, DANFEs e relatório fiscal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Seleção de Mês e Ano */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Mês de Competência</span>
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                disabled={submitting}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium text-ink bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
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
                disabled={submitting}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium text-ink bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              >
                {[2026, 2025, 2024].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* E-mail da Contabilidade */}
          <div>
            <label className="text-xs font-semibold text-ink mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>E-mail do Contador</span>
              </span>
              {loadingConfig && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Buscando cadastro...
                </span>
              )}
            </label>
            <input
              type="email"
              value={emailContador}
              onChange={(e) => setEmailContador(e.target.value)}
              placeholder="ex: fiscal@contabilidade.com.br"
              disabled={submitting}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-ink placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              O pacote .ZIP com todos os XMLs e PDFs autorizados será enviado diretamente para este e-mail.
            </p>
          </div>

          {/* Card explicativo */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>O que está incluído no pacote:</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-5">
              <li>Pasta <code>xml/</code> com todos os arquivos XMLs autorizados</li>
              <li>Pasta <code>pdf/</code> com todos os DANFEs oficiais em PDF</li>
              <li>Arquivo <code>Relatorio_Fiscal.csv</code> pronto para importação contábil</li>
              <li>Cópia de segurança salva na nuvem (Cloudflare R2)</li>
            </ul>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enfileirando fechamento...</span>
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
    </div>
  );
}
