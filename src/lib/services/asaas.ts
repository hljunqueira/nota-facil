import { prismaAdmin } from "@/lib/prismaAdmin";

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";

// Valor base da mensalidade R$ 289,90 + taxa de gateway de 1,99% (R$ 5,77) = R$ 295,67
export const VALOR_MENSALIDADE_BASE = 289.9;
export const VALOR_MENSALIDADE_COM_TAXA = 295.67;

function getHeaders() {
  if (!ASAAS_API_KEY) {
    console.warn("[AsaasService] ASAAS_API_KEY não configurada no ambiente.");
  }
  return {
    "Content-Type": "application/json",
    access_token: ASAAS_API_KEY,
  };
}

/**
 * Calcula a data no formato YYYY-MM-DD para o próximo vencimento
 * Se a data do dia escolhido no mês atual já passou ou faltar menos de 2 dias,
 * agenda para o próximo mês.
 */
export function calculateNextDueDate(diaVencimento: number): string {
  const now = new Date();
  const safeDay = Math.min(Math.max(diaVencimento || 10, 1), 28); // Limita a 28 para evitar problemas com fevereiro

  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth(); // 0-indexed

  const candidate = new Date(targetYear, targetMonth, safeDay, 23, 59, 59);

  // Se faltam menos de 2 dias para o dia ou já passou no mês corrente, joga para o próximo mês
  const diffDays = (candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 2) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const dueDate = new Date(targetYear, targetMonth, safeDay);
  const yyyy = dueDate.getFullYear();
  const mm = String(dueDate.getMonth() + 1).padStart(2, "0");
  const dd = String(dueDate.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Consulta cliente pelo CNPJ no Asaas para evitar duplicação ou cria novo
 */
export async function getOrCreateAsaasCustomer(tenant: {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  emailPrincipal: string;
  telefoneContato: string;
  asaasCustomerId?: string | null;
}): Promise<string> {
  const cleanCnpj = tenant.cnpj.replace(/\D/g, "");
  const cleanPhone = tenant.telefoneContato ? tenant.telefoneContato.replace(/\D/g, "") : "";

  // 1. Se já tiver customerId salvo no banco, valida no Asaas
  if (tenant.asaasCustomerId) {
    try {
      const checkRes = await fetch(`${ASAAS_API_URL}/customers/${tenant.asaasCustomerId}`, {
        method: "GET",
        headers: getHeaders(),
      });
      if (checkRes.ok) {
        return tenant.asaasCustomerId;
      }
    } catch {
      console.warn("[Asaas] Erro ao validar customer existente, consultando por CNPJ...");
    }
  }

  // 2. Consulta prévia por CNPJ para evitar duplicidade no Asaas
  try {
    const searchRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${cleanCnpj}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        const existingCustomerId = searchData.data[0].id;
        await prismaAdmin.tenant.update({
          where: { id: tenant.id },
          data: { asaasCustomerId: existingCustomerId },
        });
        return existingCustomerId;
      }
    }
  } catch (err) {
    console.error("[Asaas] Falha ao consultar cliente por CNPJ:", err);
  }

  // 3. Cadastra novo cliente no Asaas
  const createRes = await fetch(`${ASAAS_API_URL}/customers`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      name: tenant.razaoSocial || tenant.nomeFantasia || "Oficina Cadastrada",
      cpfCnpj: cleanCnpj,
      email: tenant.emailPrincipal,
      mobilePhone: cleanPhone || undefined,
      phone: cleanPhone || undefined,
      externalReference: tenant.id,
      notificationDisabled: false,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Falha ao cadastrar cliente no gateway Asaas: ${errText}`);
  }

  const createdData = await createRes.json();
  const newCustomerId = createdData.id;

  await (prismaAdmin.tenant as any).update({
    where: { id: tenant.id },
    data: { asaasCustomerId: newCustomerId },
  });

  return newCustomerId;
}

/**
 * Cria ou atualiza a assinatura mensal recorrente no Asaas (R$ 295,67 / mês)
 */
export async function createOrUpdateAsaasSubscription(
  tenantId: string,
  diaVencimento: number = 10,
  plano: "PARCERIA" | "FLEX" = "PARCERIA"
) {
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error("Oficina não encontrada no sistema.");
  }

  const customerId = await getOrCreateAsaasCustomer(tenant);
  const nextDueDate = calculateNextDueDate(diaVencimento);
  const valorFinal = VALOR_MENSALIDADE_COM_TAXA;

  let subscriptionId = tenant.asaasSubscriptionId;

  // 1. Tenta atualizar assinatura existente
  if (subscriptionId) {
    try {
      const updateRes = await fetch(`${ASAAS_API_URL}/subscriptions/${subscriptionId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          value: valorFinal,
          nextDueDate,
          description: `Mensalidade Nota Fácil — Gestão Fiscal e Emissão de NF-e (${
            plano === "PARCERIA" ? "Plano Parceria 24m" : "Plano Flex"
          })`,
        }),
      });

      if (updateRes.ok) {
        const updateData = await updateRes.json();
        await (prismaAdmin.tenant as any).update({
          where: { id: tenantId },
          data: {
            diaVencimento,
            plano,
            asaasSubscriptionId: updateData.id,
          },
        });

        return {
          success: true as const,
          subscriptionId: updateData.id,
          customerId,
          nextDueDate,
          valor: valorFinal,
          plano,
        };
      }
    } catch {
      console.warn("[Asaas] Assinatura anterior não encontrada ou expirada. Criando nova...");
    }
  }

  // 2. Cria nova assinatura mensal
  const createRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      customer: customerId,
      billingType: "BOLETO", // Mensalidade via Pix e Boleto Bancário
      value: valorFinal,
      nextDueDate,
      cycle: "MONTHLY",
      description: `Mensalidade Nota Fácil — Gestão Fiscal e Emissão de NF-e (${
        plano === "PARCERIA" ? "Plano Parceria 24m" : "Plano Flex"
      })`,
      externalReference: tenantId,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Falha ao criar assinatura no gateway Asaas: ${errText}`);
  }

  const subscriptionData = await createRes.json();

  await (prismaAdmin.tenant as any).update({
    where: { id: tenantId },
    data: {
      diaVencimento,
      plano,
      asaasSubscriptionId: subscriptionData.id,
    },
  });

  return {
    success: true as const,
    subscriptionId: subscriptionData.id,
    customerId,
    nextDueDate,
    valor: valorFinal,
    plano,
  };
}

/**
 * Busca histórico e faturas atuais vinculadas à assinatura ou ao cliente
 */
export async function getAsaasSubscriptionPayments(
  identifier: string,
  isCustomer: boolean = false
) {
  if (!identifier) return [];

  try {
    const url = isCustomer
      ? `${ASAAS_API_URL}/payments?customer=${identifier}&limit=50&order=asc&sort=dueDate`
      : `${ASAAS_API_URL}/subscriptions/${identifier}/payments?limit=50&order=asc&sort=dueDate`;

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.data || []).map((item: any) => ({
      id: item.id,
      valor: item.value,
      vencimento: item.dueDate && item.dueDate.includes("-")
        ? item.dueDate.split("-").reverse().join("/")
        : item.dueDate,
      status: item.status, // "PENDING", "CONFIRMED", "RECEIVED", "OVERDUE", etc.
      billingType: item.billingType,
      invoiceUrl: item.invoiceUrl || item.bankSlipUrl || null,
      dataPagamento: item.paymentDate || item.clientPaymentDate || null,
    }));
  } catch (err) {
    console.error("[Asaas] Erro ao buscar pagamentos:", err);
    return [];
  }
}

/**
 * Taxa de implantação avulsa (R$ 490,00)
 * Cobrada via Pix/Boleto ou Cartão de Crédito com taxas repassadas para o cliente
 */
export async function createImplantationCharge({
  tenantId,
  billingType,
  creditCard,
  creditCardHolderInfo,
  installmentCount = 1,
}: {
  tenantId: string;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
  creditCard?: any;
  creditCardHolderInfo?: any;
  installmentCount?: number;
}) {
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error("Oficina não encontrada.");
  }

  const customerId = await getOrCreateAsaasCustomer(tenant);
  const VALOR_BASE = 490.00;

  // No cartão de crédito, repassa taxas da operadora (ex: 3,99% + 1,5% por parcela adicional)
  const taxaCartaoPercent = 0.0399 + (installmentCount > 1 ? (installmentCount - 1) * 0.015 : 0);
  const valorFinal = billingType === "CREDIT_CARD"
    ? Number((VALOR_BASE * (1 + taxaCartaoPercent)).toFixed(2))
    : VALOR_BASE;

  const body: any = {
    customer: customerId,
    billingType,
    value: valorFinal,
    dueDate: new Date().toISOString().split("T")[0],
    description: `Taxa de Implantação e Treinamento Nota Fácil (${installmentCount > 1 ? `${installmentCount}x no Cartão com taxas` : billingType})`,
    externalReference: `IMPLANTACAO_${tenantId}`,
  };

  if (billingType === "CREDIT_CARD") {
    if (installmentCount > 1) {
      body.installmentCount = installmentCount;
      body.totalValue = valorFinal;
    }
    if (creditCard) body.creditCard = creditCard;
    if (creditCardHolderInfo) body.creditCardHolderInfo = creditCardHolderInfo;
  }

  const res = await fetch(`${ASAAS_API_URL}/payments`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao gerar taxa de implantação: ${err}`);
  }

  return res.json();
}

/**
 * Obtém o QR Code Pix e o código Copia e Cola para pagamento imediato
 */
export async function getAsaasPaymentPix(paymentId: string): Promise<{
  encodedImage: string;
  payload: string;
  expirationDate: string;
} | null> {
  if (!paymentId) return null;

  try {
    const res = await fetch(`${ASAAS_API_URL}/payments/${paymentId}/pixQrCode`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      encodedImage: data.encodedImage, // Base64 do PNG
      payload: data.payload, // Pix Copia e Cola
      expirationDate: data.expirationDate,
    };
  } catch (err) {
    console.error("[Asaas] Erro ao obter Pix QR Code:", err);
    return null;
  }
}
