import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/prismaAdmin";

/**
 * Stub de Integração Asaas — Cobrança Recorrente Futura
 * 
 * Este endpoint está preparado para receber notificações de webhook do Asaas (https://docs.asaas.com/)
 * Eventos futuros suportados:
 * - PAYMENT_RECEIVED / PAYMENT_CONFIRMED: Liberação/manutenção de statusConta = ATIVO
 * - PAYMENT_OVERDUE: Transição de statusConta = SUSPENSO_PAGAMENTO
 * - SUBSCRIPTION_CREATED / SUBSCRIPTION_UPDATED: Mapeamento de asaasSubscriptionId
 * 
 * NOTA DE SEGURANÇA: Nenhum faturamento ou bloqueio financeiro está ativo nesta versão do MVP.
 * O endpoint responde HTTP 200 informativo e seguro sem efeitos colaterais.
 */

export async function GET() {
  return NextResponse.json({
    service: "Nota Fácil - Asaas Webhook Stub",
    status: "online",
    message: "Endpoint ativo em modo stub para homologação de cobrança futura.",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("asaas-access-token");
    const rawBody = await req.json();

    console.log("[AsaasWebhook:Stub] Webhook recebido:", {
      event: rawBody?.event,
      paymentId: rawBody?.payment?.id,
      customerId: rawBody?.payment?.customer || rawBody?.subscription?.customer,
    });

    // TODO: Futura validação de segurança via ASAAS_WEBHOOK_SECRET
    // if (process.env.ASAAS_WEBHOOK_SECRET && signature !== process.env.ASAAS_WEBHOOK_SECRET) {
    //   return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    // }

    const event = rawBody?.event;
    const customerId = rawBody?.payment?.customer || rawBody?.subscription?.customer;

    // TODO: Tratamento de eventos de cobrança futura:
    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        // TODO: Localizar tenant por asaasCustomerId e garantir statusConta = ATIVO
        console.log(`[AsaasWebhook:Stub] Pagamento confirmado para customer ${customerId}. (Ação futura: reativar tenant)`);
        break;

      case "PAYMENT_OVERDUE":
        // TODO: Localizar tenant por asaasCustomerId e notificar/suspender por inadimplência
        console.log(`[AsaasWebhook:Stub] Pagamento vencido para customer ${customerId}. (Ação futura: transicionar para SUSPENSO_PAGAMENTO)`);
        break;

      case "SUBSCRIPTION_CREATED":
        console.log(`[AsaasWebhook:Stub] Assinatura criada para customer ${customerId}.`);
        break;

      default:
        console.log(`[AsaasWebhook:Stub] Evento ${event} registrado em modo informativo.`);
        break;
    }

    // Registra na auditoria administrativa para rastreabilidade
    if (customerId) {
      const tenant = await prismaAdmin.tenant.findFirst({
        where: { asaasCustomerId: customerId },
        select: { id: true },
      });

      if (tenant) {
        await prismaAdmin.auditLog.create({
          data: {
            tenantId: tenant.id,
            actorType: "SYSTEM",
            actorId: "asaas_webhook_stub",
            acao: "ASAAS_WEBHOOK_RECEBIDO",
            entidade: "Tenant",
            entidadeId: tenant.id,
            detalhe: {
              event,
              paymentId: rawBody?.payment?.id,
            },
          },
        });
      }
    }

    return NextResponse.json({
      received: true,
      event,
      mode: "STUB_HOMOLOGACAO",
      message: "Webhook recebido com sucesso pelo stub do Nota Fácil.",
    });
  } catch (err: any) {
    console.error("[AsaasWebhook:Stub] Erro ao processar payload:", err);
    return NextResponse.json(
      {
        received: false,
        error: err.message || "Erro interno ao processar webhook.",
      },
      { status: 200 } // Retorna 200 para evitar retentativas infinitas de webhooks mal formatados em testes
    );
  }
}
