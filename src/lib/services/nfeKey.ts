/**
 * Utilitários Oficiais da SEFAZ para Validação e Extração de Chave de Acesso de NF-e
 */

// Lista oficial de códigos de UF do IBGE (2 dígitos)
export const CODIGOS_UF_IBGE = [
  11, 12, 13, 14, 15, 16, 17, // Norte
  21, 22, 23, 24, 25, 26, 27, 28, 29, // Nordeste
  31, 32, 33, 35, // Sudeste
  41, 42, 43, // Sul (42 = Santa Catarina)
  50, 51, 52, 53, // Centro-Oeste
];

/**
 * Calcula o Dígito Verificador (DV) de uma chave de NF-e usando o algoritmo Módulo 11 oficial da SEFAZ.
 * Entrada: base de 43 dígitos numéricos.
 * Retorno: dígito verificador entre 0 e 9.
 */
export function calculateNfeCheckDigit(base43: string): number {
  const clean = base43.replace(/\D/g, "");
  if (clean.length !== 43) {
    throw new Error(`A base para cálculo do DV da NF-e deve ter exatamente 43 dígitos (recebido: ${clean.length}).`);
  }

  let sum = 0;
  let weight = 2;

  for (let i = 42; i >= 0; i--) {
    sum += parseInt(clean[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }

  const remainder = sum % 11;
  return remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
}

/**
 * Valida se uma string é uma Chave de Acesso de NF-e válida (44 dígitos, UF válida, Modelo 55/65 e DV correto).
 */
export function isValidNfeKey(key: string): boolean {
  if (!key) return false;
  const clean = key.replace(/\D/g, "");
  if (clean.length !== 44) return false;

  // 1. Código da UF (primeiros 2 dígitos)
  const uf = parseInt(clean.substring(0, 2), 10);
  if (!CODIGOS_UF_IBGE.includes(uf)) return false;

  // 2. Modelo do Documento Fiscal (posições 20-21: 55 para NF-e ou 65 para NFC-e)
  const modelo = clean.substring(20, 22);
  if (modelo !== "55" && modelo !== "65") return false;

  // 3. Validação do Dígito Verificador (posição 43)
  const base43 = clean.substring(0, 43);
  const dv = parseInt(clean.substring(43, 44), 10);
  const calculatedDv = calculateNfeCheckDigit(base43);

  return calculatedDv === dv;
}

/**
 * Extrai a Chave de Acesso de NF-e legítima de 44 dígitos a partir de qualquer texto bruto de DANFE,
 * imune a dígitos colados por quebras de linha ou cabeçalhos (como o número '1' de '1 - SAÍDA').
 */
export function extractNfeKeyFromText(text: string): string | null {
  if (!text || typeof text !== "string") return null;

  // 1. Tenta encontrar chave formatada no padrão clássico de 4 em 4 dígitos
  // Ex: "4226 0972 3052 9500 0115 5500 1000 2385 9010 2312 2312"
  const formattedMatches = text.match(/(?:^|\D)((?:\d{4}[\s\-]+){10}\d{4})(?:$|\D)/g);
  if (formattedMatches) {
    for (const match of formattedMatches) {
      const cleanCandidate = match.replace(/\D/g, "");
      if (isValidNfeKey(cleanCandidate)) {
        return cleanCandidate;
      }
    }
  }

  // 2. Procura sequências contínuas de dígitos no texto com ou sem espaços
  // Remove espaços normais e quebras de linha
  const cleanDigitsOnly = text.replace(/[\s\t\r\n]+/g, "");

  // Varredura por blocos de dígitos longos (>= 44 dígitos)
  const longDigitBlocks = cleanDigitsOnly.match(/\d{44,60}/g) || [];
  for (const block of longDigitBlocks) {
    // Janela deslizante de 44 dígitos para encontrar a chave matematicamente válida
    for (let i = 0; i <= block.length - 44; i++) {
      const candidate = block.substring(i, i + 44);
      if (isValidNfeKey(candidate)) {
        return candidate;
      }
    }
  }

  // 3. Fallback inteligente: se nenhuma passou no módulo 11 (ex: homologação / teste da SEFAZ),
  // seleciona a chave que começa com UF válida e modelo 55/65
  for (const block of longDigitBlocks) {
    for (let i = 0; i <= block.length - 44; i++) {
      const candidate = block.substring(i, i + 44);
      const uf = parseInt(candidate.substring(0, 2), 10);
      const modelo = candidate.substring(20, 22);
      if (CODIGOS_UF_IBGE.includes(uf) && (modelo === "55" || modelo === "65")) {
        return candidate;
      }
    }
  }

  // 4. Último recurso: primeiro bloco de 44 dígitos
  const fallbackMatch = cleanDigitsOnly.match(/\d{44}/);
  return fallbackMatch ? fallbackMatch[0] : null;
}
