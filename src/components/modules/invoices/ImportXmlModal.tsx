"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Smartphone,
} from "lucide-react";
import { importInvoiceFileAction } from "@/actions/invoices";

interface ImportXmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoiceId: string) => void;
}

export function ImportXmlModal({ isOpen, onClose, onSuccess }: ImportXmlModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ numero: number; itens: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File | null) => {
    setError(null);
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".xml")) {
      setError("Formato não suportado. Por favor selecione um arquivo PDF (DANFE) ou XML da NF-e.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Selecione um arquivo PDF ou XML de NF-e.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await importInvoiceFileAction(formData);

      if (!res.success) {
        setError(res.error || "Erro ao processar a nota fiscal.");
        setLoading(false);
        return;
      }

      setSuccessInfo({
        numero: res.numero || 0,
        itens: res.totalItens || 0,
      });

      setTimeout(() => {
        onSuccess(res.invoiceId!);
        onClose();
        setFile(null);
        setSuccessInfo(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Falha ao enviar o arquivo.");
      setLoading(false);
    }
  };

  const isPdf = file?.name.toLowerCase().endsWith(".pdf");
  const isXml = file?.name.toLowerCase().endsWith(".xml");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink">Importar Nota Fiscal de Entrada</h3>
              <p className="text-[11px] text-slate-500">PDF do WhatsApp ou XML da fábrica parceira</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleImport} className="p-6 space-y-4">
          {/* Instrução Amigável */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Recebeu pelo WhatsApp?</strong> Você pode enviar o <strong>PDF do DANFE</strong> diretamente do celular ou computador. O sistema extrai todos os itens e calcula a inversão automaticamente.
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-900">Nota Fiscal Nº {successInfo.numero} importada com sucesso!</p>
                <p className="text-[11px] text-emerald-700">{successInfo.itens} itens extraídos e liberados para Retorno em 1 Clique.</p>
              </div>
            </div>
          )}

          {/* Dropzone Interativa */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
                : file
                ? "border-emerald-400 bg-emerald-50/30"
                : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xml"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />

            {file ? (
              <div className="space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-100 text-emerald-700">
                  {isPdf ? <FileText className="w-6 h-6" /> : <FileCode className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-ink max-w-[320px] mx-auto truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB • Formato {isPdf ? "PDF (DANFE)" : "XML SEFAZ"}
                  </p>
                </div>
                <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
                  Arquivo pronto para processamento
                </span>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-blue-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink">Toque ou arraste o arquivo aqui</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Suporta arquivos PDF (DANFE) ou XML</p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                    .PDF
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                    .XML
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !file || !!successInfo}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primaryDark disabled:opacity-60 flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extraindo Itens...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar e Liberar Retorno</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
