"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaAdmin } from "@/lib/prismaAdmin";
import {
  createCompanyInFocus,
  uploadCertificateToFocus,
  registerWebhooksInFocus,
} from "@/lib/services/focusNfe";
import { StatusCadastro, StatusConta, AmbienteFiscal } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Acesso não autorizado. É necessário privilégio de Administrador Master.");
  }
  return session;
}

/**
 * Retorna estatísticas gerais para o painel /admin
 */
export async function getAdminOverviewStatsAction() {
  await requireAdminSession();

  const [totalTenants, pendentes, aprovados, rejeitados, totalNotas] =
    await Promise.all([
      prismaAdmin.tenant.count(),
      prismaAdmin.tenant.count({ where: { statusCadastro: StatusCadastro.PENDENTE_ANALISE } }),
      prismaAdmin.tenant.count({ where: { statusCadastro: StatusCadastro.APROVADO } }),
      prismaAdmin.tenant.count({ where: { statusCadastro: StatusCadastro.REJEITADO } }),
      prismaAdmin.invoice.count(),
    ]);

  return {
    totalTenants,
    pendentes,
    aprovados,
    rejeitados,
    totalNotas,
  };
}

/**
 * Retorna a fila de cadastros pendentes de análise
 */
export async function getPendingTenantsAction() {
  await requireAdminSession();

  const pendentes = await prismaAdmin.tenant.findMany({
    where: { statusCadastro: StatusCadastro.PENDENTE_ANALISE },
    orderBy: { createdAt: "desc" },
    include: {
      users: { select: { id: true, nome: true, email: true } },
    },
  });

  return pendentes;
}

/**
 * Retorna todas as empresas cadastradas com busca e filtros
 */
export async function getAllTenantsAction(search?: string, statusCadastro?: string) {
  await requireAdminSession();

  const where: any = {};

  if (statusCadastro && statusCadastro !== "ALL") {
    where.statusCadastro = statusCadastro as StatusCadastro;
  }

  if (search && search.trim() !== "") {
    const q = search.trim();
    where.OR = [
      { razaoSocial: { contains: q, mode: "insensitive" } },
      { nomeFantasia: { contains: q, mode: "insensitive" } },
      { cnpj: { contains: q.replace(/\D/g, "") } },
      { emailPrincipal: { contains: q, mode: "insensitive" } },
    ];
  }

  const tenants = await prismaAdmin.tenant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      users: { select: { id: true, nome: true, email: true } },
      _count: { select: { invoices: true, partners: true } },
    },
  });

  return tenants;
}

/**
 * Aprova o cadastro de uma oficina
 */
