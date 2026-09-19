/**
 * Parser de Espelho de Produção / Cobrança de Industrialização Terceirizada (PDF)
 * Utilizado por confecções/facções para extrair automaticamente OPs, referências,
 * quantidades aprovadas e valores de serviço para emissão da NF-e de Cobrança (CFOP 5124).
 * 
 * Utiliza o extractor robusto baseado em pdf2json (100% Node.js puro sem dependência de workers externos).
 */

import { extractTextFromPdfBuffer } from "./pdfTextExtractor";

export interface EspelhoItem {
  op: string;
  referencia: string;
  faseServico: string;
  data: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface ParsedEspelho {
  numeroControle: string;
  dataEspelho: string;
  fabricaNome: string;
  prestadoraNome: string;
  prestadoraCodigo: string;
  itens: EspelhoItem[];
  valorTotalServico: number;
  previsaoPagamento?: string;
  observacoes?: string;
}

export async function parseEspelhoPdf(pdfBuffer: Buffer): Promise<ParsedEspelho> {
  const text = await extractTextFromPdfBuffer(pdfBuffer);

  // Número de controle / espelho (ex: Número :  40073)
  const numMatch = text.match(/N[úu]mero\s*:\s*(\d+)/i);
  const numeroControle = numMatch ? numMatch[1] : "";

  // Data do Espelho (ex: Data :   15/09/2026)
  const dataMatch = text.match(/Data\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
  const dataEspelho = dataMatch ? dataMatch[1] : "";

  // Fábrica / Empresa Emitente do Espelho
  let fabricaNome = "RITMI CONFECÇÕES LTDA";
  if (/RITMI/i.test(text)) {
    fabricaNome = "RITMI CONFECÇÕES LTDA";
  } else {
    const fabricaMatch = text.match(/([^\n\r]+?LTDA)/i);
    if (fabricaMatch) fabricaNome = fabricaMatch[1].trim();
  }

  // Prestadora / Oficina
  const prestadoraMatch = text.match(/Prestadora\s*:\s*(\d+)\s*-\s*([^\n\r]+?)(?:\s+Usu[áa]rio|$)/i);
  const prestadoraCodigo = prestadoraMatch ? prestadoraMatch[1].trim() : "";
  const prestadoraNome = prestadoraMatch ? prestadoraMatch[2].trim() : "";

  // Previsão de Pagamento / Vencimento
  let previsaoPagamento: string | undefined;
  const prevMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s*\r?\n\s*BANCO/i) || text.match(/OBSERVAÇÕES[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
  if (prevMatch) {
    previsaoPagamento = prevMatch[1];
  }

  // Itens do Espelho
  const itens: EspelhoItem[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    // Exemplo clássico extraído pelo pdf2json:
    // 31647   CSO272808 - VESTIDO MIDI MANGA CURTA COM DETALHE BABADOSCOSTURA I                21/08/2026           22           0           0           22             0           0             0           0           22    40,000000          880,00
    const itemMatch = line.match(/^(\d{4,6})\s+([\s\S]+?)(COSTURA[^\d]*?)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d\s]+)\s+([\d.,]+)\s+([\d.,]+)$/i) ||
                      line.match(/^(\d{4,6})\s+([A-Z0-9\-_]+(?:\s*-\s*[^\t\n]+?))\s+(COSTURA[^\t\n]*?)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d\s]+)\s+([\d.,]+)\s+([\d.,]+)$/i);
    
    if (itemMatch) {
      const op = itemMatch[1].trim();
      const referencia = itemMatch[2].trim();
      const faseServico = itemMatch[3].trim();
      const data = itemMatch[4].trim();

      const valUnitStr = itemMatch[6].replace(/\./g, "").replace(",", ".");
      const valTotStr = itemMatch[7].replace(/\./g, "").replace(",", ".");
      const valorUnitario = parseFloat(valUnitStr) || 0;
      const valorTotal = parseFloat(valTotStr) || 0;

      const nums = itemMatch[5].trim().split(/\s+/).map(Number);
      const quantidade = nums[nums.length - 1] || (valorUnitario > 0 ? Math.round(valorTotal / valorUnitario) : 1);

      itens.push({
        op,
        referencia,
        faseServico,
        data,
        quantidade,
        valorUnitario,
        valorTotal,
      });
    }
  }

  // Fallback se a linha de item foi quebrada ou formato alternativo
  if (itens.length === 0) {
    const genericMatch = text.match(/(\d{4,6})\s+(CS[A-Z0-9\-_]+[\s\S]*?COSTURA[^\d]*)\s*(\d{2}\/\d{2}\/\d{4})[\s\S]*?(\d+)\s+([\d.,]+)\s+([\d.,]+)\s*\r?\n\s*TOTAL/i);
    if (genericMatch) {
      const op = genericMatch[1].trim();
      const descCompleta = genericMatch[2].replace(/\s+/g, " ").trim();
      const data = genericMatch[3].trim();
      const quantidade = parseInt(genericMatch[4], 10);
      const valorUnitario = parseFloat(genericMatch[5].replace(/\./g, "").replace(",", ".")) || 0;
      const valorTotal = parseFloat(genericMatch[6].replace(/\./g, "").replace(",", ".")) || 0;

      itens.push({
        op,
        referencia: descCompleta,
        faseServico: "COSTURA",
        data,
        quantidade,
        valorUnitario,
        valorTotal,
      });
    }
  }

  const valorTotalServico = itens.reduce((acc, it) => acc + it.valorTotal, 0);

  return {
    numeroControle,
    dataEspelho,
    fabricaNome,
    prestadoraNome,
    prestadoraCodigo,
    itens,
    valorTotalServico,
    previsaoPagamento,
  };
}
