"use client";

import React, { useState } from "react";
import {
  Check,
  Calendar,
  CreditCard,
  QrCode,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageCircle,
  Clock,
} from "lucide-react";
import { SubscriptionInfo, SubscriptionPayment, getPaymentPixAction } from "@/actions/subscription";
import Link from "next/link";

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

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
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
        return { label: "Em Configuração Inicial", class: "text-amber-700 bg-amber-50 border-amber-200" };
      case "SUSPENSO_PAGAMENTO":
        return { label: "Pagamento Pendente", class: "text-rose-700 bg-rose-50 border-rose-200" };
      case "SUSPENSO_ADMIN":
        return { label: "Bloqueio Administrativo", class: "text-rose-700 bg-rose-50 border-rose-200" };
      default:
        return { label: status, class: "text-slate-700 bg-slate-50 border-slate-200" };
    }
  };

  const statusBadge = getStatusBadge(tenant.statusConta);

  const recursosPadrao = [
    "Emissão ilimitada de NF-e e Retorno de Facção com 1 clique",
    "Preenchimento e cálculo automático de CFOP de retorno",
    "Consulta e importação de XML e PDF direto da SEFAZ via DFe",
    "Fechamento mensal consolidado com pacote ZIP para o contador",
    "Painel de auditoria e logs detalhados de cada operação fiscal",
    "Certificado digital A1 protegido em infraestrutura dedicada",
    "Suporte técnico direto para alinhamento e dúvidas fiscais",
  ];

  const whatsappSuporteUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(
    `Olá! Gostaria de falar sobre a assinatura da minha oficina: ${tenant.razaoSocial} (CNPJ: ${tenant.cnpj}) — Plano: ${
      isParceria ? "Plano Parceria (24 meses)" : "Plano Flex"
    }.`
  )}`;

  // Encontra fatura aberta ou vencida mais recente para destaque
  const pendingPayment = tenant.payments.find(
    (p) => p.status === "PENDING" || p.status === "OVERDUE"
  );

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

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Cabeçalho da Página */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          Minha Assinatura
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Acompanhe os dados da sua oficina, o status da sua conta e as faturas do seu plano.
        </p>
      </div>

      {/* Alerta de Pendência Financeira se houver */}
      {tenant.statusConta === "SUSPENSO_PAGAMENTO" && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-rose-900">
                Mensalidade pendente de regularização
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Para manter a emissão de notas fiscais ativa, realize o pagamento da sua fatura via Pix ou Boleto.
              </p>
            </div>
          </div>
          {pendingPayment && (
            <button
              onClick={() => handleOpenPix(pendingPayment)}
              type="button"
              className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer shrink-0"
            >
              Pagar via Pix
            </button>
          )}
        </div>
      )}

      {/* Resumo da Oficina / Conta */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Empresa Titular
            </span>
            <h2 className="text-base font-semibold text-slate-900 mt-0.5">
              {tenant.razaoSocial}
            </h2>
            {tenant.nomeFantasia && (
              <p className="text-xs text-slate-500">{tenant.nomeFantasia}</p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border ${statusBadge.class}`}
            >
              {statusBadge.label}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-slate-900 text-white">
              {isParceria ? "Plano Parceria (24 meses)" : "Plano Flex"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block">CNPJ</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              {formatCnpj(tenant.cnpj)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Vencimento da Mensalidade</span>
            <span className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>Todo dia {tenant.diaVencimento}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Valor Mensal</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              R$ 289,90 <span className="text-[11px] font-normal text-slate-500">(+1,99% = R$ 295,67)</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Taxa de Implantação</span>
            <span className={`font-semibold mt-0.5 block ${isParceria ? "text-emerald-700" : "text-slate-800"}`}>
              {isParceria ? "R$ 0,00 (100% Isento)" : "R$ 490,00 (Taxa única)"}
            </span>
          </div>
        </div>
      </div>

      {/* Histórico / Faturas Recorrentes */}
      {tenant.payments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Faturas da Assinatura
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mensalidades geradas automaticamente todo mês no dia do seu vencimento.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3">Valor</th>
                  <th className="py-2.5 px-3">Forma</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenant.payments.map((p) => {
                  const isPaid = p.status === "RECEIVED" || p.status === "CONFIRMED";
                  const isOverdue = p.status === "OVERDUE";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-medium text-slate-900">
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
                          : "Pix / Boleto / Cartão"}
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
                              className="px-2.5 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Planos Comerciais */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Condições Contratuais
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Modelos de adesão transparentes com mensalidade fixa de R$ 289,90 (+ taxa de processamento de 1,99% = R$ 295,67).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Plano Parceria (24 Meses) */}
          <div
            className={`bg-white rounded-lg p-6 flex flex-col justify-between relative ${
              isParceria
                ? "border-2 border-slate-900 shadow-xs"
                : "border border-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  Plano Parceria
                </h3>
                {isParceria ? (
                  <span className="text-[11px] font-bold text-white bg-slate-900 px-2.5 py-1 rounded">
                    SEU PLANO ATUAL
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    Fidelidade de 2 anos
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Nós assumimos 100% do custo de implantação em troca de uma parceria de longo prazo de 24 meses.
              </p>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-semibold text-slate-500">R$</span>
                  <span className="text-3xl font-bold tracking-tight text-slate-900">
                    289,90
                  </span>
                  <span className="text-xs text-slate-500">/ mês</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Taxa de processamento bancário (1,99%): <strong>+ R$ 5,77</strong> • Total mensal: <strong>R$ 295,67</strong>
                </p>
                <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1.5">
                  Taxa de implantação e setup: <strong className="font-semibold">R$ 0,00 (100% Isento)</strong>
                </p>
              </div>

              <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-slate-900 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900">Economia de R$ 490,00</strong> na taxa inicial de configuração
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-slate-900 shrink-0 mt-0.5" />
                  <span>Alinhamento e infraestrutura dedicados por nossa equipe</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-slate-900 shrink-0 mt-0.5" />
                  <span>Contrato de parceria com vigência e estabilidade de 24 meses</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-slate-900 shrink-0 mt-0.5" />
                  <span>Geração automática da fatura mensal no dia do vencimento</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 block">
                {isParceria
                  ? "Este é o plano ativo configurado para o seu CNPJ."
                  : "Ideal para oficinas com operação contínua e previsibilidade de custos."}
              </span>
            </div>
          </div>

          {/* Plano Flex (Sem Fidelidade) */}
          <div
            className={`bg-white rounded-lg p-6 flex flex-col justify-between ${
              !isParceria
                ? "border-2 border-slate-900 shadow-xs"
                : "border border-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  Plano Flex
                </h3>
                {!isParceria ? (
                  <span className="text-[11px] font-bold text-white bg-slate-900 px-2.5 py-1 rounded">
                    SEU PLANO ATUAL
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Sem Fidelidade
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Para quem prefere liberdade total sem carência contratual, pagando a taxa única de configuração de entrada.
              </p>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-semibold text-slate-500">R$</span>
                  <span className="text-3xl font-bold tracking-tight text-slate-900">
                    289,90
                  </span>
                  <span className="text-xs text-slate-500">/ mês</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Taxa de processamento bancário (1,99%): <strong>+ R$ 5,77</strong> • Total mensal: <strong>R$ 295,67</strong>
                </p>
                <p className="text-xs text-slate-700 mt-1">
                  Taxa única de implantação e servidor: <strong className="font-semibold">R$ 490,00</strong>
                </p>
              </div>

              <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>Configuração e homologação inicial completa</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>Sem tempo mínimo de permanência contratual</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>Acesso irrestrito a todas as funcionalidades do sistema</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>Suporte e atualizações automáticas de legislação tributária</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 block">
                {!isParceria
                  ? "Este é o plano ativo configurado para o seu CNPJ."
                  : "Contrato mensal com renovação automática sem carência."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Funcionalidades Incluídas */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
          O que está incluso em sua assinatura
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          Independentemente do modelo de fidelidade, sua oficina conta com a suíte fiscal completa:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
          {recursosPadrao.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600 shrink-0 mt-1.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contato Comercial */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Dúvidas sobre faturamento ou alteração de plano?
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Nossa equipe técnica e comercial está disponível para esclarecer dúvidas sobre contratos e notas de serviço.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/fechamento"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Ver Fechamentos</span>
          </Link>
          <a
            href={whatsappSuporteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Falar com Atendimento</span>
          </a>
        </div>
      </div>

      {/* Modal de Pagamento Pix Direto */}
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
                      {copiedPix ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
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
