import { isValidCNPJ } from "@/lib/validations";

export interface CnpjLookupResult {
  razaoSocial: string;
  nomeFantasia: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
}

export async function lookupCnpj(cnpjRaw: string): Promise<{
  success: boolean;
  data?: CnpjLookupResult;
  error?: string;
}> {
  const cleanCnpj = (cnpjRaw || "").replace(/\D/g, "");

  if (!isValidCNPJ(cleanCnpj)) {
    return { success: false, error: "CNPJ inválido (dígitos verificadores incorretos)." };
  }

  // 1. Tentar Focus NFe
  const focusToken =
    process.env.FOCUS_NFE_TOKEN_PRODUCAO ||
    process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO ||
    "z0YGKmkRLmkZLQtGC7YVw1k0TL8ZKaWi";

  const basicAuth = Buffer.from(`${focusToken}:`).toString("base64");

  try {
    const focusResponse = await fetch(`https://api.focusnfe.com.br/v2/cnpj/${cleanCnpj}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (focusResponse.ok) {
      const json = await focusResponse.json();
      return {
        success: true,
        data: {
          razaoSocial: json.razao_social || json.nome || "",
          nomeFantasia: json.nome_fantasia || "",
          logradouro: json.logradouro || "",
          numero: json.numero || "",
          bairro: json.bairro || "",
          municipio: json.municipio || "",
          uf: json.uf || "",
          cep: json.cep || "",
          telefone: json.telefone || "",
          email: json.email || "",
        },
      };
    }
  } catch (err) {
    // Focus falhou ou deu timeout, prossegue para fallback
  }

  // 2. Fallback: BrasilAPI
  try {
    const brasilApiResponse = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(6000),
      }
    );

    if (brasilApiResponse.ok) {
      const json = await brasilApiResponse.json();
      let tel = "";
      if (json.ddd_telefone_1) {
        tel = json.ddd_telefone_1.replace(/\D/g, "");
      }

      return {
        success: true,
        data: {
          razaoSocial: json.razao_social || "",
          nomeFantasia: json.nome_fantasia || "",
          logradouro: json.logradouro || "",
          numero: json.numero || "",
          bairro: json.bairro || "",
          municipio: json.municipio || "",
          uf: json.uf || "",
          cep: json.cep ? json.cep.replace(/\D/g, "") : "",
          telefone: tel,
          email: json.email || "",
        },
      };
    }
  } catch (err) {
    // BrasilAPI falhou
  }

  return {
    success: false,
    error: "Não foi possível consultar os dados da Receita Federal automaticamente. Preencha manualmente.",
  };
}
