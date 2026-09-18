/**
 * Script de Teste Automatizado do Dicionário de Erros Fiscais e Monitoramento Sentry
 * Valida a tradução de rejeições herméticas da SEFAZ para linguagem humanizada
 * e testa o disparo estruturado de eventos de exceção para o Sentry.
 */

import { translateFocusNfeError } from "../src/lib/focusNfeErrorMap";
import { captureFiscalException } from "../src/lib/monitoring";

async function runErrorMapTest() {
  console.log("================================================================");
  console.log("🧪 [TESTE DICIONÁRIO DE ERROS SEFAZ] Iniciando Testes de Tradução");
  console.log("================================================================");

  // 1. Teste Rejeição 539 (Duplicidade de NF-e)
  console.log("\n1. Testando Rejeição 539 (Duplicidade de NF-e)...");
  const raw539 = {
    status_sefaz: "539",
    mensagem_sefaz: "Rejeição: Duplicidade de NF-e com diferença na Chave de Acesso [chNFe: 35260100000000000191550010000000011000000099]",
  };
  const err539 = translateFocusNfeError(raw539);
  console.log("Resultado Humanizado:", err539);

  if (!err539.titulo.includes("Número de Nota Fiscal Já Utilizado")) {
    throw new Error(`Título incorreto para erro 539: ${err539.titulo}`);
  }
  if (!err539.comoResolver.includes("Configurações")) {
    throw new Error(`Orientação incorreta para erro 539: ${err539.comoResolver}`);
  }
  console.log("✅ Erro 539 traduzido com sucesso!");

  // 2. Teste Rejeição 232 (IE do Destinatário não vinculada ao CNPJ)
  console.log("\n2. Testando Rejeição 232 (Inscrição Estadual da Fábrica)...");
  const raw232 = "Rejeição 232: IE do destinatário não informada ou não vinculada ao CNPJ da empresa";
  const err232 = translateFocusNfeError(raw232, "232");
  console.log("Resultado Humanizado:", err232);

  if (!err232.titulo.includes("Inscrição Estadual")) {
    throw new Error(`Título incorreto para erro 232: ${err232.titulo}`);
  }
  if (!err232.comoResolver.includes("Sintegra")) {
    throw new Error(`Orientação incorreta para erro 232: ${err232.comoResolver}`);
  }
  console.log("✅ Erro 232 traduzido com sucesso!");

  // 3. Teste Rejeição 284 (Certificado Transmissor Expirado)
  console.log("\n3. Testando Rejeição 284 (Certificado A1 Expirado)...");
  const raw284 = {
    status_sefaz: "284",
    mensagem_sefaz: "Rejeição: Certificado Transmissor expirado na SEFAZ",
  };
  const err284 = translateFocusNfeError(raw284);
  console.log("Resultado Humanizado:", err284);

  if (!err284.titulo.includes("Certificado Digital A1")) {
    throw new Error(`Título incorreto para erro 284: ${err284.titulo}`);
  }
  console.log("✅ Erro 284 traduzido com sucesso!");

  // 4. Teste Cancelamento fora do prazo de 24 horas
  console.log("\n4. Testando Rejeição de Cancelamento Fora do Prazo...");
  const rawPrazo = "A SEFAZ rejeitou o cancelamento: prazo de cancelamento de 24 horas ultrapassado";
  const errPrazo = translateFocusNfeError(rawPrazo);
  console.log("Resultado Humanizado:", errPrazo);

  if (!errPrazo.titulo.includes("Prazo de Cancelamento Expirado")) {
    throw new Error(`Título incorreto para prazo expirado: ${errPrazo.titulo}`);
  }
  if (!errPrazo.comoResolver.includes("Nota Fiscal de Entrada")) {
    throw new Error(`Orientação incorreta para prazo expirado: ${errPrazo.comoResolver}`);
  }
  console.log("✅ Erro de prazo de cancelamento traduzido com sucesso!");

  // 5. Teste de Rastreamento Sentry
  console.log("\n5. Testando captura estruturada de exceção fiscal para o Sentry...");
  captureFiscalException(new Error("Simulação de Falha de Comunicação SEFAZ"), {
    tenantId: "tenant_faccao_01",
    invoiceId: "inv_teste_123",
    statusSefaz: "539",
    mensagemSefaz: "Rejeicao: Duplicidade de NF-e",
    focusNfeRef: "ref_simulada_123",
  });
  console.log("✅ Captura de exceção para o Sentry executada sem falhas!");

  console.log("\n================================================================");
  console.log("🎉 [SUCESSO TOTAL] Dicionário de Erros e Sentry 100% validados!");
  console.log("================================================================");
}

runErrorMapTest()
  .then(() => {
    setTimeout(() => process.exit(0), 100);
  })
  .catch((err) => {
    console.error("❌ ERRO NO TESTE:", err);
    process.exit(1);
  });
