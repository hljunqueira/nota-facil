"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaAdmin } from "@/lib/prismaAdmin";

export interface SubscriptionPayment {
  id: string;
  valor: number;
  vencimento: string;
  status: string;
  billingType: string;
  invoiceUrl: string | null;
  dataPagamento: string | null;
}

export interface SubscriptionInfo {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  emailPrincipal: string;
  telefoneContato: string;
  statusConta: string;
  statusCadastro: string;
  ambiente: string;
  createdAt: string;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  plano: string;
  diaVencimento: number;
  proximaFaturaData: string;
  valorMensalidade: number;
  payments: SubscriptionPayment[];
}

export async function getSubscriptionInfoAction(): Promise<SubscriptionInfo> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    throw new Error("Não autenticado ou sessão de oficina inválida.");
  }

  const tenant = await (prismaAdmin.tenant as any).findUnique({
    where: { id: session.user.tenantId },
    select: {
      id: true,
      razaoSocial: true,
      nomeFantasia: true,
      cnpj: true,
      emailPrincipal: true,
      telefoneContato: true,
      statusConta: true,
      statusCadastro: true,
      ambiente: true,
      createdAt: true,
      asaasCustomerId: true,
      asaasSubscriptionId: true,
      plano: true,
      diaVencimento: true,
    },
  });

  if (!tenant) {
    throw new Error("Oficina não encontrada no sistema.");
  }

  const { calculateNextDueDate, VALOR_MENSALIDADE_COM_TAXA } = await import("@/lib/services/asaas");
  const diaVenc = tenant.diaVencimento || 5;
  const rawDueDate = calculateNextDueDate(diaVenc);
  const [yyyy, mm, dd] = rawDueDate.split("-");
  const proximaFaturaData = `${dd}/${mm}/${yyyy}`;

  let payments: SubscriptionPayment[] = [];
  try {
    const { getAsaasSubscriptionPayments } = await import("@/lib/services/asaas");
    if (tenant.asaasCustomerId) {
      payments = await getAsaasSubscriptionPayments(tenant.asaasCustomerId, true);
    } else if (tenant.asaasSubscriptionId) {
      payments = await getAsaasSubscriptionPayments(tenant.asaasSubscriptionId, false);
    }
  } catch (err) {
    console.error("[getSubscriptionInfoAction] Erro ao buscar pagamentos:", err);
  }

  const pendingPayment = payments.find((p) => p.status === "PENDING" || p.status === "OVERDUE");
  const proximaFaturaFinal = pendingPayment ? pendingPayment.vencimento : proximaFaturaData;

  return {
    ...tenant,
    plano: tenant.plano || "PARCERIA",
    diaVencimento: diaVenc,
    proximaFaturaData: proximaFaturaFinal,
    valorMensalidade: VALOR_MENSALIDADE_COM_TAXA,
    createdAt: tenant.createdAt.toISOString(),
    payments,
  };
}

/**
 * Obtém o QR Code e código Copia e Cola Pix para a fatura selecionada
 */
export async function getPaymentPixAction(paymentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    throw new Error("Não autorizado.");
  }

  const { getAsaasPaymentPix } = await import("@/lib/services/asaas");
  return getAsaasPaymentPix(paymentId);
}