export async function approveTenantAction(tenantId: string) {
  const session = await requireAdminSession();

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { success: false, error: "Oficina não encontrada" };
  }

  await prismaAdmin.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        statusCadastro: StatusCadastro.APROVADO,
        motivoRejeicao: null,
      },
    });

    // Auto-criação das regras padrão de CFOP (5901 -> 5902 / 6901 -> 6902)
    await tx.cfopRule.upsert({
      where: {
        tenantId_cfopEntrada: {
          tenantId,
          cfopEntrada: "5901",
        },
      },
      update: {
        cfopSaidaCorrespondente: "5902",
        finalidadeGerada: "Retorno de mercadoria recebida para industrialização",
        ativo: true,
      },
      create: {
        tenantId,
        cfopEntrada: "5901",
        cfopSaidaCorrespondente: "5902",
        finalidadeGerada: "Retorno de mercadoria recebida para industrialização",
        ativo: true,
      },
    });

    await tx.cfopRule.upsert({
      where: {
        tenantId_cfopEntrada: {
          tenantId,
          cfopEntrada: "6901",
        },
      },
      update: {
        cfopSaidaCorrespondente: "6902",
        finalidadeGerada: "Retorno de mercadoria recebida para industrialização (Interestadual)",
        ativo: true,
      },
      create: {
        tenantId,
        cfopEntrada: "6901",
        cfopSaidaCorrespondente: "6902",
        finalidadeGerada: "Retorno de mercadoria recebida para industrialização (Interestadual)",
        ativo: true,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "ADMIN",
        actorId: session.user.id,
        acao: "APROVACAO_CADASTRO",
        entidade: "Tenant",
        entidadeId: tenantId,
        detalhe: {
          adminEmail: session.user.email,
          statusAnterior: tenant.statusCadastro,
          novoStatus: "APROVADO",
        },
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/aprovacoes");
  revalidatePath("/admin/tenants");

  return { success: true };
}

/**
 * Rejeita o cadastro de uma oficina com justificativa
 */
export async function rejectTenantAction(tenantId: string, motivo: string) {
  const session = await requireAdminSession();

  if (!motivo || motivo.trim().length < 5) {
    return { success: false, error: "Informe uma justificativa clara para a rejeição (mínimo 5 caracteres)." };
  }

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { success: false, error: "Oficina não encontrada" };
  }

  await prismaAdmin.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        statusCadastro: StatusCadastro.REJEITADO,
        motivoRejeicao: motivo.trim(),
        statusConta: StatusConta.SUSPENSO_ADMIN,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "ADMIN",
        actorId: session.user.id,
        acao: "REJEICAO_CADASTRO",
        entidade: "Tenant",
        entidadeId: tenantId,
        detalhe: {
          adminEmail: session.user.email,
          motivo: motivo.trim(),
        },
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/aprovacoes");
  revalidatePath("/admin/tenants");

  return { success: true };
}

/**
 * Registra a empresa na Focus NFe usando o Master Token
 */
export async function registerFocusCompanyAction(tenantId: string, addressOverride?: any) {
  const session = await requireAdminSession();

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { success: false, error: "Oficina não encontrada" };
  }

  const focusResult = await createCompanyInFocus(
    {
      nome: tenant.razaoSocial,
      nomeFantasia: tenant.nomeFantasia || tenant.razaoSocial,
      cnpj: tenant.cnpj,
      inscricaoEstadual: tenant.inscricaoEstadual,
      email: tenant.emailPrincipal,
      telefone: tenant.telefoneContato,
      logradouro: addressOverride?.logradouro,
      numero: addressOverride?.numero,
      bairro: addressOverride?.bairro,
      municipio: addressOverride?.municipio,
      uf: addressOverride?.uf,
      cep: addressOverride?.cep,
    },
    tenant.ambiente
  );

  if (!focusResult.success || !focusResult.data) {
    return {
      success: false,
      error: focusResult.error || "Não foi possível registrar a empresa na Focus NFe",
    };
  }

  // Atualiza no banco os tokens retornados pela Focus
  await prismaAdmin.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        focusNfeIdEmpresa: focusResult.data!.id,
        focusNfeTokenHomologacao: focusResult.data!.token_homologacao || null,
        focusNfeTokenProducao: focusResult.data!.token_producao || null,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "ADMIN",
        actorId: session.user.id,
        acao: "FOCUS_NFE_EMPRESA_REGISTRADA",
        entidade: "Tenant",
        entidadeId: tenantId,
        detalhe: {
          focusNfeId: focusResult.data!.id,
          habilitaNfe: focusResult.data!.habilita_nfe,
          habilitaManifestacao: focusResult.data!.habilita_manifestacao,
        },
      },
    });
  });

  // Registra os Webhooks na Focus NFe em background
  await registerWebhooksInFocus(tenant.cnpj, tenant.ambiente);

  revalidatePath("/admin/aprovacoes");
  revalidatePath("/admin/tenants");

  return {
    success: true,
    focusCompanyId: focusResult.data.id,
  };
}

/**
 * Upload seguro do certificado A1 (.pfx) com senha diretamente para a Focus NFe
 * ZERO-STORAGE: Nunca é persistido em disco ou banco.
 */
