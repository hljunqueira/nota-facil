"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";
import {
  notificationRecipientSchema,
  NotificationRecipientInput,
  cfopRuleSchema,
  CfopRuleInput,
} from "@/lib/validations";
import { StatusConta } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { testFocusTokenConnection } from "@/lib/services/focusNfe";

async function requireTenantSession() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.tenantId) {
    throw new Error("Sessão expirada ou acesso restrito a usuários de oficina.");
  }
  const tenantId = session.user.tenantId;
  const tenantPrisma = createTenantPrisma(tenantId);
  return { session, tenantId, tenantPrisma };
}

/**
 * Retorna todos os dados de configuração da oficina logada
 */
export async function getTenantConfigAction() {
  const { tenantId, tenantPrisma } = await requireTenantSession();

  const [tenant, recipients, cfopRules] = await Promise.all([
    prismaAdmin.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpj: true,
        inscricaoEstadual: true,
        emailPrincipal: true,
        telefoneContato: true,
        statusCadastro: true,
        statusConta: true,
        ambiente: true,
        certificadoValidoAte: true,
        serieNfe: true,
        proximoNumero: true,
        focusNfeIdEmpresa: true,
        focusNfeTokenHomologacao: true,
        focusNfeTokenProducao: true,
      },
    }),
    tenantPrisma.notificationRecipient.findMany({
      orderBy: { createdAt: "desc" },
    }),
    tenantPrisma.cfopRule.findMany({
      orderBy: { cfopEntrada: "asc" },
    }),
  ]);

  return {
    tenant,
    recipients,
    cfopRules,
  };
}

/**
 * Salva ou atualiza um destinatário de notificação (Contador, Parceiro ou Alerta)
 */
export async function saveNotificationRecipientAction(
  data: NotificationRecipientInput & { id?: string }
) {
  const { tenantId, tenantPrisma } = await requireTenantSession();

  const validation = notificationRecipientSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message };
  }

  const { nome, tipo, canal, email, telefone, partnerId, ativo } = validation.data;

  try {
    if (data.id) {
      await tenantPrisma.notificationRecipient.update({
        where: { id: data.id },
        data: {
          nome: nome.trim(),
          tipo,
          canal,
          email: email?.trim().toLowerCase() || null,
          telefone: telefone?.trim() || null,
          partnerId: partnerId || null,
          ativo,
        },
      });
    } else {
      await tenantPrisma.notificationRecipient.create({
        data: {
          tenantId,
          nome: nome.trim(),
          tipo,
          canal,
          email: email?.trim().toLowerCase() || null,
          telefone: telefone?.trim() || null,
          partnerId: partnerId || null,
          ativo: ativo ?? true,
        },
      });
    }

    revalidatePath("/configuracoes");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (err: any) {
    console.error("[saveNotificationRecipientAction] Erro:", err);
    return { success: false, error: "Erro ao salvar destinatário." };
  }
}

/**
 * Deleta um destinatário de notificação
 */
export async function deleteNotificationRecipientAction(id: string) {
  const { tenantPrisma } = await requireTenantSession();

  try {
    await tenantPrisma.notificationRecipient.delete({
      where: { id },
    });
    revalidatePath("/configuracoes");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Erro ao excluir destinatário." };
  }
}

/**
 * Salva ou atualiza uma regra de conversão de CFOP
 */
export async function saveCfopRuleAction(data: CfopRuleInput & { id?: string }) {
  const { tenantId, tenantPrisma } = await requireTenantSession();

  const validation = cfopRuleSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message };
  }

  const { cfopEntrada, cfopSaidaCorrespondente, finalidadeGerada, ativo } =
    validation.data;

  try {
    await prismaAdmin.cfopRule.upsert({
      where: {
        tenantId_cfopEntrada: {
          tenantId,
          cfopEntrada: cfopEntrada.trim(),
        },
      },
      create: {
        tenantId,
        cfopEntrada: cfopEntrada.trim(),
        cfopSaidaCorrespondente: cfopSaidaCorrespondente.trim(),
        finalidadeGerada: finalidadeGerada.trim(),
        ativo,
      },
      update: {
        cfopSaidaCorrespondente: cfopSaidaCorrespondente.trim(),
        finalidadeGerada: finalidadeGerada.trim(),
        ativo,
      },
    });

    revalidatePath("/configuracoes");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (err: any) {
    console.error("[saveCfopRuleAction] Erro:", err);
    return { success: false, error: "Erro ao salvar regra de CFOP." };
  }
}

