"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Calendar,
  Building2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { parseEspelhoFileAction, emitirCobrancaEspelhoAction } from "@/actions/invoices";
import { getPartnerLastPriceAction } from "@/actions/priceHistory";
import { ParsedEspelho } from "@/lib/services/espelhoPdfParser";

interface ImportEspelhoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetInvoice?: {
    id: string;
    numero: number;
    serie?: number;
    chaveAcesso?: string | null;
    partner?: {
      id: string;
      razaoSocial: string;
      nomeFantasia?: string | null;
      cnpj: string;
      whatsappFinanceiro?: string | null;
      emailFinanceiro?: string | null;
    } | null;
  } | null;
}

export function ImportEspelhoModal({
  isOpen,
  onClose,
  onSuccess,
  targetInvoice,
}: ImportEspelhoModalProps) {
  const [activeMode, setActiveMode] = useState<"PDF" | "MANUAL">("PDF");
  const [step, setStep] = useState<"INPUT" | "PREVIEW" | "SUCCESS">("INPUT");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [espelho, setEspelho] = useState<ParsedEspelho | null>(null);
  const [partner, setPartner] = useState<any>(null);
  const [availablePartners, setAvailablePartners] = useState<any[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [emittedInvoice, setEmittedInvoice] = useState<{
    numero: number;
    chave?: string | null;
  } | null>(null);

  // Campos do Modo Manual (Preenchimento Direto)
  const [manualDescricao, setManualDescricao] = useState("");
  const [manualOp, setManualOp] = useState("");
  const [manualQtd, setManualQtd] = useState<number>(1);
  const [manualValorUnit, setManualValorUnit] = useState<number>(0);
  const [manualVencimento, setManualVencimento] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState<{
    valor: number;
    data: Date;
    descricao?: string | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (targetInvoice?.partner) {
      setPartner(targetInvoice.partner);
    }
    if (targetInvoice) {
      setManualOp(`OP da Remessa #${targetInvoice.numero}`);
    }
  }, [targetInvoice, isOpen]);

  // Consulta inteligente de último preço praticado para o parceiro
  useEffect(() => {
    let active = true;
    const pId = partner?.id || targetInvoice?.partner?.id;
    const ref = manualOp.trim();

    if (!pId || !ref || ref.length < 2) {
      setSuggestedPrice(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await getPartnerLastPriceAction(pId, ref);
        if (active && res.success && res.encontrado && res.valorUnitario) {
          setSuggestedPrice({
            valor: res.valorUnitario,
            data: new Date(res.dataRegistro || Date.now()),
            descricao: res.descricao,
          });
        } else if (active) {
          setSuggestedPrice(null);
        }
      } catch {
        if (active) setSuggestedPrice(null);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [manualOp, partner, targetInvoice]);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep("INPUT");
    setFile(null);
    setParsing(false);
    setTransmitting(false);
    setError(null);
    setDuplicateWarning(null);
    setEspelho(null);
    setPartner(targetInvoice?.partner || null);
    setEmittedInvoice(null);
    setManualDescricao("");
    setManualOp("");
    setManualQtd(1);
    setManualValorUnit(0);
    setManualVencimento("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Por favor selecione o arquivo PDF do Espelho de Produção da fábrica.");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setDuplicateWarning(null);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await parseEspelhoFileAction(formData);

      if (!res.success || !res.espelho) {
        setError(res.error || "Não foi possível extrair os dados do espelho.");
        setParsing(false);
        return;
      }

      if (res.jaFaturado) {
        setDuplicateWarning(
          `Aviso: O espelho de controle nº ${res.espelho.numeroControle || ""} já consta como faturado na NF-e nº ${res.jaFaturado.numeroNota}. Verifique para evitar emissão duplicada.`
        );
      }

      setEspelho(res.espelho);
      setPartner(targetInvoice?.partner || res.partner);
      setAvailablePartners(res.availablePartners || []);
      setStep("PREVIEW");
    } catch (err: any) {
      setError(err.message || "Falha ao processar arquivo de espelho.");
    } finally {
      setParsing(false);
    }
  };

  const handleProceedManual = () => {
    if (!partner && !targetInvoice?.partner) {
      setError("Selecione a fábrica parceira destinatária da cobrança.");
      return;
    }
    if (manualQtd <= 0 || manualValorUnit <= 0) {
      setError("Informe a quantidade de peças e o valor unitário da costura.");
      return;
    }

    const valorTotal = manualQtd * manualValorUnit;
    const manualEspelho: ParsedEspelho = {
      numeroControle: manualOp || `MANUAL-${Date.now()}`,
      dataEspelho: new Date().toLocaleDateString("pt-BR"),
      fabricaNome: partner?.razaoSocial || targetInvoice?.partner?.razaoSocial || "Fábrica",
      prestadoraNome: "Oficina",
      prestadoraCodigo: "001",
      valorTotalServico: valorTotal,
      previsaoPagamento: manualVencimento || "A combinar",
      itens: [
        {
          op: manualOp || "S/N",
          referencia: manualDescricao || "SERVICO DE COSTURA",
          faseServico: "COSTURA",
          data: new Date().toLocaleDateString("pt-BR"),
          quantidade: manualQtd,
          valorUnitario: manualValorUnit,
          valorTotal,
        },
      ],
    };

    setEspelho(manualEspelho);
    setStep("PREVIEW");
  };

  const handleTransmit = async () => {
    const currentPartner = partner || targetInvoice?.partner;
    if (!espelho || !currentPartner) {
      setError("Dados do espelho ou fábrica parceira não definidos.");
      return;
    }

    setTransmitting(true);
    setError(null);

    try {
      const res = await emitirCobrancaEspelhoAction({
        partnerId: currentPartner.id,
        itens: espelho.itens,
        numeroControleEspelho: espelho.numeroControle,
        observacoesFiscais: observacoes,
        remessaOrigemId: targetInvoice?.id,
        chaveNfeReferenciada: targetInvoice?.chaveAcesso || undefined,
        previsaoPagamento: espelho.previsaoPagamento,
      });

      if (!res.success) {
        setError(res.error || "Erro ao emitir a NF-e de Cobrança na SEFAZ.");
        setTransmitting(false);
        return;
      }

      setEmittedInvoice({
        numero: (espelho.itens.length > 0 && res.invoiceId) ? targetInvoice?.numero || 1 : 1,
      });
      setStep("SUCCESS");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erro inesperado na transmissão.");
      setTransmitting(false);
    }
  };

  const handleShareWhatsApp = () => {
    const p = partner || targetInvoice?.partner;
    const phone = p?.whatsappFinanceiro?.replace(/\D/g, "") || "";
    const valorFormatado = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(espelho?.valorTotalServico || 0);

    const mensagem =
      `Olá, segue a NF-e de Cobrança da costura referente ` +
      (targetInvoice?.numero ? `à Remessa nº ${targetInvoice.numero}` : `ao Espelho #${espelho?.numeroControle || ""}`) +
      ` no valor de ${valorFormatado}. ` +
      (espelho?.previsaoPagamento ? `Vencimento programado: ${espelho.previsaoPagamento}.` : "");

    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(mensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-fadeIn max-h-[92vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">
                Faturamento de Costura (CFOP 5124)
              </h2>
              {targetInvoice && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-semibold">
                  Remessa #{targetInvoice.numero}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {targetInvoice?.partner?.razaoSocial
                ? `Fábrica: ${targetInvoice.partner.razaoSocial}`
                : "Emita a nota fiscal de mão de obra a partir do demonstrativo de produção"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alternância de Modo no passo INPUT */}
        {step === "INPUT" && (
          <div className="px-6 pt-4 pb-2 flex gap-2 border-b border-slate-100 bg-white">
            <button
              type="button"
              onClick={() => {
                setActiveMode("PDF");
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeMode === "PDF"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Importar Espelho (PDF)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode("MANUAL");
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeMode === "MANUAL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Preenchimento Direto
            </button>
          </div>
        )}

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {step === "INPUT" && activeMode === "PDF" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50 rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-600">
                  {parsing ? (
                    <Loader2 className="w-7 h-7 animate-spin text-slate-700" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {parsing ? "Lendo dados do Espelho..." : "Clique ou arraste o PDF do Espelho"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Arquivo enviado pela fábrica com as OPs, peças e valores de costura
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">
                  Como funciona o faturamento de costura:
                </p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Após a conferência das peças entregues, a fábrica envia o espelho de produção.
                  Ao anexar o arquivo, o sistema preenche as OPs e calcula o valor a receber sem necessidade de digitação.
                </p>
              </div>
            </div>
          )}

          {step === "INPUT" && activeMode === "MANUAL" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Utilize esta opção caso a fábrica tenha informado os valores por mensagem direta ou acordo verbal.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ordem de Produção (OP)
                  </label>
                  <input
                    type="text"
                    value={manualOp}
                    onChange={(e) => setManualOp(e.target.value)}
                    placeholder="Ex: OP 31647"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição da Peça / Modelo
                  </label>
                  <input
                    type="text"
                    value={manualDescricao}
                    onChange={(e) => setManualDescricao(e.target.value)}
                    placeholder="Ex: Vestido Manga Curta"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantidade de Peças
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={manualQtd || ""}
                    onChange={(e) => setManualQtd(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink font-mono focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor da Costura por Peça (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualValorUnit || ""}
                    onChange={(e) => setManualValorUnit(Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink font-mono focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Previsão de Depósito (Opcional)
                  </label>
                  <input
                    type="text"
                    value={manualVencimento}
                    onChange={(e) => setManualVencimento(e.target.value)}
                    placeholder="Ex: 04/10/2026"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              {suggestedPrice && (
                <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Último preço faturado para esta fábrica nesta referência:{" "}
                      <strong className="text-blue-900">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(suggestedPrice.valor)}/peça
                      </strong>{" "}
                      <span className="text-blue-600 text-[11px]">
                        ({new Date(suggestedPrice.data).toLocaleDateString("pt-BR")})
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualValorUnit(suggestedPrice.valor)}
                    className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors whitespace-nowrap self-start sm:self-auto"
                  >
                    Usar este Preço
                  </button>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Total a Faturar:</span>
                <span className="text-base font-bold text-ink font-mono">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(manualQtd * manualValorUnit)}
                </span>
              </div>
            </div>
          )}

          {step === "PREVIEW" && espelho && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">
                    Fábrica Destinatária
                  </span>
                  <p className="font-semibold text-ink mt-0.5">
                    {partner?.razaoSocial || targetInvoice?.partner?.razaoSocial || espelho.fabricaNome}
                  </p>
                  <span className="text-[10px] font-mono text-slate-400">
                    CNPJ: {partner?.cnpj || targetInvoice?.partner?.cnpj || "72.305.295/0001-15"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">
                    Controle / OP
                  </span>
                  <p className="font-semibold text-ink mt-0.5">
                    Controle #{espelho.numeroControle || "S/N"}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Data: {espelho.dataEspelho}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">
                    Previsão de Depósito
                  </span>
                  <p className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{espelho.previsaoPagamento || "A combinar"}</span>
                  </p>
                  <span className="text-[10px] text-slate-400">
                    CFOP: 5124 (Industrialização Cobrança)
                  </span>
                </div>
              </div>

              {/* Tabela de Itens */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-semibold text-ink">
                  Serviços de Costura a Faturar
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold uppercase text-slate-400">
                      <th className="py-2.5 px-4">OP / Ref</th>
                      <th className="py-2.5 px-4">Descrição do Modelo</th>
                      <th className="py-2.5 px-4 text-center">Qtd</th>
                      <th className="py-2.5 px-4 text-right">Valor Unit.</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {espelho.itens.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-mono font-semibold text-ink">
                          {it.op || "S/N"}
                        </td>
                        <td className="py-2.5 px-4 text-ink">
                          {it.referencia}
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-ink">
                          {it.quantidade}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-ink">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(it.valorUnitario)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-ink font-mono">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(it.valorTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-300 block">
                    Total da Cobrança de Costura
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Valor da prestação de serviços (mão de obra)
                  </span>
                </div>
                <span className="text-xl font-bold font-mono">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(espelho.valorTotalServico)}
                </span>
              </div>
            </div>
          )}

          {step === "SUCCESS" && (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  NF-e de Cobrança Transmitida com Sucesso
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  A nota de serviço foi enviada para a SEFAZ e o valor a receber foi registrado no seu painel.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                >
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>Enviar para Financeiro da Fábrica</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        {step !== "SUCCESS" && (
          <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            {step === "PREVIEW" ? (
              <button
                type="button"
                onClick={() => setStep("INPUT")}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Voltar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}

            {step === "INPUT" && activeMode === "MANUAL" && (
              <button
                type="button"
                onClick={handleProceedManual}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Continuar para Conferência
              </button>
            )}

            {step === "PREVIEW" && (
              <button
                type="button"
                onClick={handleTransmit}
                disabled={transmitting}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {transmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitindo para SEFAZ...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Autorizar Emissão na SEFAZ</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
