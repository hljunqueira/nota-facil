"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  X,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Send,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { executeInversionAction } from "@/actions/invoices";
import { InversionPreparationResult, InvertedItem } from "@/lib/services/inversion";
import { FiscalErrorAlert } from "@/components/ui/FiscalErrorAlert";

interface InversionPreviewDialogProps {
  inversionData: InversionPreparationResult | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInvoiceNumero: number) => void;
}

export function InversionPreviewDialog({
  inversionData,
  isOpen,
  onClose,
  onSuccess,
}: InversionPreviewDialogProps) {
  const [cobrarServico, setCobrarServico] = useState(false);
  const [valorPorPeca, setValorPorPeca] = useState<number>(0);
  const [qtdPecasServico, setQtdPecasServico] = useState<number>(
    inversionData?.quantidadeTotalPecas || 1
  );
  const [observacoes, setObservacoes] = useState("");
  const [transmitting, setTransmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (inversionData) {
      const isConjunto =
        inversionData.notaEntrada.emitenteFabrica.modoEmissao === "CONJUNTO";
      setCobrarServico(isConjunto);
      setQtdPecasServico(inversionData.quantidadeTotalPecas || 1);
      setValorPorPeca(0);
      setObservacoes("");
      setErrorMessage(null);
    }
  }, [inversionData, isOpen]);

  if (!isOpen || !inversionData) return null;

  const { notaEntrada, itensRetorno, totalInsumosRetorno } = inversionData;

  const totalServico = cobrarServico ? (valorPorPeca || 0) * (qtdPecasServico || 1) : 0;
  const valorTotalNota = totalInsumosRetorno + totalServico;

  const handleTransmit = async () => {
    setTransmitting(true);
    setErrorMessage(null);

    try {
      const chavesRef = (inversionData as any).chavesReferenciadas;
      const res = await executeInversionAction({
        invoiceEntradaId: notaEntrada.id,
        chaveAcessoEntrada: chavesRef && chavesRef.length > 0 ? chavesRef[0] : notaEntrada.chaveAcesso,
        chavesAcessoEntrada: chavesRef,
        itensRetorno,
        cobrarServico,
        valorServicoPorPeca: cobrarServico ? valorPorPeca : undefined,
        quantidadePecasServico: cobrarServico ? qtdPecasServico : undefined,
        observacoesFiscais: observacoes,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Erro ao transmitir nota fiscal para a SEFAZ.");
        setTransmitting(false);
        return;
      }

      onSuccess(res.numero!);
      onClose();
    } catch (err: any) {
      setErrorMessage("Erro inesperado ao conectar ao servidor fiscal.");
      setTransmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-fadeIn max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primaryDark">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                Conferência & Emissão — Gerar NF de Retorno
              </h2>
              <p className="text-xs text-slate-500">
                Revise os itens fiscais antes da transmissão direta para a SEFAZ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {errorMessage && (
            <FiscalErrorAlert
              error={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          )}

          {/* Dados da Nota de Entrada Referenciada */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Fábrica de Origem (Destinatária do Retorno)
              </span>
              <p className="font-bold text-ink mt-0.5">{notaEntrada.emitenteFabrica.nome}</p>
              <p className="font-mono text-slate-500 text-[11px]">
                CNPJ: {notaEntrada.emitenteFabrica.cnpj}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Nota de Entrada (Remessa)
              </span>
              <p className="font-bold text-ink mt-0.5">
                NF-e Nº {notaEntrada.numero} (Série {notaEntrada.serie})
              </p>
              <p className="text-slate-500 text-[11px]">
                Emitida em: {new Date(notaEntrada.dataEmissao).toLocaleDateString("pt-BR")}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Chave Referenciada SEFAZ
              </span>
              <p className="font-mono text-[10px] text-slate-600 break-all mt-0.5">
                {notaEntrada.chaveAcesso}
              </p>
            </div>
          </div>

          {/* Banner Explicativo de Modo Fiscal */}
          {!cobrarServico ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <strong>Modo Retorno de Mercadoria (CFOP 5.902 puro):</strong> Esta nota acompanha o transporte físico dos produtos de volta para a fábrica (R$ 0,00 financeiro).
                A nota de <strong>Cobrança da Costura (CFOP 5.124)</strong> deve ser emitida pelo botão <em>"Emitir Cobrança (Espelho)"</em> quando a fábrica enviar o Espelho de Produção após a conferência em ~48h.
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-violet-50/80 border border-violet-200/80 flex items-start gap-2.5 text-xs text-violet-900">
              <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <strong>Modo Emissão Conjunta (Nota Única):</strong> Esta NF-e conterá os itens de <strong>Retorno dos Insumos (CFOP 5.902)</strong> e o item de <strong>Serviço de Costura (CFOP 5.124)</strong> juntos. O valor de cobrança será apenas sobre a mão de obra.
              </div>
            </div>
          )}

          {/* Tabela de Itens Convertidos */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Itens da Nota de Retorno a Emitir ({itensRetorno.length} itens)
            </h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Item / Descrição</th>
                    <th className="py-2.5 px-3">NCM</th>
                    <th className="py-2.5 px-3">CFOP Gerado</th>
                    <th className="py-2.5 px-3 text-right">Qtd</th>
                    <th className="py-2.5 px-3 text-right">Valor Unit.</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itensRetorno.map((item) => (
                    <tr key={item.numeroItem} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-ink">{item.descricao}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.codigo}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{item.ncm}</td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {item.cfopSaida}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Origem: {item.cfopEntradaOriginal}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                        {item.quantidade} {item.unidade}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        R$ {item.valorUnitario.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink">
                        R$ {item.valorTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seção Opcional de Cobrança de Serviço (CFOP 5.124) */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cobrarServico}
                  onChange={(e) => setCobrarServico(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span>Adicionar Cobrança de Mão de Obra / Serviço de Costura (CFOP 5.124)</span>
              </label>
              <span className="text-[10px] font-semibold text-amber-800 uppercase">
                Simples Nacional 101
              </span>
            </div>

            {cobrarServico && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Qtd. de Peças Costuradas
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={qtdPecasServico}
                    onChange={(e) => setQtdPecasServico(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Valor por Peça (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorPorPeca}
                    onChange={(e) => setValorPorPeca(Number(e.target.value))}
                    placeholder="Ex: 8.50"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Subtotal do Serviço
                  </label>
                  <div className="px-3 py-2 bg-amber-100/70 rounded-xl text-xs font-bold text-amber-950 font-mono">
                    R$ {totalServico.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Observações Fiscais */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Observações Adicionais (infAdic Contribuinte)
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Mercadoria conferida pelo setor de acabamento. Pedido nº 1234."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink"
            />
          </div>

          {/* Totalizadores */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5 text-xs text-slate-300">
              <p>Insumos Retornados: <strong>R$ {totalInsumosRetorno.toFixed(2)}</strong></p>
              {cobrarServico && (
                <p>Mão de Obra de Costura: <strong>R$ {totalServico.toFixed(2)}</strong></p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Valor Total da NF-e de Retorno
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">
                R$ {valorTotalNota.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleTransmit}
            disabled={transmitting}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          >
            {transmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transmitindo para SEFAZ...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirmar e Transmitir NF-e</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
