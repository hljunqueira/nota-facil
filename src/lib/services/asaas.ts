import { prismaAdmin } from "@/lib/prismaAdmin";

function getAsaasApiKey(): string {
  let key = process.env.ASAAS_API_KEY || "";
  key = key.replace(/^["']|["']$/g, "").trim();

  // Se o Next.js / @next/env zerou a chave por causa da interpolação de $,
  // lê diretamente do arquivo .env sem interpolação
  if (!key) {
    try {
      const fs = require("fs");
      const path = require("path");
      const envPaths = [
        path.join(process.cwd(), ".env"),
        path.join(process.cwd(), ".env.production"),
        path.join(process.cwd(), ".env.local"),
        "/opt/notafacil/.env",
        "/app/.env",
      ];
      for (const p of envPaths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, "utf8");
          const match = content.match(/ASAAS_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
          if (match && match[1]) {
            let extracted = match[1].trim();
            if (extracted.startsWith("$$")) {
              extracted = extracted.substring(1); // Converte $$ em $
            }
            if (extracted) {
              key = extracted;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error("[AsaasService] Erro ao ler .env diretamente:", e);
    }
  }

  return key;
}

function getAsaasApiUrl(): string {
  let url = process.env.ASAAS_API_URL || "";
  url = url.replace(/^["']|["']$/g, "").trim();
  if (!url) {
    url = "https://api.asaas.com/v3";
  }
  return url;
}

// Valor base da mensalidade R$ 289,90 + taxa de gateway de 1,99% (R$ 5,77) = R$ 295,67
export const VALOR_MENSALIDADE_BASE = 289.9;
export const VALOR_MENSALIDADE_COM_TAXA = 295.67;

function getHeaders() {
  const apiKey = getAsaasApiKey();
  if (!apiKey) {
    console.warn(
      "[AsaasService] ASAAS_API_KEY não configurada no ambiente. Keys disponíveis:",
      Object.keys(process.env).filter((k) => k.toUpperCase().includes("ASAAS"))
    );
  }
  return {
    "Content-Type": "application/json",
    access_token: apiKey,
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
      const checkRes = await fetch(`${getAsaasApiUrl()}/customers/${tenant.asaasCustomerId}`, {
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
    const searchRes = await fetch(`${getAsaasApiUrl()}/customers?cpfCnpj=${cleanCnpj}`, {
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
  const createRes = await fetch(`${getAsaasApiUrl()}/customers`, {
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
      const updateRes = await fetch(`${getAsaasApiUrl()}/subscriptions/${subscriptionId}`, {
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
  const createRes = await fetch(`${getAsaasApiUrl()}/subscriptions`, {
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
      ? `${getAsaasApiUrl()}/payments?customer=${identifier}&limit=50&order=asc&sort=dueDate`
      : `${getAsaasApiUrl()}/subscriptions/${identifier}/payments?limit=50&order=asc&sort=dueDate`;

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

  const res = await fetch(`${getAsaasApiUrl()}/payments`, {
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
    const res = await fetch(`${getAsaasApiUrl()}/payments/${paymentId}/pixQrCode`, {
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

/**
 * Cancela todas as cobranças pendentes e assinaturas de um tenant no Asaas
 */
export async function cancelAllPendingAsaasChargesAndSubscriptions(tenantId: string) {
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant || !tenant.asaasCustomerId) {
    return { success: false, error: "Oficina ou cliente Asaas não encontrado." };
  }

  const customerId = tenant.asaasCustomerId;
  const headers = getHeaders();
  let cancelledSubscriptionsCount = 0;
  let cancelledPaymentsCount = 0;

  // 1. Cancela todas as assinaturas vinculadas ao cliente no Asaas
  try {
    const subRes = await fetch(`${getAsaasApiUrl()}/subscriptions?customer=${customerId}&status=ACTIVE&limit=20`, {
      headers,
    });
    if (subRes.ok) {
      const subData = await subRes.json();
      for (const s of subData.data || []) {
        try {
          const delRes = await fetch(`${getAsaasApiUrl()}/subscriptions/${s.id}`, {
            method: "DELETE",
            headers,
          });
          if (delRes.ok) cancelledSubscriptionsCount++;
        } catch (e) {
          console.warn(`[Asaas] Erro ao deletar assinatura ${s.id}:`, e);
        }
      }
    }
  } catch (err) {
    console.error("[Asaas] Erro ao listar assinaturas ativas:", err);
  }

  // 2. Busca e cancela todas as cobranças pendentes
  try {
    const payRes = await fetch(`${getAsaasApiUrl()}/payments?customer=${customerId}&status=PENDING&limit=100`, {
      headers,
    });
    if (payRes.ok) {
      const payData = await payRes.json();
      const payments = payData.data || [];
      for (const p of payments) {
        try {
          const delRes = await fetch(`${getAsaasApiUrl()}/payments/${p.id}`, {
            method: "DELETE",
            headers,
          });
          if (delRes.ok) cancelledPaymentsCount++;
        } catch (delErr) {
          console.warn(`[Asaas] Erro ao deletar cobrança ${p.id}:`, delErr);
        }
      }
    }
  } catch (err) {
    console.error("[Asaas] Erro ao listar cobranças pendentes:", err);
  }

  // 3. Atualiza o tenant no banco: dia de vencimento fixado no dia 10
  await prismaAdmin.tenant.update({
    where: { id: tenantId },
    data: {
      diaVencimento: 10,
      asaasSubscriptionId: null,
    },
  });

  return {
    success: true,
    cancelledSubscriptionsCount,
    cancelledPaymentsCount,
  };
}

/**
 * Emite uma cobrança de mensalidade do mês com vencimento fixo no dia 10
 */
export async function createMonthlyChargeForTenant(
  tenantId: string,
  targetDate?: { year?: number; month?: number; day?: number }
) {
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error("Oficina não encontrada.");
  }

  const customerId = await getOrCreateAsaasCustomer(tenant);
  const now = new Date();
  const year = targetDate?.year || now.getFullYear();
  const month = targetDate?.month !== undefined ? targetDate.month : now.getMonth() + 1; // 1-12
  const day = targetDate?.day || 10;

  const yyyy = String(year);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const dueDate = `${yyyy}-${mm}-${dd}`;

  const valorFinal = VALOR_MENSALIDADE_COM_TAXA;

  const body = {
    customer: customerId,
    billingType: "BOLETO", // Gera boleto bancário e Pix integrados
    value: valorFinal,
    dueDate,
    description: `Mensalidade Nota Fácil — Mês ${mm}/${yyyy} (${tenant.plano === "PARCERIA" ? "Plano Parceria 24m" : "Plano Flex"})`,
    externalReference: `MENSALIDADE_${tenantId}_${yyyy}_${mm}`,
    postalService: false,
  };

  const res = await fetch(`${getAsaasApiUrl()}/payments`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Falha ao gerar cobrança no Asaas: ${errText}`);
  }

  const paymentData = await res.json();
  return {
    success: true,
    payment: paymentData,
  };
}

/**
 * Rotina executada todo dia 1º do mês para gerar as cobranças com vencimento no dia 10
 */
export async function generateMonthlyChargesForAllActiveTenants() {
  console.log("[AsaasCron] Iniciando geração mensal de faturas para todas as oficinas ativas...");
  const tenants = await prismaAdmin.tenant.findMany({
    where: {
      statusConta: { in: ["ATIVO", "EM_ONBOARDING"] },
      statusCadastro: "APROVADO",
    },
  });

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const targetDueDate = `${yyyy}-${mm}-10`;

  let createdCount = 0;
  let skippedCount = 0;

  for (const t of tenants) {
    try {
      const customerId = t.asaasCustomerId || (await getOrCreateAsaasCustomer(t));

      // Verifica se já existe cobrança com este vencimento ou referência externa
      const extRef = `MENSALIDADE_${t.id}_${yyyy}_${mm}`;
      const checkRes = await fetch(`${getAsaasApiUrl()}/payments?customer=${customerId}&externalReference=${extRef}`, {
        headers: getHeaders(),
      });
      const checkData = await checkRes.json();
      if (checkData.data && checkData.data.length > 0) {
        console.log(`[AsaasCron] Tenant ${t.razaoSocial} já possui fatura gerada para ${mm}/${yyyy}. Pulando.`);
        skippedCount++;
        continue;
      }

      await createMonthlyChargeForTenant(t.id, {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: 10,
      });
      createdCount++;
      console.log(`[AsaasCron] Fatura gerada com sucesso para ${t.razaoSocial} vencendo em ${targetDueDate}.`);
    } catch (err) {
      console.error(`[AsaasCron] Erro ao gerar fatura para tenant ${t.id} (${t.razaoSocial}):`, err);
    }
  }

  return { createdCount, skippedCount, totalTenants: tenants.length };
}

