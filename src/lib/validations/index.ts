import { z } from "zod";

/**
 * Validador oficial de CNPJ com cálculo de dígitos verificadores (Módulo 11)
 */
export function isValidCNPJ(cnpjRaw: string): boolean {
  if (!cnpjRaw) return false;
  const cnpj = cnpjRaw.replace(/\D/g, "");

  if (cnpj.length !== 14) return false;

  // Rejeita sequências repetidas conhecidas (ex: 00000000000000, 11111111111111)
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Cálculo do 1º dígito verificador
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0), 10)) return false;

  // Cálculo do 2º dígito verificador
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1), 10);
}

/**
 * Validador básico de Inscrição Estadual (limpeza de pontuação e verificação de formato)
 */
export function isValidIE(ieRaw: string): boolean {
  if (!ieRaw) return false;
  const ie = ieRaw.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  // Permite ISENTO ou IE com 8 a 14 dígitos/caracteres
  if (ie === "ISENTO") return true;
  return ie.length >= 8 && ie.length <= 14;
}

// -------------------------------------------------------------
// SCHEMAS ZOD
// -------------------------------------------------------------

export const publicRegisterSchema = z.object({
  razaoSocial: z
    .string()
    .min(3, "Razão Social deve ter no mínimo 3 caracteres")
    .max(120, "Razão Social muito longa"),
  nomeFantasia: z.string().max(80).optional(),
  cnpj: z
    .string()
    .min(14, "CNPJ inválido")
    .refine((val) => isValidCNPJ(val), {
      message: "CNPJ inválido (dígito verificador incorreto)",
    }),
  inscricaoEstadual: z
    .string()
    .min(2, "Inscrição Estadual obrigatória")
    .refine((val) => isValidIE(val), {
      message: "Inscrição Estadual com formato inválido",
    }),
  responsavelNome: z
    .string()
    .min(3, "Nome do responsável deve ter no mínimo 3 caracteres"),
  telefoneContato: z
    .string()
    .min(10, "Telefone deve conter DDD e número completo")
    .max(16, "Formato de telefone inválido"),
  emailPrincipal: z.string().email("E-mail de contato inválido"),
  senha: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
});

export type PublicRegisterInput = z.infer<typeof publicRegisterSchema>;

export const loginSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail ou usuário"),
  senha: z.string().min(1, "Informe a senha"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const partnerSchema = z.object({
  razaoSocial: z.string().min(3, "Razão Social obrigatória"),
  nomeFantasia: z.string().optional(),
  cnpj: z
    .string()
    .min(14, "CNPJ obrigatório")
    .refine((val) => isValidCNPJ(val), {
      message: "CNPJ do parceiro inválido",
    }),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
});

export type PartnerInput = z.infer<typeof partnerSchema>;

export const notificationRecipientSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  tipo: z.enum(["CONTADOR", "PARCEIRO", "INTERNO_ALERTA"]),
  canal: z.enum(["EMAIL", "WHATSAPP"]),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  partnerId: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});

export type NotificationRecipientInput = z.infer<typeof notificationRecipientSchema>;

export const cfopRuleSchema = z.object({
  cfopEntrada: z
    .string()
    .regex(/^\d{4}$/, "CFOP de entrada deve ter 4 dígitos numéricos (ex: 5901)"),
  cfopSaidaCorrespondente: z
    .string()
    .regex(/^\d{4}$/, "CFOP de saída correspondente deve ter 4 dígitos (ex: 5902)"),
  finalidadeGerada: z.string().min(3, "Finalidade descritiva obrigatória"),
  ativo: z.boolean().default(true),
});

export type CfopRuleInput = z.infer<typeof cfopRuleSchema>;

export const inversionPreviewSchema = z.object({
  chaveAcessoEntrada: z.string().length(44, "Chave de acesso deve ter 44 dígitos"),
  cobrarServicoCostura: z.boolean().default(false),
  valorServicoPorPeca: z.number().nonnegative().optional(),
  observacoesFiscais: z.string().max(500).optional(),
});

export type InversionPreviewInput = z.infer<typeof inversionPreviewSchema>;