/**
 * Aplica automaticamente os presets industriais clássicos de confecção
 */
export async function applyDefaultCfopRulesAction() {
  const { tenantId } = await requireTenantSession();

  const presets = [
    {
      cfopEntrada: "5901",
      cfopSaidaCorrespondente: "5902",
      finalidadeGerada: "Retorno de mercadoria recebida para industrialização",
    },
    {
      cfopEntrada: "6901",
      cfopSaidaCorrespondente: "6902",
      finalidadeGerada: "Retorno de mercadoria recebida para industrialização (Interestadual)",
    },
  ];

  try {
    for (const p of presets) {
      await prismaAdmin.cfopRule.upsert({
        where: {
          tenantId_cfopEntrada: {
            tenantId,
            cfopEntrada: p.cfopEntrada,
          },
        },
        create: {
          tenantId,
          cfopEntrada: p.cfopEntrada,
          cfopSaidaCorrespondente: p.cfopSaidaCorrespondente,
          finalidadeGerada: p.finalidadeGerada,
          ativo: true,
        },
        update: {},
      });
    }

    revalidatePath("/configuracoes");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (err: any) {
    console.error("[applyDefaultCfopRulesAction] Erro:", err);
    return { success: false, error: "Erro ao aplicar regras padrão." };
  }
}

/**
 * Remove uma regra de CFOP
 */
export async function deleteCfopRuleAction(id: string) {
  const { tenantPrisma } = await requireTenantSession();

  try {
    await tenantPrisma.cfopRule.delete({
      where: { id },
    });
    revalidatePath("/configuracoes");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Erro ao excluir regra de CFOP." };
  }
}

/**
 * Atualiza numeração e série fiscal da empresa
 */
export async function updateInvoiceSequenceAction(data: {
  serieNfe: number;
  proximoNumero: number;
}) {
  const { tenantId } = await requireTenantSession();

  if (data.serieNfe < 1 || data.proximoNumero < 1) {
    return { success: false, error: "Série e número devem ser maiores ou iguais a 1." };
  }

  try {
    await prismaAdmin.tenant.update({
      where: { id: tenantId },
      data: {
        serieNfe: data.serieNfe,
        proximoNumero: data.proximoNumero,
      },
    });

    revalidatePath("/configuracoes");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Erro ao atualizar numeração da NF-e." };
  }
}

/**
 * Conclui o onboarding do cliente e ativa a conta
 */
export async function completeOnboardingAction() {
  const { tenantId } = await requireTenantSession();

  try {
    await prismaAdmin.tenant.update({
      where: { id: tenantId },
      data: {
        statusConta: StatusConta.ATIVO,
      },
    });

    revalidatePath("/configuracoes");
    revalidatePath("/onboarding");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Erro ao concluir onboarding." };
  }
}

/**
 * Atualiza os tokens fiscais da Focus NFe e ambiente da oficina
 */
export async function updateTenantFiscalTokensAction(data: {
  focusNfeTokenHomologacao?: string | null;
  focusNfeTokenProducao?: string | null;
  focusNfeIdEmpresa?: number | null;
  ambiente?: "HOMOLOGACAO" | "PRODUCAO";
}) {
  const { tenantId, session } = await requireTenantSession();

  try {
    const updateData: any = {};
    if (data.focusNfeTokenHomologacao !== undefined) {
      updateData.focusNfeTokenHomologacao = data.focusNfeTokenHomologacao?.trim() || null;
    }
    if (data.focusNfeTokenProducao !== undefined) {
      updateData.focusNfeTokenProducao = data.focusNfeTokenProducao?.trim() || null;
    }
    if (data.focusNfeIdEmpresa !== undefined) {
      updateData.focusNfeIdEmpresa = data.focusNfeIdEmpresa ? Number(data.focusNfeIdEmpresa) : null;
    }
    if (data.ambiente) {
      updateData.ambiente = data.ambiente;
    }

    await prismaAdmin.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorType: "USER",
          actorId: session.user.id,
          acao: "ATUALIZACAO_TOKENS_FISCAIS",
          entidade: "Tenant",
          entidadeId: tenantId,
          detalhe: {
            ambiente: data.ambiente,
            hasHomologacaoToken: !!updateData.focusNfeTokenHomologacao,
            hasProducaoToken: !!updateData.focusNfeTokenProducao,
            focusNfeIdEmpresa: updateData.focusNfeIdEmpresa,
          },
        },
      });
    });

    revalidatePath("/configuracoes");
    revalidatePath("/dashboard");
    revalidatePath("/notas");
    return { success: true };
  } catch (err: any) {
    console.error("[updateTenantFiscalTokensAction] Erro:", err);
    return { success: false, error: err.message || "Erro ao salvar credenciais fiscais." };
  }
}

