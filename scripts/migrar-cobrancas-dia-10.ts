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
  if (!key && fs.existsSync(".env")) {
    const content = fs.readFileSync(".env", "utf8");
    const match = content.match(/ASAAS_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
    if (match && match[1]) key = match[1].trim();
  }
  if (key.startsWith("$$")) key = key.substring(1);
  return key.replace(/^["']|["']$/g, "").trim();
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const url = process.env.ASAAS_API_URL || "https://api.asaas.com/v3";
  const apiKey = getApiKey();

  console.log("==================================================================");
  console.log("💳 [MIGRAÇÃO DE COBRANÇAS ASAAS — VENCIMENTO TODO DIA 10]");
  console.log("==================================================================");

  if (!apiKey) {
    throw new Error("ASAAS_API_KEY não encontrada no ambiente.");
  }

  const headers = {
    "Content-Type": "application/json",
    access_token: apiKey,
  };

  const tenants = await prisma.tenant.findMany({
    where: {
      statusConta: { in: ["ATIVO", "EM_ONBOARDING"] },
    },
  });

  console.log(`Oficinas ativas para atualização: ${tenants.length}`);

  for (const t of tenants) {
    console.log(`\n--------------------------------------------------------------`);
    console.log(`Processando oficina: ${t.razaoSocial} (CNPJ: ${t.cnpj})`);
    console.log(`CustomerID: ${t.asaasCustomerId || "Não cadastrado"}`);

    if (!t.asaasCustomerId) {
      console.log("Oficina sem cliente Asaas. Pulando remoção.");
      continue;
    }

    const customerId = t.asaasCustomerId;

    // 1. CANCELA TODAS AS ASSINATURAS ATIVAS
    console.log("\n1/3. Cancelando assinaturas ativas no Asaas...");
    const subRes = await fetch(`${url}/subscriptions?customer=${customerId}&status=ACTIVE&limit=20`, {
      headers,
    });
    if (subRes.ok) {
      const subData = await subRes.json();
      const subs = subData.data || [];
      console.log(`Encontradas ${subs.length} assinatura(s) ativa(s).`);
      for (const s of subs) {
        const delSub = await fetch(`${url}/subscriptions/${s.id}`, {
          method: "DELETE",
          headers,
        });
        console.log(`- Assinatura ${s.id} cancelada: HTTP ${delSub.status}`);
      }
    }

    // 2. REMOVE TODAS AS COBRANÇAS PENDENTES ATUAIS
    console.log("\n2/3. Removendo todas as cobranças pendentes atuais no Asaas...");
    const payRes = await fetch(`${url}/payments?customer=${customerId}&status=PENDING&limit=100`, {
      headers,
    });
    if (payRes.ok) {
      const payData = await payRes.json();
      const payments = payData.data || [];
      console.log(`Encontradas ${payments.length} cobrança(s) pendente(s). Removendo...`);
      for (const p of payments) {
        const delPay = await fetch(`${url}/payments/${p.id}`, {
          method: "DELETE",
          headers,
        });
        console.log(`- Cobrança ${p.id} (Vencimento: ${p.dueDate}, R$ ${p.value}) removida: HTTP ${delPay.status}`);
        await sleep(150); // Evita rate limit do Asaas
      }
    }

    // 3. ATUALIZA O TENANT NO BANCO
    await prisma.tenant.update({
      where: { id: t.id },
      data: {
        diaVencimento: 10,
        asaasSubscriptionId: null,
      },
    });
    console.log("✅ Banco de dados atualizado: diaVencimento = 10, assinatura zerada.");

    // 4. EMITE SOMENTE A COBRANÇA DO DIA 10 DESTE MÊS (10/10/2026)
    console.log("\n3/3. Emitindo nova cobrança única com vencimento em 10/10/2026...");
    const valorFinal = 295.67; // R$ 289,90 base + R$ 5,77 taxa
    const dueDate = "2026-10-10";

    const createPayRes = await fetch(`${url}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO", // Gera boleto bancário e Pix
        value: valorFinal,
        dueDate: dueDate,
        description: `Mensalidade Nota Fácil — Mês 10/2026 (${t.plano === "PARCERIA" ? "Plano Parceria 24m" : "Plano Flex"})`,
        externalReference: `MENSALIDADE_${t.id}_2026_10`,
        postalService: false,
      }),
    });

    if (!createPayRes.ok) {
      const errText = await createPayRes.text();
      console.error(`❌ Erro ao criar cobrança para 10/10/2026: ${errText}`);
    } else {
      const newPay = await createPayRes.json();
      console.log("\n🎉 NOVA COBRANÇA EMITIDA COM SUCESSO!");
      console.log(`- ID da Cobrança: ${newPay.id}`);
      console.log(`- Vencimento: ${newPay.dueDate}`);
      console.log(`- Valor: R$ ${newPay.value}`);
      console.log(`- Status: ${newPay.status}`);
      console.log(`- Link da Fatura (Boleto/Pix): ${newPay.invoiceUrl || "N/A"}`);
      console.log(`- Linha Digitável do Boleto: ${newPay.bankSlipUrl || "N/A"}`);

      // Busca Pix Copia e Cola
      const pixRes = await fetch(`${url}/payments/${newPay.id}/pixQrCode`, { headers });
      if (pixRes.ok) {
        const pixData = await pixRes.json();
        console.log(`- Pix Copia e Cola: ${pixData.payload ? pixData.payload.slice(0, 40) + "..." : "Disponível na fatura"}`);
      }
    }
  }

  console.log("\n==================================================================");
  console.log("🏁 [MIGRAÇÃO DE COBRANÇAS CONCLUÍDA COM SUCESSO!]");
  console.log("==================================================================");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
