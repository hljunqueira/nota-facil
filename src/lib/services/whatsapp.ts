/**
 * Serviço de Mensageria WhatsApp via Evolution API v2
 * Documentação: https://doc.evolution-api.com
 */

const EVOLUTION_API_URL = (
  process.env.EVOLUTION_API_URL || "http://localhost:8081"
).replace(/\/$/, "");

const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY || "NOTAFACIL_EVO_KEY_2026_SECURE";

const EVOLUTION_INSTANCE =
  process.env.EVOLUTION_INSTANCE_NAME || "notafacil";

/**
 * Formata número de telefone para o padrão DDI 55 + DDD + Número (apenas dígitos)
 */
export function formatWhatsAppNumber(phoneRaw: string): string {
  let cleaned = phoneRaw.replace(/\D/g, "");
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = `55${cleaned}`;
  }
  return cleaned;
}

export interface SendWhatsAppTextOptions {
  number: string;
  text: string;
}

export interface SendWhatsAppMediaOptions {
  number: string;
  mediaBase64OrUrl: string;
  fileName: string;
  caption?: string;
  mimeType?: string;
}

/**
 * Verifica o status de conexão da instância da Evolution API
 */
export async function checkWhatsAppInstanceStatus(): Promise<{
  connected: boolean;
  state?: string;
}> {
  try {
    const res = await fetch(
      `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`,
      {
        method: "GET",
        headers: {
          apikey: EVOLUTION_API_KEY,
        },
        signal: AbortSignal.timeout(4000),
      }
    );

    if (!res.ok) {
      return { connected: false, state: "ERROR_HTTP" };
    }

    const data = await res.json();
    const state = data?.instance?.state || data?.state;
    return {
      connected: state === "open",
      state,
    };
  } catch (err: any) {
    return { connected: false, state: "DISCONNECTED_OR_TIMEOUT" };
  }
}

/**
 * Envia mensagem de texto via WhatsApp
 */
export async function sendWhatsAppMessage({
  number,
  text,
}: SendWhatsAppTextOptions): Promise<{ success: boolean; error?: string }> {
  const formattedNumber = formatWhatsAppNumber(number);

  try {
    const res = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: formattedNumber,
          text,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Evolution API HTTP ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[sendWhatsAppMessage] Falha:", err);
    return { success: false, error: err.message || "Timeout ou falha de conexão com Evolution API" };
  }
}

/**
 * Envia documento PDF ou anexo via WhatsApp
 */
export async function sendWhatsAppDocument({
  number,
  mediaBase64OrUrl,
  fileName,
  caption,
  mimeType = "application/pdf",
}: SendWhatsAppMediaOptions): Promise<{ success: boolean; error?: string }> {
  const formattedNumber = formatWhatsAppNumber(number);

  try {
    const res = await fetch(
      `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: formattedNumber,
          mediatype: "document",
          mimetype: mimeType,
          caption: caption || fileName,
          media: mediaBase64OrUrl,
          fileName,
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Evolution API HTTP ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[sendWhatsAppDocument] Falha:", err);
    return { success: false, error: err.message || "Falha de conexão com Evolution API" };
  }
}
