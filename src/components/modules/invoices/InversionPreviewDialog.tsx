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
  Truck,
  ChevronDown,
  ChevronUp,
  Package,
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
  const [cfopRetorno, setCfopRetorno] = useState<string>("5902");
  const [cobrarServico, setCobrarServico] = useState(false);
  const [valorPorPeca, setValorPorPeca] = useState<number>(0);
  const [qtdPecasServico, setQtdPecasServico] = useState<number>(
    inversionData?.quantidadeTotalPecas || 1
  );
  const [observacoes, setObservacoes] = useState("");
  const [transmitting, setTransmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dados de Transporte e Volumes espelhados da nota de entrada
  const [showTransporte, setShowTransporte] = useState(false);
  const [modalidadeFrete, setModalidadeFrete] = useState<string>("0");
  const [transportadorNome, setTransportadorNome] = useState("");
  const [transportadorCnpj, setTransportadorCnpj] = useState("");
  const [transportadorIe, setTransportadorIe] = useState("");
  const [placaVeiculo, setPlacaVeiculo] = useState("");
  const [ufVeiculo, setUfVeiculo] = useState("");
  const [qtdVolumes, setQtdVolumes] = useState<number | "">("");
  const [especieVolumes, setEspecieVolumes] = useState("");
  const [pesoBruto, setPesoBruto] = useState<number | "">("");
  const [pesoLiquido, setPesoLiquido] = useState<number | "">("");

  React.useEffect(() => {
    if (inversionData) {
      const isConjunto =
        inversionData.notaEntrada.emitenteFabrica.modoEmissao === "CONJUNTO";
      setCobrarServico(isConjunto);
      setQtdPecasServico(inversionData.quantidadeTotalPecas || 1);
      setValorPorPeca(0);
      setObservacoes("");
      setErrorMessage(null);

      // Sugestão de CFOP: Ritmi costuma solicitar 5904
      const partnerNome = (inversionData.notaEntrada.emitenteFabrica.nome || "").toUpperCase();
      if (partnerNome.includes("RITMI")) {
        setCfopRetorno("5904");
      } else {
        setCfopRetorno("5902");
      }

      // Preenche dados de transporte a partir da nota de entrada
      const transp = inversionData.transporte;
      if (transp) {
        setModalidadeFrete(transp.modalidadeFrete !== undefined ? String(transp.modalidadeFrete) : "0");
        setTransportadorNome(transp.transportador?.razaoSocial || "");
        setTransportadorCnpj(transp.transportador?.cnpj || "");
        setTransportadorIe(transp.transportador?.inscricaoEstadual || "");
        setPlacaVeiculo(transp.transportador?.placa || "");
        setUfVeiculo(transp.transportador?.ufVeiculo || "");
        setQtdVolumes(transp.volumes?.quantidade ?? "");
        setEspecieVolumes(transp.volumes?.especie || "");
        setPesoBruto(transp.volumes?.pesoBruto ?? "");
        setPesoLiquido(transp.volumes?.pesoLiquido ?? "");
      } else {
        setModalidadeFrete("0");
        setTransportadorNome("");
        setTransportadorCnpj("");
        setTransportadorIe("");
        setPlacaVeiculo("");
        setUfVeiculo("");
        setQtdVolumes("");
        setEspecieVolumes("");
        setPesoBruto("");
        setPesoLiquido("");
      }
    }
  }, [inversionData, isOpen]);

  if (!isOpen || !inversionData) return null;

  const { notaEntrada, itensRetorno, totalInsumosRetorno } = inversionData;

  const totalServico = cobrarServico ? (valorPorPeca || 0) * (qtdPecasServico || 1) : 0;
  const valorTotalNota = totalInsumosRetorno + totalServico;

  const displayCfop = (originalCfopSaida: string) => {
    if (cfopRetorno === "5904") {
      return originalCfopSaida.startsWith("6") ? "6904" : "5904";
    }
    return originalCfopSaida;
  };

  const handleTransmit = async () => {
    setTransmitting(true);
    setErrorMessage(null);

    try {
      const chavesRef = (inversionData as any).chavesReferenciadas;

      const transportePayload = {
        modalidadeFrete,
        transportador: transportadorNome || transportadorCnpj ? {
          razaoSocial: transportadorNome || undefined,
          cnpj: transportadorCnpj || undefined,
          inscricaoEstadual: transportadorIe || undefined,
          placa: placaVeiculo || undefined,
          ufVeiculo: ufVeiculo || undefined,
        } : undefined,
        volumes: qtdVolumes !== "" || especieVolumes || pesoBruto !== "" || pesoLiquido !== "" ? {
          quantidade: qtdVolumes !== "" ? Number(qtdVolumes) : undefined,
          especie: especieVolumes || undefined,
          pesoBruto: pesoBruto !== "" ? Number(pesoBruto) : undefined,
          pesoLiquido: pesoLiquido !== "" ? Number(pesoLiquido) : undefined,
        } : undefined,
      };

      const res = await executeInversionAction({
        invoiceEntradaId: notaEntrada.id,
        chaveAcessoEntrada: chavesRef && chavesRef.length > 0 ? chavesRef[0] : notaEntrada.chaveAcesso,
        chavesAcessoEntrada: chavesRef,
        itensRetorno,
        cobrarServico,
        valorServicoPorPeca: cobrarServico ? valorPorPeca : undefined,
        quantidadePecasServico: cobrarServico ? qtdPecasServico : undefined,
        observacoesFiscais: observacoes,
        cfopRetorno,
        transporteInfo: transportePayload,
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

  const hasTransporteOriginal = Boolean(
    inversionData.transporte?.transportador?.razaoSocial ||
    inversionData.transporte?.volumes?.quantidade
  );

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
                Revise os itens fiscais, CFOP e transporte antes da transmissão direta para a SEFAZ
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
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
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

          {/* Seletor de CFOP de Retorno (5902 vs 5904) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              CFOP e Natureza da Operação
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCfopRetorno("5902")}
                className={`min-h-[44px] p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  cfopRetorno === "5902"
                    ? "bg-emerald-50/90 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    cfopRetorno === "5902" ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                  }`}
                >
                  {cfopRetorno === "5902" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-xs font-bold">CFOP 5902 — Retorno de Mercadoria</p>
                  <p className="text-[11px] text-slate-500">
                    Retorno padrão de insumos recebidos para industrialização
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCfopRetorno("5904")}
                className={`min-h-[44px] p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  cfopRetorno === "5904"
                    ? "bg-blue-50/90 border-blue-500 text-blue-950 ring-1 ring-blue-500 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    cfopRetorno === "5904" ? "border-blue-600 bg-blue-600" : "border-slate-300"
                  }`}
                >
                  {cfopRetorno === "5904" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-xs font-bold">CFOP 5904 — Remessa Conta e Ordem</p>
                  <p className="text-[11px] text-slate-500">
                    Exigido pela Ritmi e fábricas com entrega por ordem
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Banner Explicativo de Modo Fiscal */}
          {!cobrarServico ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <strong>Modo Retorno de Mercadoria (CFOP {cfopRetorno} puro):</strong> Esta nota acompanha o transporte físico dos produtos de volta para a fábrica (R$ 0,00 financeiro).
                A nota de <strong>Cobrança da Costura (CFOP 5.124)</strong> deve ser emitida pelo botão <em>"Emitir Cobrança (Espelho)"</em> quando a fábrica enviar o Espelho de Produção após a conferência em ~48h.
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-violet-50/80 border border-violet-200/80 flex items-start gap-2.5 text-xs text-violet-900">
              <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <strong>Modo Emissão Conjunta (Nota Única):</strong> Esta NF-e conterá os itens de <strong>Retorno dos Insumos (CFOP {cfopRetorno})</strong> e o item de <strong>Serviço de Costura (CFOP 5.124)</strong> juntos. O valor de cobrança será apenas sobre a mão de obra.
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cfopRetorno === "5904"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {displayCfop(item.cfopSaida)}
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

          {/* Transporte & Volumes (Espelhados da Entrada) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTransporte(!showTransporte)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">
                      Transportadora & Volumes
                    </span>
                    {hasTransporteOriginal ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        Espelhado da Entrada
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                        Padrão sem frete
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {transportadorNome
                      ? `${transportadorNome} • ${qtdVolumes ? `${qtdVolumes} vol.` : "Volumes não especificados"}`
                      : "Regra contábil: manter os mesmos dados de frete e volumes da NF-e de entrada"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
                <span>{showTransporte ? "Ocultar" : "Editar / Conferir"}</span>
                {showTransporte ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showTransporte && (
              <div className="p-4 pt-2 border-t border-slate-200 space-y-4 bg-white text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Modalidade do Frete
                    </label>
                    <select
                      value={modalidadeFrete}
                      onChange={(e) => setModalidadeFrete(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                    >
                      <option value="0">0 - Por conta do Emitente (CIF)</option>
                      <option value="1">1 - Por conta do Destinatário (FOB)</option>
                      <option value="2">2 - Por conta de Terceiros</option>
                      <option value="3">3 - Transporte Próprio (Remetente)</option>
                      <option value="4">4 - Transporte Próprio (Destinatário)</option>
                      <option value="9">9 - Sem Ocorrência de Transporte</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nome / Razão Social do Transportador
                    </label>
                    <input
                      type="text"
                      value={transportadorNome}
                      onChange={(e) => setTransportadorNome(e.target.value)}
                      placeholder="Ex: RITMI CONFECCOES LTDA"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      CNPJ / CPF do Transportador
                    </label>
                    <input
                      type="text"
                      value={transportadorCnpj}
                      onChange={(e) => setTransportadorCnpj(e.target.value)}
                      placeholder="Somente números ou formatado"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Qtd. Volumes
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={qtdVolumes}
                      onChange={(e) => setQtdVolumes(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Ex: 5"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Espécie
                    </label>
                    <input
                      type="text"
                      value={especieVolumes}
                      onChange={(e) => setEspecieVolumes(e.target.value)}
                      placeholder="Ex: VOLUMES, CX"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Peso Bruto (kg)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min={0}
                      value={pesoBruto}
                      onChange={(e) => setPesoBruto(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Ex: 24.500"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Peso Líquido (kg)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min={0}
                      value={pesoLiquido}
                      onChange={(e) => setPesoLiquido(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Ex: 24.000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Seção Opcional de Cobrança de Serviço (CFOP 5.124) */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-amber-950 cursor-pointer min-h-[44px]">
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold min-h-[44px]"
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Subtotal do Serviço
                  </label>
                  <div className="px-3 py-2 bg-amber-100/70 rounded-xl text-xs font-bold text-amber-950 font-mono flex items-center min-h-[44px]">
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-ink min-h-[44px]"
            />
          </div>

          {/* Totalizadores */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5 text-xs text-slate-300">
              <p>Insumos Retornados ({cfopRetorno}): <strong>R$ {totalInsumosRetorno.toFixed(2)}</strong></p>
              {cobrarServico && (
                <p>Mão de Obra de Costura (5124): <strong>R$ {totalServico.toFixed(2)}</strong></p>
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
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer min-h-[44px]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleTransmit}
            disabled={transmitting}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 min-h-[44px]"
          >
            {transmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transmitindo para SEFAZ...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirmar e Transmitir NF-e ({cfopRetorno})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
