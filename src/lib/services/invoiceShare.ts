/**
 * Serviço de Formatação e Geração de Links Públicos de NF-e para WhatsApp e Compartilhamento
 */

export interface InvoiceShareData {
  id: string;
  numero: number;
  serie: number;
  chaveAcesso?: string | null;
  valorTotal: number | string;
  modalidadeEmissao?: string | null;
  finalidade?: string | null;
  partner?: {
    razaoSocial?: string | null;
    whatsappFinanceiro?: string | null;
    telefone?: string | null;
  } | null;
}

export interface FormatInvoiceShareOptions {
  invoice: InvoiceShareData;
  baseUrl?: string;
}

export interface FormatInvoiceShareResult {
  message: string;
  publicUrl: string;
  whatsappUrl: string;
  targetPhone?: string;
}

/**
 * Retorna a URL pública canônica para visualização e download da NF-e
 */
export function getPublicInvoiceUrl(invoiceIdOrKey: string, baseUrl?: string): string {
  const base = (baseUrl || process.env.APP_URL || "https://appnotafacil.online").replace(/\/$/, "");
  return `${base}/nfe/${encodeURIComponent(invoiceIdOrKey)}`;
}

/**
 * Normaliza e formata número de telefone para WhatsApp com DDI brasileiro (55)
 */
export function normalizeWhatsAppNumber(phoneRaw?: string | null): string | undefined {
  if (!phoneRaw) return undefined;
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length < 10) return undefined;

  // Se já tiver DDI 55 com 12 ou 13 dígitos
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // DDD + Número (10 ou 11 dígitos): adiciona DDI 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

/**
 * Gera mensagem profissional e link formatado para envio via WhatsApp
 */
export function formatInvoiceShareMessage({
  invoice,
  baseUrl,
}: FormatInvoiceShareOptions): FormatInvoiceShareResult {
  const publicUrl = getPublicInvoiceUrl(invoice.id, baseUrl);
  const partnerName = invoice.partner?.razaoSocial || "Destinatário";

  const formattedValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(invoice.valorTotal) || 0).replace(/\u00a0/g, " ");

  const chaveFormatada = invoice.chaveAcesso
    ? invoice.chaveAcesso
    : "Em processamento na SEFAZ";

  // Identifica a natureza resumida
  let tipoDesc = "NF-e";
  if (invoice.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO") {
    tipoDesc = "Cobrança (5124)";
  } else if (invoice.modalidadeEmissao === "RETORNO_MERCADORIA") {
    tipoDesc = "Retorno de Insumos (5902)";
  } else if (invoice.modalidadeEmissao === "CONJUNTA") {
    tipoDesc = "Retorno e Cobrança (Nota Única)";
  }

  const message =
    `*Nota Fácil — NF-e Nº ${invoice.numero} (Série ${invoice.serie})*\n` +
    `🏷️ *Operação:* ${tipoDesc}\n` +
    `📄 *Destinatário:* ${partnerName}\n` +
    `💰 *Valor Total:* ${formattedValue}\n` +
    `🔑 *Chave SEFAZ:* ${chaveFormatada}\n\n` +
    `📥 *Acesse e baixe o DANFE (PDF) e o XML pelo link público:*\n` +
    `${publicUrl}`;

  const targetPhone =
    normalizeWhatsAppNumber(invoice.partner?.whatsappFinanceiro) ||
    normalizeWhatsAppNumber(invoice.partner?.telefone);

  const encodedMsg = encodeURIComponent(message);
  const whatsappUrl = targetPhone
    ? `https://wa.me/${targetPhone}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;

  return {
    message,
    publicUrl,
    whatsappUrl,
    targetPhone,
  };
}
