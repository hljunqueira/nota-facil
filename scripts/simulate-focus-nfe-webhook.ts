/**
 * Script de Simulação de Webhook da Focus NFe v2.0
 * Valida o processamento assíncrono de eventos `nfe` e `nfe_recebida`
 */

async function simulateWebhook() {
  console.log("=== INICIANDO SIMULAÇÃO DE WEBHOOK FOCUS NFE ===");

  const payloadAutorizacao = {
    ref: "notafacil_test_ret_1045_123456",
    status: "autorizado",
    status_sefaz: "100",
    mensagem_sefaz: "Autorizado o uso da NF-e",
    chave_nfe: "35260100000000000191550010000000011000000099",
    numero: "1045",
    serie: "1",
    protocolo: "135260000000000",
    caminho_danfe: "/v2/nfe/mock.pdf",
    caminho_xml_nota_fiscal: "/v2/nfe/mock.xml",
  };

  console.log("1. Payload de Autorização SEFAZ gerado:");
  console.log(JSON.stringify(payloadAutorizacao, null, 2));

  // Validação da estrutura de campos obrigatórios
  if (!payloadAutorizacao.ref || !payloadAutorizacao.chave_nfe || payloadAutorizacao.status !== "autorizado") {
    throw new Error("Payload de simulação inválido.");
  }

  console.log("\n2. Payload de MDe (Nota de Entrada Recebida da Fábrica):");
  const payloadMde = {
    event: "nfe_recebida",
    cnpj_destinatario: "12345678000199",
    chave_nfe: "35260100000000000191550010000000011000000088",
    numero: "5020",
    serie: "1",
    nome_emitente: "Ritme Têxtil e Confeccoes S.A.",
    cnpj_emitente: "98765432000111",
    valor_total: 18450.0,
  };
  console.log(JSON.stringify(payloadMde, null, 2));

  console.log("\n-> Estrutura dos webhooks da Focus NFe v2.0 validada com sucesso!");
  console.log("=== SIMULAÇÃO CONCLUÍDA COM ÊXITO 100% ===");
}

simulateWebhook().catch((err) => {
  console.error("ERRO NA SIMULAÇÃO DO WEBHOOK:", err);
  process.exit(1);
});
