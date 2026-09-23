import assert from "node:assert";
import { isValidNfeKey, calculateNfeCheckDigit, extractNfeKeyFromText } from "@/lib/services/nfeKey";

async function runTests() {
  console.log("--- TESTES DE VALIDAÇÃO E EXTRAÇÃO DE CHAVE NF-E ---");

  // 1. Chaves conhecidas
  const validKeySC = "42260972305295000115550010002385901023122312";
  const validKey103 = "42260972305295000115550010002379501023044518";
  const validKey104 = "42260872305295000115550010002371381022922579";

  assert.strictEqual(isValidNfeKey(validKeySC), true, "Chave SC deve ser válida");
  assert.strictEqual(isValidNfeKey(validKey103), true, "Chave 103 deve ser válida");
  assert.strictEqual(isValidNfeKey(validKey104), true, "Chave 104 deve ser válida");

  // 2. Chaves corrompidas com 1 no início (o bug relatado)
  const corruptedKey103 = "14226097230529500011555001000237950102304451";
  const corruptedKey104 = "14226087230529500011555001000237138102292257";
  assert.strictEqual(isValidNfeKey(corruptedKey103), false, "Chave corrompida 103 não pode ser válida");
  assert.strictEqual(isValidNfeKey(corruptedKey104), false, "Chave corrompida 104 não pode ser válida");

  // 3. Cálculo de Dígito Verificador Módulo 11
  const base103 = "4226097230529500011555001000237950102304451";
  assert.strictEqual(calculateNfeCheckDigit(base103), 8, "DV da base 103 deve ser 8");

  const base104 = "4226087230529500011555001000237138102292257";
  assert.strictEqual(calculateNfeCheckDigit(base104), 9, "DV da base 104 deve ser 9");

  // 4. Extração de texto de DANFE com '1 - SAÍDA' ou '1' colado na chave
  const rawDanfeTextWithLeading1 = `
    DANFE
    1 - SAÍDA
    1             4226 0972 3052 9500 0115 5500 1000 2385 9010 2312 2312
    0 - ENTRADA
    CHAVE DE ACESSO
  `;
  const extractedKey1 = extractNfeKeyFromText(rawDanfeTextWithLeading1);
  assert.strictEqual(extractedKey1, validKeySC, "Deve ignorar o '1' e extrair a chave real de 44 dígitos");

  // 5. Extração de texto colado sem espaços (o que acontecia no replace)
  const rawGluedText = "DANFE142260972305295000115550010002385901023122312PROTOCOLO";
  const extractedKey2 = extractNfeKeyFromText(rawGluedText);
  assert.strictEqual(extractedKey2, validKeySC, "Deve extrair a chave válida de 44 dígitos mesmo colada com texto");

  console.log("✅ TODOS OS TESTES PASSARAM COM SUCESSO!");
}

runTests().catch((err) => {
  console.error("❌ FALHA NO TESTE:", err);
  process.exit(1);
});
