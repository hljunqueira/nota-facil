import {
  Tenant,
  User,
  Partner,
  NotificationRecipient,
  CfopRule,
  Invoice,
  AuditLog,
  StatusCadastro,
  StatusConta,
  AmbienteFiscal,
  UserRole,
  TipoDestinatario,
  CanalNotificacao,
  TipoNota,
  StatusNota,
} from "@prisma/client";

export type {
  Tenant,
  User,
  Partner,
  NotificationRecipient,
  CfopRule,
  Invoice,
  AuditLog,
};

export {
  StatusCadastro,
  StatusConta,
  AmbienteFiscal,
  UserRole,
  TipoDestinatario,
  CanalNotificacao,
  TipoNota,
  StatusNota,
};

export interface SessionUser {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  tenantId?: string | null;
  tenantName?: string | null;
  ambiente?: AmbienteFiscal | null;
}

export interface FocusNfeItem {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  codigo_ncm: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_bruto: number;
  icms_situacao_tributaria?: string;
  icms_origem?: number;
}

export interface InversionCalculatedItem {
  codigoProduto: string;
  descricao: string;
  ncm: string;
  cfopOrigem: string;
  cfopDestino: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  tipoItem: "RETORNO_INSUMO" | "SERVICO_COSTURA";
}

export interface InversionPreviewResult {
  chaveEntrada: string;
  numeroEntrada: number;
  serieEntrada: number;
  parceiroOrigem: {
    razaoSocial: string;
    cnpj: string;
  };
  itens: InversionCalculatedItem[];
  totalInsumos: number;
  totalServico: number;
  totalNota: number;
}
