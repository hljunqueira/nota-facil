import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { StatusConta } from "@prisma/client";

/**
 * Webhook Oficial do Asaas — Produção
 * URL: https://appnotafacil.online/api/webhooks/asaas
 * 
 * Gerencia a ativação e suspensão automática de contas com base na liquidação
 * de faturas das oficinas (mensalidade R$ 295,67 / mês).
 */

export async function GET() {
  return NextResponse.json({
    service: "Nota Fácil - Asaas Webhook",
    status: "active",
    environment: "production",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const receivedToken = req.headers.get("asaas-access-token");
    const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;

    // 1. Validação de Segurança do Token do Webhook
    if (webhookSecret && receivedToken !== webhookSecret) {
      console.warn("[AsaasWebhook] Token de autenticação inválido recebido:", receivedToken);
      return NextResponse.json({ error: "Token de webhook inválido." }, { status: 401 });
    }

    const rawBody = await req.json();
    const event = rawBody?.event;
    const payment = rawBody?.payment;
    const subscription = rawBody?.subscription;

    const paymentId = payment?.id;
    const customerId = payment?.customer || subscription?.customer;
    const subscriptionId = payment?.subscription || subscription?.id;
    const externalRef = payment?.externalReference || subscription?.externalReference;

    console.log(`[AsaasWebhook] Evento recebido: ${event} | Payment: ${paymentId} | Customer: ${customerId}`);

    if (!event) {
      return NextResponse.json({ error: "Evento ausente no payload." }, { status: 400 });
    }

    // 2. Localização Resiliente do Tenant (por ExternalReference, CustomerId ou SubscriptionId)
    let tenant = null;

    if (externalRef) {
      tenant = await prismaAdmin.tenant.findUnique({
        where: { id: externalRef },
      });
    }

    if (!tenant && customerId) {
      tenant = await prismaAdmin.tenant.findFirst({
        where: { asaasCustomerId: customerId },
      });
    }

    if (!tenant && subscriptionId) {
      tenant = await prismaAdmin.tenant.findFirst({
        where: { asaasSubscriptionId: subscriptionId },
      });
    }

    if (!tenant) {
      console.warn(`[AsaasWebhook] Tenant não localizado para os dados informados:`, {
        externalRef,
        customerId,
        subscriptionId,
      });
      // Retorna 200 para evitar que o Asaas repita indefinidamente eventos de clientes não cadastrados
      return NextResponse.json({ received: true, warning: "Tenant não encontrado no sistema." });
    }

    // 3. Controle de Idempotência
    const idempotencyKey = `${event}_${paymentId || subscriptionId || "general"}`;
    const recentAudit = await prismaAdmin.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        acao: `ASAAS_${event}`,
        entidadeId: idempotencyKey,
      },
    });

    if (recentAudit) {
      console.log(`[AsaasWebhook] Evento ${idempotencyKey} já processado anteriormente. Ignorando duplicação.`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // 4. Execução das Ações de Negócio
    let novoStatusConta: StatusConta | null = null;

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        // Pagamento efetuado com sucesso via Pix, Boleto ou Cartão
        if (
          tenant.statusConta === StatusConta.SUSPENSO_PAGAMENTO ||
          tenant.statusConta === StatusConta.EM_ONBOARDING
        ) {
          novoStatusConta = StatusConta.ATIVO;
        }
        break;

      case "PAYMENT_OVERDUE":
        // Fatura venceu sem pagamento
        if (tenant.statusConta === StatusConta.ATIVO) {
          novoStatusConta = StatusConta.SUSPENSO_PAGAMENTO;
        }
        break;

      case "PAYMENT_REFUNDED":
        // Estorno de pagamento
        novoStatusConta = StatusConta.SUSPENSO_PAGAMENTO;
        break;

      case "SUBSCRIPTION_CREATED":
      case "SUBSCRIPTION_UPDATED":
        // Sincroniza o subscriptionId se ainda não estiver salvo
        if (subscriptionId && tenant.asaasSubscriptionId !== subscriptionId) {
          await prismaAdmin.tenant.update({
            where: { id: tenant.id },
            data: { asaasSubscriptionId: subscriptionId },
          });
        }
        break;

      default:
        break;
    }

    // Atualiza status da conta se houve alteração
    if (novoStatusConta && novoStatusConta !== tenant.statusConta) {
      await prismaAdmin.tenant.update({
        where: { id: tenant.id },
        data: { statusConta: novoStatusConta },
      });
      console.log(`[AsaasWebhook] Tenant ${tenant.id} atualizado para statusConta: ${novoStatusConta}`);
    }

    // 5. Registro de Auditoria do Evento
    await prismaAdmin.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "SYSTEM",
        actorId: "asaas_webhook",
        acao: `ASAAS_${event}`,
        entidade: "Tenant",
        entidadeId: idempotencyKey,
        detalhe: {
          event,
          paymentId,
          customerId,
          subscriptionId,
          valor: payment?.value,
          formaPagamento: payment?.billingType,
          statusAnterior: tenant.statusConta,
          novoStatus: novoStatusConta || tenant.statusConta,
        },
      },
    });

    return NextResponse.json({
      received: true,
      event,
      tenantId: tenant.id,
      statusConta: novoStatusConta || tenant.statusConta,
    });
  } catch (err: any) {
    console.error("[AsaasWebhook] Erro fatal ao processar webhook:", err);
    return NextResponse.json(
      {
        received: false,
        error: err.message || "Erro interno ao processar webhook.",
      },
      { status: 200 }
    );
  }
}