/**
 * Executa teste de conexão em tempo real com a Focus NFe
 */
export async function testTenantFocusConnectionAction(data: {
  token: string;
  ambiente: "HOMOLOGACAO" | "PRODUCAO";
}) {
  await requireTenantSession();
  return await testFocusTokenConnection(data);
}

/**
 * Atualiza os dados cadastrais da oficina (Razão Social, Nome Fantasia, Telefone, Email, IE)
 */
export async function updateTenantCompanyDataAction(data: {
  razaoSocial: string;
  nomeFantasia?: string | null;
  telefoneContato: string;
  emailPrincipal: string;
  inscricaoEstadual: string;
}) {
  const { tenantId, session } = await requireTenantSession();

  if (!data.razaoSocial?.trim()) {
    return { success: false, error: "Razão Social é obrigatória." };
  }
  if (!data.emailPrincipal?.trim() || !data.emailPrincipal.includes("@")) {
    return { success: false, error: "E-mail principal inválido." };
  }
  if (!data.telefoneContato?.trim()) {
    return { success: false, error: "Telefone de contato é obrigatório." };
  }

  try {
    const updated = await prismaAdmin.tenant.update({
      where: { id: tenantId },
      data: {
        razaoSocial: data.razaoSocial.trim(),
        nomeFantasia: data.nomeFantasia?.trim() || null,
        telefoneContato: data.telefoneContato.trim(),
        emailPrincipal: data.emailPrincipal.trim().toLowerCase(),
        inscricaoEstadual: data.inscricaoEstadual?.trim() || "ISENTO",
      },
    });

    try {
      await prismaAdmin.auditLog.create({
        data: {
          tenantId,
          actorType: "USER",
          actorId: session.user.id || "USER",
          acao: "ATUALIZACAO_DADOS_EMPRESA",
          entidade: "Tenant",
          entidadeId: tenantId,
          detalhe: {
            razaoSocial: updated.razaoSocial,
            nomeFantasia: updated.nomeFantasia,
            telefoneContato: updated.telefoneContato,
            emailPrincipal: updated.emailPrincipal,
            inscricaoEstadual: updated.inscricaoEstadual,
          },
        },
      });
    } catch {
      // silencia log em caso de indisponibilidade
    }

    revalidatePath("/configuracoes");
    revalidatePath("/dashboard");
    return { success: true, tenant: updated };
  } catch (err: any) {
    console.error("[updateTenantCompanyDataAction] Erro:", err);
    return { success: false, error: err.message || "Erro ao atualizar dados cadastrais da empresa." };
  }
}