export async function uploadCertificateAction(formData: FormData) {
  const session = await requireAdminSession();

  const tenantId = formData.get("tenantId") as string;
  const password = formData.get("password") as string;
  const certFile = formData.get("certificate") as File | null;

  if (!tenantId || !password || !certFile) {
    return { success: false, error: "Arquivo de certificado (.pfx) e senha são obrigatórios." };
  }

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { success: false, error: "Oficina não encontrada" };
  }

  if (!tenant.focusNfeIdEmpresa) {
    return {
      success: false,
      error: "Esta oficina ainda não foi registrada na Focus NFe. Registre-a primeiro.",
    };
  }

  // Lê os bytes do arquivo em buffer efêmero
  const arrayBuffer = await certFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadResult = await uploadCertificateToFocus(
    tenant.focusNfeIdEmpresa,
    buffer,
    password,
    tenant.ambiente
  );

  if (!uploadResult.success) {
    return {
      success: false,
      error: uploadResult.error || "Falha ao validar ou enviar certificado para a Focus NFe",
    };
  }

  // Atualiza a validade do certificado e ativa a conta da oficina
  await prismaAdmin.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        certificadoValidoAte: uploadResult.validoAte || null,
        statusConta: StatusConta.ATIVO,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "ADMIN",
        actorId: session.user.id,
        acao: "CERTIFICADO_A1_CONFIGURADO",
        entidade: "Tenant",
        entidadeId: tenantId,
        detalhe: {
          validoAte: uploadResult.validoAte?.toISOString(),
          statusContaAnterior: tenant.statusConta,
          novoStatusConta: "ATIVO",
        },
      },
    });
  });

  revalidatePath("/admin/aprovacoes");
  revalidatePath("/admin/tenants");

  return {
    success: true,
    validoAte: uploadResult.validoAte?.toISOString(),
  };
}

/**
 * Altera o ambiente fiscal do tenant (HOMOLOGACAO <-> PRODUCAO)
 */
export async function toggleFiscalEnvironmentAction(
  tenantId: string,
  novoAmbiente: "HOMOLOGACAO" | "PRODUCAO"
) {
  const session = await requireAdminSession();

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { success: false, error: "Oficina não encontrada" };
  }

  await prismaAdmin.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { ambiente: novoAmbiente as AmbienteFiscal },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "ADMIN",
        actorId: session.user.id,
        acao: "ALTERACAO_AMBIENTE_FISCAL",
        entidade: "Tenant",
        entidadeId: tenantId,
        detalhe: {
          ambienteAnterior: tenant.ambiente,
          novoAmbiente,
          adminEmail: session.user.email,
        },
      },
    });
  });

  revalidatePath("/admin/tenants");
  return { success: true };
}

/**
 * Suspende manualmente a conta de uma oficina (Admin)
 */
export async function suspendTenantAction(tenantId: string, motivo: string) {
  const session = await requireAdminSession();

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { success: false, error: "Oficina não encontrada." };
  }

  await prismaAdmin.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { statusConta: StatusConta.SUSPENSO_ADMIN },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "ADMIN",
        actorId: session.user.id,
        acao: "TENANT_SUSPENSO",
        entidade: "Tenant",
        entidadeId: tenantId,
        detalhe: {
          adminEmail: session.user.email,
          motivo: motivo?.trim() || "Suspensão manual realizada pela administração",
          statusAnterior: tenant.statusConta,
        },
      },
    });
  });

  revalidatePath("/admin/tenants");
  return { success: true, message: "Oficina suspensa com sucesso." };
}

/**
 * Reativa a conta de uma oficina suspensa (Admin)
 */
export async function reactivateTenantAction(tenantId: string) {
  const session = await requireAdminSession();

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { success: false, error: "Oficina não encontrada." };
  }

  await prismaAdmin.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { statusConta: StatusConta.ATIVO },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "ADMIN",
        actorId: session.user.id,
        acao: "TENANT_REATIVADO",
        entidade: "Tenant",
        entidadeId: tenantId,
        detalhe: {
          adminEmail: session.user.email,
          statusAnterior: tenant.statusConta,
        },
      },
    });
  });

  revalidatePath("/admin/tenants");
  return { success: true, message: "Oficina reativada com sucesso." };
}

/**
 * Consulta o histórico de auditoria de um tenant
 */
