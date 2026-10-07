import { formatInvoiceShareMessage, getPublicInvoiceUrl } from "../src/lib/services/invoiceShare";

async function main() {
  console.log("=== INICIANDO TESTE DO SERVIÇO DE COMPARTILHAMENTO PÚBLICO (INVOICE SHARE) ===");

  const baseUrl = "https://appnotafacil.online";
  const mockInvoice = {
    id: "cltestinv1234567890",
    numero: 107,
    serie: 1,
    chaveAcesso: "42260972305295000115550010002385901023122312",
    valorTotal: 1456.0,
    modalidadeEmissao: "COBRANCA_INDUSTRIALIZACAO",
    partner: {
      razaoSocial: "RITMI CONFECCOES LTDA",
      whatsappFinanceiro: "(47) 99876-5432",
    },
  };

  // 1. Validação de geração de URL pública
  console.log("1. Testando getPublicInvoiceUrl...");
  const publicUrl = getPublicInvoiceUrl(mockInvoice.id, baseUrl);
  console.log("-> URL Pública gerada:", publicUrl);

  if (publicUrl !== "https://appnotafacil.online/nfe/cltestinv1234567890") {
    throw new Error(`URL Pública incorreta: ${publicUrl}`);
  }

  // 2. Validação da mensagem formatada para WhatsApp
  console.log("2. Testando formatInvoiceShareMessage com telefone do parceiro...");
  const shareResult = formatInvoiceShareMessage({
    invoice: mockInvoice,
    baseUrl,
  });

  console.log("-> Texto da mensagem:\n" + shareResult.message);
  console.log("-> Link do WhatsApp:", shareResult.whatsappUrl);

  if (!shareResult.message.includes("NF-e Nº 107 (Série 1)")) {
    throw new Error("Mensagem não contém número e série da nota");
  }

  if (!shareResult.message.includes("RITMI CONFECCOES LTDA")) {
    throw new Error("Mensagem não contém destinatário");
  }

  if (!shareResult.message.includes("R$ 1.456,00")) {
    throw new Error("Mensagem não contém valor formatado em BRL");
  }

  if (!shareResult.message.includes(publicUrl)) {
    throw new Error("Mensagem não contém o link público da nota");
  }

  // Telefone deve ser formatado com DDI 55
  if (!shareResult.whatsappUrl.startsWith("https://wa.me/5547998765432?text=")) {
    throw new Error(`Link do WhatsApp com telefone inválido: ${shareResult.whatsappUrl}`);
  }

  // 3. Validação sem telefone do parceiro
  console.log("3. Testando formatInvoiceShareMessage sem telefone...");
  const shareWithoutPhone = formatInvoiceShareMessage({
    invoice: {
      ...mockInvoice,
      partner: { razaoSocial: "FÁBRICA TESTE" },
    },
    baseUrl,
  });

  if (!shareWithoutPhone.whatsappUrl.startsWith("https://wa.me/?text=")) {
    throw new Error(`Link do WhatsApp sem telefone deveria usar wa.me/?text=, obtido: ${shareWithoutPhone.whatsappUrl}`);
  }

  console.log("=== TESTE DE COMPARTILHAMENTO PÚBLICO CONCLUÍDO COM SUCESSO 100% ===");
}

main().catch((err) => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
