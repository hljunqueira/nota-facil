"use client";

import React, { useState } from "react";
import {
  Download,
  Copy,
  Check,
  Share2,
  FileText,
  ExternalLink,
  Eye,
} from "lucide-react";

interface PublicInvoiceActionsProps {
  invoiceId: string;
  numero: number;
  serie: number;
  chaveAcesso?: string | null;
  partnerNome?: string | null;
  hasPdf: boolean;
  hasXml: boolean;
}

export function PublicInvoiceActions({
  invoiceId,
  numero,
  serie,
  chaveAcesso,
  partnerNome,
  hasPdf,
  hasXml,
}: PublicInvoiceActionsProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const pdfDownloadUrl = `/api/public/nfe/${invoiceId}/pdf?download=true`;
  const pdfViewUrl = `/api/public/nfe/${invoiceId}/pdf`;
  const xmlDownloadUrl = `/api/public/nfe/${invoiceId}/xml`;

  const handleCopyKey = () => {
    if (!chaveAcesso) return;
    navigator.clipboard.writeText(chaveAcesso.replace(/\D/g, ""));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    const text =
      `*Nota Fiscal Eletrônica — NF-e Nº ${numero} (Série ${serie})*\n` +
      (partnerNome ? `📄 *Destinatário:* ${partnerNome}\n` : "") +
      (chaveAcesso ? `🔑 *Chave SEFAZ:* ${chaveAcesso}\n\n` : "\n") +
      `📥 *Acesse e baixe o DANFE (PDF) e XML pelo link público:*\n` +
      `${currentUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Botões Principais de Ação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Baixar DANFE (PDF) - Ação Primária em Destaque */}
        <a
          href={pdfDownloadUrl}
          className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all min-h-[48px] cursor-pointer"
        >
          <Download className="w-5 h-5 text-emerald-100" />
          <span>Baixar DANFE (PDF)</span>
        </a>

        {/* Baixar XML da SEFAZ */}
        <a
          href={xmlDownloadUrl}
          className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-slate-900/10 transition-all min-h-[48px] cursor-pointer"
        >
          <FileText className="w-5 h-5 text-slate-300" />
          <span>Baixar Arquivo XML</span>
        </a>
      </div>

      {/* Ações Secundárias: Visualizar e Compartilhar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Visualizar no Navegador */}
          <a
            href={pdfViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors min-h-[40px] cursor-pointer"
            title="Abrir DANFE em uma nova aba"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            <span>Visualizar em Nova Aba</span>
          </a>

          {/* Toggle de Prévia Inline (Desktop/Tablet) */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors min-h-[40px] cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>{showPreview ? "Ocultar Prévia" : "Prévia da Nota"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Copiar Link */}
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors min-h-[40px] cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          {/* Compartilhar WhatsApp */}
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] font-bold text-xs transition-colors min-h-[40px] cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-[#25D366]" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Caixa da Chave de Acesso SEFAZ */}
      {chaveAcesso && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Chave de Acesso SEFAZ (44 dígitos)
            </span>
            <button
              onClick={handleCopyKey}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              {copiedKey ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold text-[11px]">Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px]">Copiar Chave</span>
                </>
              )}
            </button>
          </div>
          <p className="font-mono text-xs sm:text-sm text-slate-800 break-all select-all tracking-wider font-semibold">
            {chaveAcesso.replace(/(\d{4})/g, "$1 ").trim()}
          </p>
        </div>
      )}

      {/* Visualizador de PDF Embutido (quando ativado) */}
      {showPreview && (
        <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-100">
          <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Visualização Direta do DANFE (PDF)
            </span>
            <a
              href={pdfDownloadUrl}
              className="inline-flex items-center gap-1 text-slate-300 hover:text-white underline text-[11px]"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Arquivo
            </a>
          </div>
          <iframe
            src={pdfViewUrl}
            title={`DANFE NF-e Nº ${numero}`}
            className="w-full h-[650px] border-0"
          />
        </div>
      )}
    </div>
  );
}
