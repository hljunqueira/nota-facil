/**
 * Serviço de Mensageria WhatsApp via Evolution API v2
 * Documentação: https://doc.evolution-api.com
 */

function getEvolutionApiUrl(): string {
  const url = process.env.EVOLUTION_API_URL || "http://localhost:8081";
  return url.replace(/\/$/, "");
}

function getEvolutionApiKey(): string {
  return process.env.EVOLUTION_API_KEY || "NOTAFACIL_EVO_KEY_2026_SECURE";
}

const DEFAULT_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || "notafacil";

/**
 * Retorna o nome da instância isolada da oficina
 */
export function getTenantWhatsAppInstanceName(cnpjOrId: string): string {
  const clean = cnpjOrId.replace(/\D/g, "");
  return `oficina_${clean || cnpjOrId.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

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
  instanceName?: string;
  number: string;
  text: string;
}

export interface SendWhatsAppMediaOptions {
  instanceName?: string;
  number: string;
  mediaBase64OrUrl: string;
  fileName: string;
  caption?: string;
  mimeType?: string;
}

/**
 * Verifica o status de conexão da instância na Evolution API
 */
export async function checkWhatsAppInstanceStatus(instanceName?: string): Promise<{
  connected: boolean;
  state?: string;
}> {
  const instance = instanceName || DEFAULT_INSTANCE;
  const baseUrl = getEvolutionApiUrl();
  const apiKey = getEvolutionApiKey();

  try {
    const res = await fetch(
      `${baseUrl}/instance/connectionState/${instance}`,
      {
        method: "GET",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        return { connected: false, state: "NOT_FOUND" };
      }
      return { connected: false, state: "ERROR_HTTP" };
    }

    const data = await res.json();
    const state = data?.instance?.state || data?.state;
    return {
      connected: state === "open",
      state: state || "close",
    };
  } catch (err: any) {
    return { connected: false, state: "DISCONNECTED_OR_TIMEOUT" };
  }
}

/**
 * Cria ou obtém o QR Code para conectar a instância do WhatsApp da oficina
 */
export async function getOrCreateWhatsAppQrCode(instanceName: string): Promise<{
  success: boolean;
  base64?: string;
  code?: string;
  state?: string;
  error?: string;
}> {
  const baseUrl = getEvolutionApiUrl();
  const apiKey = getEvolutionApiKey();

  try {
    // 1. Checa se a instância já existe
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });

    if (stateRes.ok) {
      const stateData = await stateRes.json();
      const state = stateData?.instance?.state || stateData?.state;
      if (state === "open") {
        return { success: true, state: "open" };
      }

      // Se já existe e está fechada/conectando, solicita novo QR Code
      const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
        method: "GET",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });

      if (connectRes.ok) {
        const connectData = await connectRes.json();
        return {
          success: true,
          base64: connectData.base64,
          code: connectData.code,
          state: "connecting",
        };
      }
    }

    // 2. Se não existir, cria a instância com QR Code ativo
    const createRes = await fetch(`${baseUrl}/instance/create`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return { success: false, error: `Erro ao criar instância: ${errText}` };
    }

    const createData = await createRes.json();
    return {
      success: true,
      base64: createData?.qrcode?.base64 || createData?.base64,
      code: createData?.qrcode?.code || createData?.code,
      state: "connecting",
    };
  } catch (err: any) {
    console.error("[getOrCreateWhatsAppQrCode] Erro:", err);
    return { success: false, error: err.message || "Falha ao conectar com servidor WhatsApp." };
  }
}

/**
 * Desconecta e encerra a sessão da oficina na Evolution API
 */
export async function disconnectWhatsAppInstance(instanceName: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const baseUrl = getEvolutionApiUrl();
  const apiKey = getEvolutionApiKey();

  try {
    // Tenta logout e delete
    await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: { apikey: apiKey },
    }).catch(() => null);

    const delRes = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: { apikey: apiKey },
    });

    return { success: delRes.ok };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Envia mensagem de texto via WhatsApp (usando instância da oficina ou padrão)
 */
export async function sendWhatsAppMessage({
  instanceName,
  number,
  text,
}: SendWhatsAppTextOptions): Promise<{ success: boolean; error?: string }> {
  const instance = instanceName || DEFAULT_INSTANCE;
  const formattedNumber = formatWhatsAppNumber(number);
  const baseUrl = getEvolutionApiUrl();
  const apiKey = getEvolutionApiKey();

  try {
    const res = await fetch(
      `${baseUrl}/message/sendText/${instance}`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
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
 * Envia documento PDF, CSV ou anexo via WhatsApp (usando instância da oficina ou padrão)
 */
export async function sendWhatsAppDocument({
  instanceName,
  number,
  mediaBase64OrUrl,
  fileName,
  caption,
  mimeType = "application/pdf",
}: SendWhatsAppMediaOptions): Promise<{ success: boolean; error?: string }> {
  const instance = instanceName || DEFAULT_INSTANCE;
  const formattedNumber = formatWhatsAppNumber(number);
  const baseUrl = getEvolutionApiUrl();
  const apiKey = getEvolutionApiKey();

  try {
    const res = await fetch(
      `${baseUrl}/message/sendMedia/${instance}`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
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
