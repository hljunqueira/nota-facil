import {
  uploadInvoiceXml,
  uploadInvoicePdf,
  uploadMonthlyZip,
  getFileFromStorage,
  deleteFileFromStorage,
} from "../src/lib/storage";

async function main() {
  console.log("=== INICIANDO TESTE DO SERVIÇO DE ARMAZENAMENTO (R2/STORAGE) ===");

  const testTenantId = "tenant_test_123";
  const testChaveAcesso = "35260100000000000191550010000000011000000010";

  // 1. Teste de Upload de XML
  console.log("1. Testando uploadInvoiceXml...");
  const mockXml = `<?xml version="1.0" encoding="UTF-8"?><nfeProc><NFe><infNFe Id="NFe${testChaveAcesso}"><ide><nNF>1</nNF></ide></infNFe></NFe></nfeProc>`;
  const xmlUrl = await uploadInvoiceXml(testTenantId, testChaveAcesso, mockXml);
  console.log("-> XML URL gerada:", xmlUrl);

  if (!xmlUrl || !xmlUrl.includes(`${testChaveAcesso}.xml`)) {
    throw new Error("Falha no retorno da URL do XML");
  }

  // 2. Teste de Upload de PDF
  console.log("2. Testando uploadInvoicePdf...");
  const mockPdf = Buffer.from("%PDF-1.4 Mock DANFE Document for Nota Facil", "utf-8");
  const pdfUrl = await uploadInvoicePdf(testTenantId, testChaveAcesso, mockPdf);
  console.log("-> PDF URL gerada:", pdfUrl);

  if (!pdfUrl || !pdfUrl.includes(`${testChaveAcesso}.pdf`)) {
    throw new Error("Falha no retorno da URL do PDF");
  }

  // 3. Teste de Upload de Fechamento ZIP
  console.log("3. Testando uploadMonthlyZip...");
  const mockZip = Buffer.from("PK\x03\x04MockZipFileContent", "utf-8");
  const zipUrl = await uploadMonthlyZip(testTenantId, "09-2026", mockZip);
  console.log("-> ZIP URL gerada:", zipUrl);

  if (!zipUrl || !zipUrl.includes("fechamento-09-2026.zip")) {
    throw new Error("Falha no retorno da URL do ZIP");
  }

  // 4. Teste de Leitura / Download
  console.log("4. Testando getFileFromStorage...");
  const downloadedXml = await getFileFromStorage(`invoices/${testTenantId}/${testChaveAcesso}.xml`);
  if (!downloadedXml || !downloadedXml.toString("utf-8").includes("<nfeProc>")) {
    throw new Error("Falha na integridade do arquivo baixado");
  }
  console.log("-> Integridade do arquivo baixado validada com sucesso!");

  // 5. Teste de Remoção
  console.log("5. Testando deleteFileFromStorage (limpeza)...");
  await deleteFileFromStorage(`invoices/${testTenantId}/${testChaveAcesso}.xml`);
  await deleteFileFromStorage(`invoices/${testTenantId}/${testChaveAcesso}.pdf`);
  await deleteFileFromStorage(`fechamentos/${testTenantId}/fechamento-09-2026.zip`);
  console.log("-> Arquivos de teste removidos.");

  console.log("=== TESTE DO SERVIÇO DE STORAGE CONCLUÍDO COM SUCESSO 100% ===");
}

main().catch((err) => {
  console.error("ERRO NO TESTE DE STORAGE:", err);
  process.exit(1);
});