export async function getTenantAuditLogsAction(tenantId: string, limit = 50) {
  await requireAdminSession();

  const logs = await prismaAdmin.auditLog.findMany({
    where: { tenantId },
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return logs.map((l) => ({
    id: l.id,
    tenantId: l.tenantId,
    actorType: l.actorType,
    actorId: l.actorId,
    acao: l.acao,
    entidade: l.entidade,
    entidadeId: l.entidadeId,
    detalhe: l.detalhe,
    timestamp: l.timestamp.toISOString(),
  }));
}

/**
 * Permite ao Administrador Master redefinir manualmente a senha do titular de uma empresa
 */
export async function resetTenantUserPasswordAction(
  tenantId: string,
  userId: string,
  newPassword: string
) {
  const session = await requireAdminSession();

  if (!newPassword || newPassword.trim().length < 6) {
    return { success: false, error: "A nova senha deve conter no mínimo 6 caracteres." };
  }

  const user = await prismaAdmin.user.findFirst({
    where: { id: userId, tenantId },
  });

  if (!user) {
    return { success: false, error: "Usuário não encontrado nesta empresa." };
  }

  const salt = await bcrypt.genSalt(10);
  const senhaHash = await bcrypt.hash(newPassword.trim(), salt);

  await prismaAdmin.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { senhaHash },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "ADMIN",
        actorId: session.user.id,
        acao: "RESET_SENHA_USUARIO_ADMIN",
        entidade: "User",
        entidadeId: user.id,
        detalhe: {
          adminEmail: session.user.email,
          userEmail: user.email,
          userName: user.nome,
        },
      },
    });
  });

  revalidatePath("/admin/tenants");
  return { success: true, message: "Senha redefinida com sucesso!" };
}

/**
 * Permite ao Administrador Master atualizar diretamente os tokens Focus NFe de uma oficina
 */
export async function updateTenantTokensAdminAction(
  tenantId: string,
  data: {
    focusNfeTokenHomologacao?: string | null;
    focusNfeTokenProducao?: string | null;
    focusNfeIdEmpresa?: number | null;
    ambiente?: "HOMOLOGACAO" | "PRODUCAO";
  }
) {
  const session = await requireAdminSession();

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
          actorType: "ADMIN",
          actorId: session.user.id,
          acao: "ATUALIZACAO_TOKENS_ADMIN",
          entidade: "Tenant",
          entidadeId: tenantId,
          detalhe: {
            adminEmail: session.user.email,
            ...updateData,
          },
        },
      });
    });

    revalidatePath("/admin/tenants");
    return { success: true };
  } catch (err: any) {
    console.error("[updateTenantTokensAdminAction] Erro:", err);
    return { success: false, error: err.message || "Erro ao atualizar credenciais do cliente." };
  }
}

/**
 * Define o plano comercial da oficina (PARCERIA ou FLEX)
 */
