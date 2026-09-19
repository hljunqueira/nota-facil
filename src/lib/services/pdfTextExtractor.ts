import PDFParser from "pdf2json";

/**
 * Extrai texto bruto de um buffer de PDF de forma assíncrona usando pdf2json.
 * Não requer workers .mjs externos nem dependências DOM de navegador.
 */
export async function extractTextFromPdfBuffer(pdfBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const pdfParser = new (PDFParser as any)(null, 1);
      
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        const msg = typeof errData?.parserError === "string" 
          ? errData.parserError 
          : JSON.stringify(errData?.parserError || "Erro desconhecido ao processar PDF");
        reject(new Error(msg));
      });

      pdfParser.on("pdfParser_dataReady", () => {
        try {
          const text = pdfParser.getRawTextContent() || "";
          resolve(text);
        } catch (e: any) {
          reject(e);
        }
      });

      // Converte o Buffer do Node para Uint8Array dedicado (cópia isolada com offset 0)
      const uint8 = new Uint8Array(pdfBuffer);
      pdfParser.parseBuffer(uint8);
    } catch (err: any) {
      reject(new Error(`Falha ao ler arquivo PDF: ${err.message}`));
    }
  });
}
