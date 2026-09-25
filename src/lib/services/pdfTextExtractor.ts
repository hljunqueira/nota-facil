import PDFParser from "pdf2json";

/**
 * Extrai texto do buffer do PDF de forma assíncrona usando pdf2json,
 * ordenando os blocos geometricamente por Y (vertical) e X (horizontal) por página.
 * Isso garante que tabelas, itens e textos multilinhas mantenham a sequência física original.
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

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          const pageStrings: string[] = [];

          if (pdfData && Array.isArray(pdfData.Pages)) {
            for (const page of pdfData.Pages) {
              const texts: Array<{ x: number; y: number; text: string }> = [];
              if (Array.isArray(page.Texts)) {
                for (const t of page.Texts) {
                  const rawT = t.R && t.R[0] && t.R[0].T ? t.R[0].T : "";
                  try {
                    texts.push({ x: t.x || 0, y: t.y || 0, text: decodeURIComponent(rawT) });
                  } catch {
                    texts.push({ x: t.x || 0, y: t.y || 0, text: rawT });
                  }
                }
              }

              // Ordena verticalmente por Y, e no mesmo patamar de linha (Δy < 0.28), horizontalmente por X
              texts.sort((a, b) => {
                if (Math.abs(a.y - b.y) < 0.28) {
                  return a.x - b.x;
                }
                return a.y - b.y;
              });

              // Agrupa em linhas horizontais
              const lines: string[] = [];
              let currentLine: string[] = [];
              let currentY = -999;

              for (const item of texts) {
                if (Math.abs(item.y - currentY) >= 0.28) {
                  if (currentLine.length > 0) {
                    lines.push(currentLine.join(" ").trim());
                  }
                  currentLine = [item.text];
                  currentY = item.y;
                } else {
                  currentLine.push(item.text);
                }
              }
              if (currentLine.length > 0) {
                lines.push(currentLine.join(" ").trim());
              }

              pageStrings.push(lines.join("\n"));
            }
          }

          resolve(pageStrings.join("\n\n----------------Page Break----------------\n\n"));
        } catch (e: any) {
          reject(e);
        }
      });

      const uint8 = new Uint8Array(pdfBuffer);
      pdfParser.parseBuffer(uint8);
    } catch (err: any) {
      reject(new Error(`Falha ao ler arquivo PDF: ${err.message}`));
    }
  });
}

