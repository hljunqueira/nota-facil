"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Send,
  Loader2,
  FileText,
  Code2,
  AlertCircle,
  Building2,
  Plus,
  Trash2,
} from "lucide-react";
import { sendInvoiceEmailAction } from "@/actions/invoices";

export interface SendInvoiceEmailModalProps {
  isOpen: boolean;
  invoice: {
    id: string;
    numero: number | null;
    serie: number | null;
    chaveAcesso?: string | null;
    valorTotal: number;
    modalidade?: string | null;
    partnerNome?: string | null;
    partnerEmail?: string | null;
    pdfUrl?: string | null;
    xmlUrl?: string | null;
  } | null;
  tenantName?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function SendInvoiceEmailModal({
  isOpen,
  invoice,
  tenantName,
  onClose,
  onSuccess,
}: SendInvoiceEmailModalProps) {
  const [toEmail, setToEmail] = useState("");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [newCc, setNewCc] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setToEmail(invoice.partnerEmail || "");
      setCcEmails([]);
      setNewCc("");
      setError(null);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const isCobranca =
    invoice.modalidade === "COBRANCA_INDUSTRIALIZACAO" || invoice.modalidade === "CONJUNTA";
  const modalidadeLabel = isCobranca
    ? "Cobrança de Serviços (CFOP 5124)"
    : "Retorno de Insumos (CFOP 5902)";

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const handleAddCc = () => {
    const clean = newCc.trim().toLowerCase();
    if (!clean || !clean.includes("@")) return;
    if (!ccEmails.includes(clean) && clean !== toEmail.toLowerCase().trim()) {
      setCcEmails([...ccEmails, clean]);
      setNewCc("");
    }
  };

  const handleRemoveCc = (index: number) => {
    setCcEmails(ccEmails.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTo = toEmail.trim().toLowerCase();
    if (!cleanTo || !cleanTo.includes("@")) {
      setError("Informe um e-mail válido para o destinatário.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await sendInvoiceEmailAction({
        invoiceId: invoice.id,
        toEmail: cleanTo,
        ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
      });

      if (!res.success) {
        setError(res.error || "Erro ao enviar e-mail.");
        return;
      }

      onSuccess(res.message || "NF-e enviada por e-mail com sucesso!");
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao enviar e-mail.");
    } finally {
      setSending(false);
    }
  };

  const senderDisplayName = tenantName || "Sua Confecção";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-email-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 transition-all animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 id="send-email-title" className="text-base font-bold text-slate-900">
                Enviar NF-e por E-mail
              </h2>
              <p className="text-xs text-slate-500">
                Disparo com DANFE em PDF e XML da SEFAZ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Tenant Sender Callout */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-950">
                <span className="font-semibold text-emerald-900">Identificação no Remetente:</span>
                <p className="mt-0.5 font-medium text-emerald-900">
                  {senderDisplayName} via Nota Fácil{" "}
                  <span className="text-emerald-700 font-mono text-[11px]">&lt;notas@appnotafacil.online&gt;</span>
                </p>
                <p className="mt-1 text-[11px] text-emerald-800">
                  As respostas da fábrica serão encaminhadas diretamente para o e-mail da sua confecção.
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800">
                NF-e Nº {invoice.numero || "S/N"} (Série {invoice.serie || 1})
              </span>
              <span className="font-bold text-primary text-sm">
                {formatCurrency(invoice.valorTotal)}
              </span>
            </div>
            <div className="text-slate-600">
              <span className="font-medium">{modalidadeLabel}</span>
              {invoice.partnerNome && <span> • Destinatário: <strong>{invoice.partnerNome}</strong></span>}
            </div>

            {/* Anexos */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2 items-center">
              <span className="text-[11px] font-semibold text-slate-500">Anexos inclusos:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700">
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                DANFE (PDF)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700">
                <Code2 className="w-3.5 h-3.5 text-emerald-600" />
                XML SEFAZ
              </span>
            </div>
          </div>

          {/* Destinatário Principal */}
          <div>
            <label htmlFor="toEmail" className="block text-xs font-semibold text-slate-700 mb-1">
              E-mail do Destinatário <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="toEmail"
                type="email"
                required
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="financeiro@empresa.com.br ou fiscal@empresa.com.br"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isCobranca
                ? "Recomendado: E-mail do setor financeiro ou contábil da fábrica."
                : "Recomendado: E-mail do setor de expedição, almoxarifado ou fiscal da fábrica."}
            </p>
          </div>

          {/* E-mails em Cópia (CC) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-mails em Cópia (CC) <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newCc}
                onChange={(e) => setNewCc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCc();
                  }
                }}
                placeholder="Adicionar outro e-mail e pressionar +"
                className="flex-1 px-3.5 py-2 bg-slate-50/70 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={handleAddCc}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>

            {ccEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ccEmails.map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveCc(idx)}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={sending}
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white bg-primary hover:bg-primaryDark font-semibold text-xs shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando Documentos...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Disparar E-mail</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
