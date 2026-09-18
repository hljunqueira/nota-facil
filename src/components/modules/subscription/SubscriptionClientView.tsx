"use client";

import React, { useState } from "react";
import {
  Check,
  Calendar,
  CreditCard,
  QrCode,
  Copy,
  ExternalLink,
  AlertCircle,
  MessageCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { SubscriptionInfo, SubscriptionPayment, getPaymentPixAction } from "@/actions/subscription";

interface SubscriptionClientViewProps {
  tenant: SubscriptionInfo;
}

function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export function SubscriptionClientView({ tenant }: SubscriptionClientViewProps) {
  const isParceria = (tenant.plano || "PARCERIA") === "PARCERIA";
  const [selectedPayment, setSelectedPayment] = useState<SubscriptionPayment | null>(null);
  const [pixData, setPixData] = useState<{
    encodedImage: string;
    payload: string;
    expirationDate: string;
  } | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ATIVO":
        return { label: "Conta Ativa", class: "text-emerald-700 bg-emerald-50 border-emerald-200" };
      case "EM_ONBOARDING":
        return { label: "Em Configuração", class: "text-amber-700 bg-amber-50 border-amber-200" };
      case "SUSPENSO_PAGAMENTO":
        return { label: "Pagamento Pendente", class: "text-rose-700 bg-rose-50 border-rose-200" };
      case "SUSPENSO_ADMIN":
        return { label: "Bloqueio Administrativo", class: "text-rose-700 bg-rose-50 border-rose-200" };
      default:
        return { label: status, class: "text-slate-700 bg-slate-50 border-slate-200" };
    }
  };

  const statusBadge = getStatusBadge(tenant.statusConta);

  // Seleciona a cobrança da próxima fatura
  const nextInvoicePayment =
    tenant.payments.find((p) => p.status === "PENDING" || p.status === "OVERDUE") ||
    tenant.payments[0] ||
    null;

  const handleOpenPix = async (payment: SubscriptionPayment) => {
    setSelectedPayment(payment);
    setLoadingPix(true);
    setPixData(null);
    setCopiedPix(false);

    try {
      const res = await getPaymentPixAction(payment.id);
      setPixData(res);
    } catch (err) {
      console.error("Erro ao obter Pix:", err);
    } finally {
      setLoadingPix(false);
    }
  };

  const handleCopyPix = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  const whatsappSuporteUrl = `https://wa.me/5548991498502?text=${encodeURIComponent(
    `Olá! Gostaria de falar sobre a assinatura da oficina ${tenant.razaoSocial} (CNPJ: ${tenant.cnpj}).`
  )}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Minha Assinatura
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {tenant.razaoSocial} • CNPJ: <span className="font-mono">{formatCnpj(tenant.cnpj)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${statusBadge.class}`}>
            {statusBadge.label}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-900 text-white">
            {isParceria ? "Plano Parceria (24 meses)" : "Plano Flex"}
          </span>
        </div>
      </div>

      {/* Alerta de Regularização se houver pendência */}
      {tenant.statusConta === "SUSPENSO_PAGAMENTO" && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-rose-900">Mensalidade pendente</h3>
              <p className="text-xs text-rose-700">Realize o pagamento via Pix para reativar suas emissões fiscais na hora.</p>
            </div>
          </div>
          {nextInvoicePayment && (
            <button
              onClick={() => handleOpenPix(nextInvoicePayment)}
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer shrink-0"
            >
              Pagar Pix
            </button>
          )}
        </div>
      )}

      {/* 1. SEU PLANO CONTRATADO (Compacto, elegante e exclusivo) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Seu Plano Contratado
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1.5">
              {isParceria ? "Plano Parceria (Fidelidade de 2 anos)" : "Plano Flex (Sem fidelidade)"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isParceria
                ? "Taxa de implantação 100% isenta em troca de parceria de longo prazo."
                : "Liberdade contratual mensal sem tempo mínimo de permanência."}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="flex items-baseline gap-1 sm:justify-end">
              <span className="text-xs font-semibold text-slate-400">R$</span>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                289,90
              </span>
              <span className="text-xs text-slate-500">/ mês</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              + 1,99% processamento bancário (R$ 5,77) = <strong>R$ 295,67</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Vencimento da Mensalidade</span>
            <span className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>Todo dia {tenant.diaVencimento}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Taxa de Implantação</span>
            <span className={`font-semibold mt-0.5 block ${isParceria ? "text-emerald-700" : "text-slate-800"}`}>
              {isParceria ? "R$ 0,00 (100% Isento — Economia R$ 490)" : "R$ 490,00 (À vista ou no Cartão com taxas)"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Vigência Contratual</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              {isParceria ? "24 meses (Renovação automática)" : "Mensal sem carência"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. PRÓXIMA FATURA (Destaque direto para pagamento) */}
      <div className="bg-white border-2 border-slate-900 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Clock className="h-3.5 w-3.5 text-slate-700" />
              <span>Próxima Fatura</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {nextInvoicePayment?.vencimento || tenant.proximaFaturaData}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Aguardando Pagamento
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Faturamento mensal via Pix e Boleto Bancário (vencimento dia {tenant.diaVencimento}).
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block">Total a pagar</span>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              R$ {nextInvoicePayment ? Number(nextInvoicePayment.valor).toFixed(2) : "295,67"}
            </div>
            <span className="text-[11px] text-slate-500 block">
              R$ 289,90 líquido (+ 1,99% processamento bancário)
            </span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-600 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Pagamento via Pix libera sua conta e emissão fiscal instantaneamente.</span>
          </p>

          <div className="flex items-center gap-2">
            {nextInvoicePayment ? (
              <>
                <button
                  onClick={() => handleOpenPix(nextInvoicePayment)}
                  type="button"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <QrCode className="h-3.5 w-3.5 text-white" />
                  <span>Pagar via Pix</span>
                </button>
                {nextInvoicePayment.invoiceUrl && (
                  <a
                    href={nextInvoicePayment.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors inline-flex items-center gap-1"
                  >
                    <span>Boleto / Fatura</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                )}
              </>
            ) : (
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed"
              >
                Fatura em processamento
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. HISTÓRICO DE FATURAS (Tabela clara e limpa) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Histórico de Faturas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mensalidades geradas automaticamente com baixa via Pix ou Boleto.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-semibold">
                <th className="py-2.5 px-3">Vencimento</th>
                <th className="py-2.5 px-3">Valor</th>
                <th className="py-2.5 px-3">Forma</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenant.payments.length > 0 ? (
                tenant.payments.map((p) => {
                  const isPaid = p.status === "RECEIVED" || p.status === "CONFIRMED";
                  const isOverdue = p.status === "OVERDUE";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {p.vencimento}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        R$ {Number(p.valor).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {p.billingType === "PIX"
                          ? "Pix"
                          : p.billingType === "BOLETO"
                          ? "Boleto"
                          : p.billingType === "CREDIT_CARD"
                          ? "Cartão"
                          : "Pix / Boleto"}
                      </td>
                      <td className="py-3 px-3">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="h-3 w-3" />
                            Pago
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Vencido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Aguardando Pagamento
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isPaid && (
                            <button
                              onClick={() => handleOpenPix(p)}
                              type="button"
                              className="px-2.5 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <QrCode className="h-3 w-3" />
                              <span>Pagar Pix</span>
                            </button>
                          )}
                          {p.invoiceUrl && (
                            <a
                              href={p.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[11px] transition-colors inline-flex items-center gap-1"
                              title="Visualizar fatura e comprovante"
                            >
                              <span>Fatura</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="hover:bg-slate-50/60">
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {tenant.proximaFaturaData}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    R$ 295,67
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    Pix / Boleto
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Aguardando Pagamento
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400 italic">
                    Disponível no vencimento
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suporte Direto e Atendimento (Discreto e Elegante) */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-semibold text-slate-900 block">Dúvidas sobre sua assinatura ou faturas?</span>
          <span className="text-slate-500">Nosso time técnico está à disposição no WhatsApp (48) 99149-8502.</span>
        </div>
        <a
          href={whatsappSuporteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span>Falar com Atendimento (48 99149-8502)</span>
        </a>
      </div>

      {/* Modal de Pagamento Pix */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-slate-900" />
                <h3 className="font-semibold text-slate-900 text-sm">
                  Pagamento via Pix
                </h3>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>
                Mensalidade: <strong>R$ {Number(selectedPayment.valor).toFixed(2)}</strong>
              </div>
              <div>
                Vencimento: <strong>{selectedPayment.vencimento}</strong>
              </div>
            </div>

            {loadingPix ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Gerando QR Code Pix...
              </div>
            ) : pixData ? (
              <div className="space-y-4 text-center">
                {pixData.encodedImage && (
                  <div className="flex justify-center p-3 bg-white border border-slate-200 rounded-lg mx-auto">
                    <img
                      src={`data:image/png;base64,${pixData.encodedImage}`}
                      alt="QR Code Pix"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                )}

                <div className="space-y-1.5 text-left">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Pix Copia e Cola:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      readOnly
                      value={pixData.payload}
                      className="w-full text-[10px] font-mono p-2 bg-slate-50 rounded border border-slate-200 truncate select-all"
                    />
                    <button
                      onClick={handleCopyPix}
                      className="px-3 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {copiedPix ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-white" />}
                      <span>{copiedPix ? "Copiado!" : "Copiar"}</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Abra o aplicativo do seu banco, escolha a opção <strong>Pix Copia e Cola</strong> (ou aponte a câmera para o QR Code) e confirme o pagamento. A liberação do sistema é instantânea.
                </p>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-rose-600">
                Não foi possível obter o QR Code Pix desta fatura. Utilize o link direto da fatura.
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              {selectedPayment.invoiceUrl && (
                <a
                  href={selectedPayment.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-600 hover:text-slate-900 underline inline-flex items-center gap-1"
                >
                  <span>Abrir fatura completa / Boleto</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
