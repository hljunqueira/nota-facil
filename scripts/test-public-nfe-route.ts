import { NextRequest } from "next/server";
import { GET as getPublicFile } from "../src/app/api/public/nfe/[id]/[fileType]/route";
import { getPublicInvoiceUrl, formatInvoiceShareMessage } from "../src/lib/services/invoiceShare";

async function main() {
  console.log("=== INICIANDO TESTE DO ENDPOINT E ROTAS PÚBLICAS DE NF-E ===");

  // 1. Teste de validação de extensão inválida (deve retornar HTTP 400 antes de tocar no banco)
  console.log("1. Testando validação de extensão inválida...");
  const reqInvalid = new NextRequest("http://localhost:3000/api/public/nfe/test-id/exe");
  const resInvalid = await getPublicFile(reqInvalid, {
    params: { id: "test-id", fileType: "exe" },
  });

  if (resInvalid.status !== 400) {
    throw new Error(`Esperado status 400 para extensão inválida, recebido: ${resInvalid.status}`);
  }
  const bodyInvalid = await resInvalid.json();
  if (!bodyInvalid.error?.includes("inválido")) {
    throw new Error(`Mensagem de erro inesperada: ${JSON.stringify(bodyInvalid)}`);
  }
  console.log("-> Validação de extensão rejeitou tipo não autorizado com HTTP 400!");

  // 2. Validação da URL canônica e rotas no middleware
  console.log("2. Validando URLs geradas para compatibilidade com middleware...");
  const sampleKey = "42260972305295000115550010002385901023122312";
  const publicUrl = getPublicInvoiceUrl(sampleKey, "https://appnotafacil.online");
  if (!publicUrl.startsWith("https://appnotafacil.online/nfe/")) {
    throw new Error(`URL pública gerada com padrão incorreto: ${publicUrl}`);
  }
  console.log("-> URL pública canônica validada:", publicUrl);

  // 3. Validação de mensagens para WhatsApp
  console.log("3. Validando mensagem formatada de compartilhamento...");
  const share = formatInvoiceShareMessage({
    invoice: {
      id: "cm12345678",
      numero: 107,
      serie: 1,
      chaveAcesso: sampleKey,
      valorTotal: 1456.0,
      modalidadeEmissao: "COBRANCA_INDUSTRIALIZACAO",
      partner: {
        razaoSocial: "RITMI CONFECCOES LTDA",
        whatsappFinanceiro: "47999998888",
      },
    },
    baseUrl: "https://appnotafacil.online",
  });

  if (!share.whatsappUrl.includes("wa.me/5547999998888")) {
    throw new Error("Link do WhatsApp não incluiu telefone formatado com 55");
  }
  if (!share.message.includes(publicUrl.replace(sampleKey, "cm12345678"))) {
    throw new Error("Mensagem não contém link público da nota");
  }
  console.log("-> Formatação e deep link do WhatsApp validados com sucesso!");

  console.log("=== TODOS OS TESTES DE ROTAS PÚBLICAS CONCLUÍDOS COM SUCESSO 100% ===");
}

main().catch((err) => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
