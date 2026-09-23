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
  Trash2,
  Plus,
} from "lucide-react";
import { importInvoiceBatchAction } from "@/actions/invoices";

interface ImportXmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoiceId?: string) => void;
}

export function ImportXmlModal({ isOpen, onClose, onSuccess }: ImportXmlModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<{
    totalImportados: number;
    totalDuplicados: number;
    totalErros: number;
    mensagens: string[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddFiles = (newFiles: FileList | File[] | null) => {
    setError(null);
    if (!newFiles || newFiles.length === 0) return;

    const validFiles: File[] = [];
    const rejectedNames: string[] = [];

    Array.from(newFiles).forEach((f) => {
      const name = f.name.toLowerCase();
      if (name.endsWith(".pdf") || name.endsWith(".xml")) {
        // Evita duplicata na própria lista de seleção
        if (!files.some((existing) => existing.name === f.name && existing.size === f.size)) {
          validFiles.push(f);
        }
      } else {
        rejectedNames.push(f.name);
      }
    });

    if (rejectedNames.length > 0) {
      setError(`Arquivos ignorados por formato inválido: ${rejectedNames.join(", ")}. Apenas PDF e XML são aceitos.`);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Selecione pelo menos um arquivo PDF ou XML de NF-e.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((f) => {
        formData.append("files", f);
      });

      const res = await importInvoiceBatchAction(formData);

      if (!res.success && res.totalImportados === 0 && res.totalDuplicados === 0) {
        setError(res.error || "Erro ao processar as notas fiscais.");
        setLoading(false);
        return;
      }

      const mensagens: string[] = [];
      res.resultados.forEach((r) => {
        if (r.success) {
          mensagens.push(`NF-e Nº ${r.numero || "S/N"} importada com sucesso.`);
        } else if (r.duplicada) {
          mensagens.push(`NF-e Nº ${r.numero || "S/N"} já estava importada (ignorado).`);
        } else if (r.error) {
          mensagens.push(`${r.fileName}: ${r.error}`);
        }
      });

      setBatchResult({
        totalImportados: res.totalImportados,
        totalDuplicados: res.totalDuplicados,
        totalErros: res.totalErros,
        mensagens,
      });

      const firstSuccessId = res.resultados.find((r) => r.success && r.invoiceId)?.invoiceId;

      setTimeout(() => {
        onSuccess(firstSuccessId);
        onClose();
        setFiles([]);
        setBatchResult(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Falha ao enviar os arquivos.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-fadeIn max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink">Importar Remessa da Fábrica</h3>
              <p className="text-[11px] text-slate-500">PDFs do WhatsApp ou XMLs recebidos da confecção parceira</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleImport} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Instrução Amigável */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Recebeu vários PDFs pelo WhatsApp?</strong> Você pode selecionar ou arrastar <strong>várias notas de uma só vez</strong>. O sistema extrai todos os itens, insumos e dados de transporte de cada remessa automaticamente.
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {batchResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="font-bold text-emerald-950 text-sm">
                  {batchResult.totalImportados} nota(s) importada(s) com sucesso!
                </p>
              </div>
              {batchResult.totalDuplicados > 0 && (
                <p className="text-[11px] text-emerald-700">
                  {batchResult.totalDuplicados} nota(s) já estavam cadastradas e foram preservadas.
                </p>
              )}
              {batchResult.totalErros > 0 && (
                <p className="text-[11px] text-amber-700">
                  {batchResult.totalErros} arquivo(s) não puderam ser processados.
                </p>
              )}
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
                : files.length > 0
                ? "border-blue-300 bg-slate-50/70"
                : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xml"
              className="hidden"
              onChange={(e) => handleAddFiles(e.target.files)}
            />

            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-blue-600">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-ink">Toque para escolher ou arraste os arquivos aqui</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Selecione um ou vários arquivos PDF (DANFE) ou XML
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                  + Múltiplos Arquivos
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                  .PDF / .XML
                </span>
              </div>
            </div>
          </div>

          {/* Lista de Arquivos Selecionados */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Notas Prontas para Envio ({files.length})
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-primary hover:text-primaryDark flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar mais</span>
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {files.map((f, idx) => {
                  const isPdf = f.name.toLowerCase().endsWith(".pdf");
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${isPdf ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {isPdf ? <FileText className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink truncate max-w-[260px] sm:max-w-[360px]">
                            {f.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {(f.size / 1024).toFixed(1)} KB • {isPdf ? "DANFE PDF" : "XML SEFAZ"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remover arquivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || files.length === 0 || !!batchResult}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primaryDark disabled:opacity-60 flex items-center gap-2 shadow-xs transition-all cursor-pointer min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importando {files.length} nota(s)...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>
                    {files.length > 1
                      ? `Importar ${files.length} Notas Fiscais`
                      : "Importar Nota e Liberar Retorno"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
