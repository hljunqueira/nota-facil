import { PrismaClient, TipoNota, StatusNota } from "@prisma/client";
import { getFocusBaseUrl, downloadFocusNfeDocument } from "../src/lib/services/focusNfe";
import { uploadInvoicePdf, uploadInvoiceXml } from "../src/lib/storage";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { cnpj: "00168223000162" },
  });
  if (!tenant) throw new Error("Tenant não encontrado");

  // Atualiza proximoNumero para 101
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { proximoNumero: 101 },
  });
  console.log("[✓] Tenant proximoNumero atualizado para 101!");

  const partner = await prisma.partner.findFirst({
    where: { tenantId: tenant.id, cnpj: "72305295000115" },
  });

  const baseUrl = getFocusBaseUrl(tenant.ambiente);
  const token = tenant.ambiente === "PRODUCAO"
    ? tenant.focusNfeTokenProducao
    : tenant.focusNfeTokenHomologacao;

  const basicAuth = Buffer.from(`${token}:`).toString("base64");

  // Busca a nota recém autorizada
  // ref usada: test_search_num_100_...
  // Podemos buscar pela Focus NFe
  console.log("[✓] Configuração fiscal atualizada no banco de dados.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