export async function updateTenantPlanAction(
  tenantId: string,
  plano: "PARCERIA" | "FLEX"
) {
  const session = await requireAdminSession();

  try {
    const updated = await prismaAdmin.$transaction(async (tx) => {
      const t = await (tx.tenant as any).update({
        where: { id: tenantId },
        data: { plano },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorType: "ADMIN",
          actorId: session.user.id,
          acao: "ALTERACAO_PLANO_TENANT",
          entidade: "Tenant",
          entidadeId: tenantId,
          detalhe: {
            adminEmail: session.user.email,
            novoPlano: plano,
          },
        },
      });

      return t;
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/assinatura");
    return { success: true, plano: (updated as any)?.plano || plano };
  } catch (err: any) {
    console.error("[updateTenantPlanAction] Erro:", err);
    return { success: false, error: err.message || "Erro ao definir plano da oficina." };
  }
}

/**
 * Obtém os dados completos de uma oficina para o Modal Central de Gestão
 */
export async function getTenantFullDetailsAction(tenantId: string) {
  await requireAdminSession();

  const tenant = await (prismaAdmin.tenant as any).findUnique({
    where: { id: tenantId },
    include: {
      users: { select: { id: true, nome: true, email: true, createdAt: true } },
      _count: { select: { invoices: true, partners: true } },
    },
  });

  if (!tenant) {
    throw new Error("Oficina não encontrada.");
  }

  let payments: any[] = [];
  if (tenant.asaasSubscriptionId) {
    const { getAsaasSubscriptionPayments } = await import("@/lib/services/asaas");
    payments = await getAsaasSubscriptionPayments(tenant.asaasSubscriptionId);
  }

  return {
    ...tenant,
    diaVencimento: tenant.diaVencimento || 10,
    plano: tenant.plano || "PARCERIA",
    payments,
    totalNotas: tenant._count?.invoices || 0,
    totalParceiros: tenant._count?.partners || 0,
  };
}

/**
 * Sincroniza / cria assinatura no Asaas com o dia de vencimento desejado
 */
export async function syncTenantAsaasAction(
  tenantId: string,
  diaVencimento: number = 10
) {
  const session = await requireAdminSession();

  try {
    const { createOrUpdateAsaasSubscription } = await import("@/lib/services/asaas");

    const tenant = await (prismaAdmin.tenant as any).findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error("Oficina não encontrada.");
    }

    const plano = (tenant.plano || "PARCERIA") as "PARCERIA" | "FLEX";
    const res = await createOrUpdateAsaasSubscription(tenantId, diaVencimento, plano);

    await prismaAdmin.auditLog.create({
      data: {
        tenantId,
        actorType: "ADMIN",
        actorId: session.user.id,
        acao: "SINCRONIZACAO_ASSINATURA_ASAAS",
        entidade: "Tenant",
        entidadeId: tenantId,
        detalhe: {
          adminEmail: session.user.email,
          diaVencimento,
          plano,
          subscriptionId: res.subscriptionId,
          customerId: res.customerId,
          nextDueDate: res.nextDueDate,
          valor: res.valor,
        },
      },
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/assinatura");
    return res;
  } catch (err: any) {
    console.error("[syncTenantAsaasAction] Erro:", err);
    return { success: false as const, error: err.message || "Falha ao sincronizar assinatura no Asaas." };
  }
}

/**
 * Atualiza dados cadastrais, financeiros e tributários da oficina
 */
export async function updateTenantManagementAction(
  tenantId: string,
  data: {
    razaoSocial?: string;
    nomeFantasia?: string;
    cnpj?: string;
    inscricaoEstadual?: string;
    emailPrincipal?: string;
    telefoneContato?: string;
    diaVencimento?: number;
    statusConta?: StatusConta;
    plano?: "PARCERIA" | "FLEX";
    ambiente?: AmbienteFiscal;
    focusNfeTokenProducao?: string | null;
    focusNfeTokenHomologacao?: string | null;
    focusNfeIdEmpresa?: number | null;
  }
) {
  const session = await requireAdminSession();

  try {
    const updateData: any = {};

    if (data.razaoSocial !== undefined) updateData.razaoSocial = data.razaoSocial.trim();
    if (data.nomeFantasia !== undefined) updateData.nomeFantasia = data.nomeFantasia ? data.nomeFantasia.trim() : null;
    if (data.cnpj !== undefined) updateData.cnpj = data.cnpj.replace(/\D/g, "");
    if (data.inscricaoEstadual !== undefined) updateData.inscricaoEstadual = data.inscricaoEstadual.trim();
    if (data.emailPrincipal !== undefined) updateData.emailPrincipal = data.emailPrincipal.toLowerCase().trim();
    if (data.telefoneContato !== undefined) updateData.telefoneContato = data.telefoneContato.trim();
    if (data.diaVencimento !== undefined) updateData.diaVencimento = Number(data.diaVencimento);
    if (data.statusConta !== undefined) updateData.statusConta = data.statusConta;
    if (data.plano !== undefined) updateData.plano = data.plano;
    if (data.ambiente !== undefined) updateData.ambiente = data.ambiente;
    if (data.focusNfeTokenProducao !== undefined) updateData.focusNfeTokenProducao = data.focusNfeTokenProducao ? data.focusNfeTokenProducao.trim() : null;
    if (data.focusNfeTokenHomologacao !== undefined) updateData.focusNfeTokenHomologacao = data.focusNfeTokenHomologacao ? data.focusNfeTokenHomologacao.trim() : null;
    if (data.focusNfeIdEmpresa !== undefined) updateData.focusNfeIdEmpresa = data.focusNfeIdEmpresa ? Number(data.focusNfeIdEmpresa) : null;

    const updated = await prismaAdmin.$transaction(async (tx) => {
      const t = await (tx.tenant as any).update({
        where: { id: tenantId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorType: "ADMIN",
          actorId: session.user.id,
          acao: "ATUALIZACAO_CADASTRO_COMPLETO_ADMIN",
          entidade: "Tenant",
          entidadeId: tenantId,
          detalhe: {
            adminEmail: session.user.email,
            camposAtualizados: Object.keys(updateData),
          },
        },
      });

      return t;
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/assinatura");
    return { success: true, tenant: updated };
  } catch (err: any) {
    console.error("[updateTenantManagementAction] Erro:", err);
    return { success: false, error: err.message || "Erro ao salvar alterações da oficina." };
  }
}


