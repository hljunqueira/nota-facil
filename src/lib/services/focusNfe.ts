/**
 * Serviço de Integração com a API Focus NFe v2.0
 * Documentação: https://doc.focusnfe.com.br/reference/introducao
 */

const FOCUS_HOMOLOGACAO_URL = "https://homologacao.focusnfe.com.br";
const FOCUS_PRODUCAO_URL = "https://api.focusnfe.com.br";

export function getFocusBaseUrl(ambiente: "HOMOLOGACAO" | "PRODUCAO" = "HOMOLOGACAO"): string {
  return ambiente === "PRODUCAO" ? FOCUS_PRODUCAO_URL : FOCUS_HOMOLOGACAO_URL;
}

export function getFocusMasterToken(ambiente: "HOMOLOGACAO" | "PRODUCAO" = "HOMOLOGACAO"): string {
  if (ambiente === "PRODUCAO") {
    return process.env.FOCUS_NFE_TOKEN_PRODUCAO || "HokM4RIK8PqGFyzkgiyShkgiT8gKxQze";
  }
  return process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO || "z0YGKmkRLmkZLQtGC7YVw1k0TL8ZKaWi";
}

function getBasicAuthHeader(token: string): string {
  return `Basic ${Buffer.from(`${token}:`).toString("base64")}`;
}

