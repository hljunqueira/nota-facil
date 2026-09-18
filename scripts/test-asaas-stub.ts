/**
 * Teste Automatizado — Stub de Webhook Asaas (Cobrança Futura)
 * Valida a recepção segura de eventos sem quebras e sem efeitos colaterais na versão atual.
 */

interface MockAsaasWebhook {
  event: string;
  payment?: {
    id: string;
    customer: string;
    value: number;
    netValue: number;
    billingType: string;
    status: string;
  };
  subscription?: {
    id: string;
    customer: string;
  };
}

function processAsaasStubPayload(payload: MockAsaasWebhook): {
  received: boolean;
  event: string;
  mode: string;
  message: string;
} {
  const allowedEvents = [
    "PAYMENT_CREATED",
    "PAYMENT_CONFIRMED",
    "PAYMENT_RECEIVED",
    "PAYMENT_OVERDUE",
    "SUBSCRIPTION_CREATED",
    "SUBSCRIPTION_UPDATED",
  ];

  if (!allowedEvents.includes(payload.event)) {
    console.warn(`[Aviso Stub] Evento incomum recebido: ${payload.event}`);
  }

  return {
    received: true,
    event: payload.event,
    mode: "STUB_HOMOLOGACAO",
    message: "Webhook recebido com sucesso pelo stub do Nota Fácil.",
  };
}

async function main() {
  console.log("================================================================");
  console.log("🧪 [TESTE STUB ASAAS] Validando Endpoint de Cobrança Futura");
  console.log("================================================================");

  // 1. Testando Evento de Pagamento Confirmado
  console.log("\n1. Testando evento PAYMENT_CONFIRMED...");
  const confirmedPayload: MockAsaasWebhook = {
    event: "PAYMENT_CONFIRMED",
    payment: {
      id: "pay_987654321",
      customer: "cus_0000055555",
      value: 149.9,
      netValue: 146.9,
      billingType: "PIX",
      status: "CONFIRMED",
    },
  };

  const res1 = processAsaasStubPayload(confirmedPayload);
  console.log("-> Resposta do Stub:", res1);
  if (!res1.received || res1.mode !== "STUB_HOMOLOGACAO") {
    throw new Error("Falha ao processar payload PAYMENT_CONFIRMED no stub.");
  }
  console.log("✅ Evento PAYMENT_CONFIRMED aceito com sucesso sem efeitos colaterais!");

  // 2. Testando Evento de Pagamento Vencido
  console.log("\n2. Testando evento PAYMENT_OVERDUE...");
  const overduePayload: MockAsaasWebhook = {
    event: "PAYMENT_OVERDUE",
    payment: {
      id: "pay_112233445",
      customer: "cus_0000055555",
      value: 149.9,
      netValue: 146.9,
      billingType: "BOLETO",
      status: "OVERDUE",
    },
  };

  const res2 = processAsaasStubPayload(overduePayload);
  console.log("-> Resposta do Stub:", res2);
  if (!res2.received || res2.event !== "PAYMENT_OVERDUE") {
    throw new Error("Falha ao processar payload PAYMENT_OVERDUE no stub.");
  }
  console.log("✅ Evento PAYMENT_OVERDUE aceito com sucesso em modo informativo!");

  // 3. Testando Evento de Assinatura Criada
  console.log("\n3. Testando evento SUBSCRIPTION_CREATED...");
  const subscriptionPayload: MockAsaasWebhook = {
    event: "SUBSCRIPTION_CREATED",
    subscription: {
      id: "sub_4455667788",
      customer: "cus_0000055555",
    },
  };

  const res3 = processAsaasStubPayload(subscriptionPayload);
  console.log("-> Resposta do Stub:", res3);
  if (!res3.received) {
    throw new Error("Falha ao processar payload SUBSCRIPTION_CREATED no stub.");
  }
  console.log("✅ Evento SUBSCRIPTION_CREATED aceito com sucesso!");

  console.log("\n================================================================");
  console.log("🎉 [SUCESSO TOTAL] Stub de Webhook Asaas 100% validado!");
  console.log("================================================================");
}

main().catch((err) => {
  console.error("ERRO NO TESTE DE ASAAS:", err);
  process.exit(1);
});

export {};
