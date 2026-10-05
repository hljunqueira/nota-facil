import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

function getApiKey(): string {
  let key = process.env.ASAAS_API_KEY || "";
  if (!key && fs.existsSync("/app/.env")) {
    const content = fs.readFileSync("/app/.env", "utf8");
    const match = content.match(/ASAAS_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
    if (match && match[1]) key = match[1].trim();
  }
  if (key.startsWith("$$")) key = key.substring(1);
  return key.replace(/^["']|["']$/g, "").trim();
}

async function main() {
  const url = process.env.ASAAS_API_URL || "https://api.asaas.com/v3";
  const apiKey = getApiKey();

  console.log("==================================================");
  console.log("🔍 [INSPEÇÃO ASAAS]");
  console.log("API URL:", url);
  console.log("API Key configurada:", !!apiKey, `(tamanho: ${apiKey.length})`);
  console.log("==================================================");

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      razaoSocial: true,
      cnpj: true,
      emailPrincipal: true,
      asaasCustomerId: true,
      asaasSubscriptionId: true,
      diaVencimento: true,
      plano: true,
      statusConta: true,
    },
  });

  console.log(`Encontrados ${tenants.length} tenant(s):`);

  for (const t of tenants) {
    console.log(`\nTenant: ${t.razaoSocial} (${t.cnpj})`);
    console.log(`- ID: ${t.id}`);
    console.log(`- Dia Vencimento Atual: ${t.diaVencimento}`);
    console.log(`- asaasCustomerId: ${t.asaasCustomerId}`);
    console.log(`- asaasSubscriptionId: ${t.asaasSubscriptionId}`);

    if (t.asaasCustomerId) {
      // 1. Busca cobranças (payments)
      const payRes = await fetch(`${url}/payments?customer=${t.asaasCustomerId}&limit=50`, {
        headers: { access_token: apiKey },
      });
      const payData = await payRes.json();
      const payments = payData.data || [];
      console.log(`- Total Cobranças no Asaas: ${payData.totalCount || payments.length}`);
      for (const p of payments) {
        console.log(`  * Cobrança ${p.id} | Status: ${p.status} | Vencimento: ${p.dueDate} | Valor: R$ ${p.value} | Sub: ${p.subscription || "Avulsa"}`);
      }

      // 2. Busca assinaturas (subscriptions)
      const subRes = await fetch(`${url}/subscriptions?customer=${t.asaasCustomerId}&limit=20`, {
        headers: { access_token: apiKey },
      });
      const subData = await subRes.json();
      const subs = subData.data || [];
      console.log(`- Total Assinaturas no Asaas: ${subData.totalCount || subs.length}`);
      for (const s of subs) {
        console.log(`  * Assinatura ${s.id} | Status: ${s.status} | Próx Vencimento: ${s.nextDueDate} | Valor: R$ ${s.value} | Ciclo: ${s.cycle}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