export interface FocusCreateCompanyInput {
  nome: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual: string;
  email: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

export interface FocusCompanyResponse {
  id: number;
  nome: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual: string;
  token_homologacao?: string;
  token_producao?: string;
  habilita_nfe?: boolean;
  habilita_manifestacao?: boolean;
  certificado_valido_ate?: string;
  validade_certificado?: string;
}

/**
 * Cadastra uma empresa na Focus NFe utilizando o Master Token
 */
export async function createCompanyInFocus(
  input: FocusCreateCompanyInput,
  ambiente: "HOMOLOGACAO" | "PRODUCAO" = "HOMOLOGACAO"
): Promise<{ success: boolean; data?: FocusCompanyResponse; error?: string }> {
  const masterToken = getFocusMasterToken(ambiente);
  const baseUrl = FOCUS_PRODUCAO_URL; // A gestão de empresas é centralizada na Focus NFe

  const payload = {
    nome: input.nome,
    nome_fantasia: input.nomeFantasia || input.nome,
    cnpj: input.cnpj.replace(/\D/g, ""),
    inscricao_estadual: input.inscricaoEstadual.trim().toUpperCase(),
    email: input.email,
    telefone: input.telefone ? input.telefone.replace(/\D/g, "") : undefined,
    logradouro: input.logradouro || "Rua Principal",
    numero: input.numero || "S/N",
    bairro: input.bairro || "Centro",
    municipio: input.municipio || "Cidade",
    uf: input.uf || "SC",
    cep: input.cep ? input.cep.replace(/\D/g, "") : "88000000",
    habilita_nfe: true,
    habilita_manifestacao: true,
  };

  try {
    const res = await fetch(`${baseUrl}/v2/empresas`, {
      method: "POST",
      headers: {
        Authorization: getBasicAuthHeader(masterToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: json.mensagem || json.erros || "Erro ao registrar empresa na Focus NFe",
      };
    }

    return { success: true, data: json };
  } catch (err: any) {
    console.error("[createCompanyInFocus] Erro:", err);
    return { success: false, error: err.message || "Falha de conexão com a Focus NFe" };
  }
}

/**
 * Upload seguro do Certificado Digital A1 (.pfx) diretamente na Focus NFe.
 * ZERO-STORAGE: O buffer recebido é transmitido via HTTPS e imediatamente descartado da memória.
 * NUNCA é salvo no banco de dados ou no disco.
 */
export async function uploadCertificateToFocus(
  focusCompanyId: number,
  certBuffer: Buffer,
  password: string,
  ambiente: "HOMOLOGACAO" | "PRODUCAO" = "HOMOLOGACAO"
): Promise<{ success: boolean; validoAte?: Date; error?: string }> {
  const masterToken = getFocusMasterToken(ambiente);
  const baseUrl = FOCUS_PRODUCAO_URL;

  // Converte buffer em base64 efêmero
  const certBase64 = certBuffer.toString("base64");

  const payload = {
    arquivo_certificado_base64: certBase64,
    senha_certificado: password,
  };

  try {
    const res = await fetch(`${baseUrl}/v2/empresas/${focusCompanyId}`, {
      method: "PUT",
      headers: {
        Authorization: getBasicAuthHeader(masterToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: json.mensagem || json.erros || "Certificado A1 ou senha inválidos na Focus NFe",
      };
    }

    // Identifica data de validade retornada pela Focus
    let validoAte: Date | undefined;
    const rawValidade = json.certificado_valido_ate || json.validade_certificado;
    if (rawValidade) {
      const parsed = new Date(rawValidade);
      if (!isNaN(parsed.getTime())) {
        validoAte = parsed;
      }
    }

    return { success: true, validoAte };
  } catch (err: any) {
    console.error("[uploadCertificateToFocus] Erro:", err);
    return { success: false, error: err.message || "Erro de conexão ao enviar certificado" };
  } finally {
    // Sanitização explícita do buffer em memória
    certBuffer.fill(0);
  }
}

/**
 * Registra os Webhooks na Focus NFe para a empresa
 */
export async function registerWebhooksInFocus(
  cnpj: string,
  ambiente: "HOMOLOGACAO" | "PRODUCAO" = "HOMOLOGACAO"
): Promise<{ success: boolean; error?: string }> {
  const masterToken = getFocusMasterToken(ambiente);
  const baseUrl = FOCUS_PRODUCAO_URL;
  const webhookUrl = `${process.env.NEXTAUTH_URL || "https://appnotafacil.online"}/api/webhooks/focus-nfe`;
  const cleanCnpj = cnpj.replace(/\D/g, "");

  const events = ["nfe", "nfe_recebida"];

  for (const event of events) {
    try {
      await fetch(`${baseUrl}/v2/hooks`, {
        method: "POST",
        headers: {
          Authorization: getBasicAuthHeader(masterToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cnpj: cleanCnpj,
          event,
          url: webhookUrl,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      console.warn(`[registerWebhooksInFocus] Alerta ao registrar hook ${event}:`, err);
    }
  }

  return { success: true };
}

/**
 * Baixa arquivos oficiais da Focus NFe (PDF DANFE ou XML SEFAZ)
 * Trata URLs relativas (ex: /v2/nfe/ref.pdf) e segue redirecionamentos HTTP 302
 */
export async function downloadFocusNfeDocument(
  pathOrUrl: string,
  token: string,
  ambiente: "HOMOLOGACAO" | "PRODUCAO" = "HOMOLOGACAO"
): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
  const baseUrl = getFocusBaseUrl(ambiente);
  const fullUrl = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

  try {
    const res = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: getBasicAuthHeader(token),
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      return { success: false, error: `Focus NFe HTTP ${res.status} ao baixar arquivo` };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { success: true, buffer };
  } catch (err: any) {
    console.error("[downloadFocusNfeDocument] Erro:", err);
    return { success: false, error: err.message || "Erro ao baixar arquivo da Focus NFe" };
  }
}

export interface FocusCancelResponse {
  status: "cancelado" | "processando_cancelamento" | "erro_cancelamento";
  status_sefaz?: string;
  mensagem_sefaz?: string;
  caminho_xml_cancelamento?: string;
}

/**
 * Solicita o cancelamento de uma NF-e na Focus NFe / SEFAZ via DELETE /v2/nfe/{ref}
 */
export async function cancelNfeInFocus({
  ref,
  justificativa,
  token,
  ambiente = "HOMOLOGACAO",
}: {
  ref: string;
  justificativa: string;
  token: string;
  ambiente?: "HOMOLOGACAO" | "PRODUCAO";
}): Promise<{ success: boolean; data?: FocusCancelResponse; error?: string }> {
  if (justificativa.length < 15) {
    return { success: false, error: "A justificativa de cancelamento deve ter no mínimo 15 caracteres conforme exigido pela SEFAZ." };
  }

  const baseUrl = getFocusBaseUrl(ambiente);
  const url = `${baseUrl}/v2/nfe/${ref}`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: getBasicAuthHeader(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ justificativa }),
      signal: AbortSignal.timeout(25000),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: json.mensagem || json.mensagem_sefaz || `Focus NFe retornou status HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      data: json,
    };
  } catch (err: any) {
    console.error("[cancelNfeInFocus] Erro:", err);
    return {
      success: false,
      error: err.message || "Falha de conexão com a Focus NFe para cancelamento.",
    };
  }
}

/**
 * Consulta manual de status completo de uma NF-e via GET /v2/nfe/{ref}?completa=1
 */
export async function getNfeStatusFromFocus({
  ref,
  token,
  ambiente = "HOMOLOGACAO",
}: {
  ref: string;
  token: string;
  ambiente?: "HOMOLOGACAO" | "PRODUCAO";
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const baseUrl = getFocusBaseUrl(ambiente);
  const url = `${baseUrl}/v2/nfe/${ref}?completa=1`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: getBasicAuthHeader(token),
      },
      signal: AbortSignal.timeout(20000),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: json.mensagem || `Focus NFe retornou status HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      data: json,
    };
  } catch (err: any) {
    console.error("[getNfeStatusFromFocus] Erro:", err);
    return {
      success: false,
      error: err.message || "Falha de conexão com a Focus NFe para consulta de status.",
    };
  }
}
