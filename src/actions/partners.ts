"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { partnerSchema, PartnerInput } from "@/lib/validations";
import { lookupCnpj } from "@/lib/services/cnpj";
import { revalidatePath } from "next/cache";

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
 * Registra eventos na trilha de auditoria
 */
async function recordAuditLog(
  tenantId: string,
  actorId: string,
  acao: string,
  entidadeId: string,
  detalhe?: any
) {
  try {
    await prismaAdmin.auditLog.create({
      data: {
        tenantId,
        actorType: "USER",
        actorId,
        acao,
        entidade: "Partner",
        entidadeId,
        detalhe: detalhe ? JSON.parse(JSON.stringify(detalhe)) : undefined,
      },
    });
  } catch (err) {
    console.warn("[PartnersAction] Aviso: Falha ao gravar AuditLog:", err);
  }
}

/**
 * Retorna a lista de parceiros do tenant com contagem de notas vinculadas
 */
export async function getPartnersAction(params?: { search?: string }) {
  const { tenantPrisma } = await requireTenantSession();
  const search = params?.search?.trim();

  const whereClause: any = {};
  if (search) {
    const cleanDigits = search.replace(/\D/g, "");
    whereClause.OR = [
      { razaoSocial: { contains: search, mode: "insensitive" } },
      { nomeFantasia: { contains: search, mode: "insensitive" } },
      ...(cleanDigits.length >= 3 ? [{ cnpj: { contains: cleanDigits } }] : []),
    ];
  }

  const partners = await tenantPrisma.partner.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          invoices: true,
          recipients: true,
        },
      },
    },
    orderBy: {
      razaoSocial: "asc",
    },
  });

  return partners.map((p) => ({
    id: p.id,
    razaoSocial: p.razaoSocial,
    nomeFantasia: p.nomeFantasia,
    cnpj: p.cnpj,
    email: p.email,
    telefone: p.telefone,
    totalInvoices: p._count.invoices,
    totalRecipients: p._count.recipients,
    createdAt: p.createdAt.toISOString(),
  }));
}

/**
 * Consulta dados cadastrais do CNPJ na Receita/Focus NFe para auto-preenchimento
 */
export async function lookupPartnerCnpjAction(cnpjRaw: string) {
  await requireTenantSession();
  const cnpj = cnpjRaw.replace(/\D/g, "");

  if (cnpj.length !== 14) {
    return { success: false, error: "CNPJ deve conter 14 dígitos numéricos." };
  }

  try {
    const res = await lookupCnpj(cnpj);
    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error || "Não foi possível consultar os dados deste CNPJ no momento.",
      };
    }

    return {
      success: true,
      data: {
        razaoSocial: res.data.razaoSocial,
        nomeFantasia: res.data.nomeFantasia || res.data.razaoSocial,
        cnpj,
        email: res.data.email || "",
        telefone: res.data.telefone || "",
        logradouro: res.data.logradouro,
        numero: res.data.numero,
        municipio: res.data.municipio,
        uf: res.data.uf,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Não foi possível consultar os dados deste CNPJ no momento.",
    };
  }
}

/**
 * Cria ou atualiza uma fábrica parceira
 */
export async function savePartnerAction(
  input: PartnerInput & { id?: string }
) {
  const { session, tenantId, tenantPrisma } = await requireTenantSession();
  const parsed = partnerSchema.parse(input);
  const cleanCnpj = parsed.cnpj.replace(/\D/g, "");

  // Checa se já existe outro parceiro com este CNPJ no mesmo tenant
  const existingWithCnpj = await tenantPrisma.partner.findFirst({
    where: {
      cnpj: cleanCnpj,
      ...(input.id ? { NOT: { id: input.id } } : {}),
    },
  });

  if (existingWithCnpj) {
    return {
      success: false,
      error: `Já existe uma fábrica parceira cadastrada com este CNPJ (${existingWithCnpj.razaoSocial}).`,
    };
  }

  if (input.id) {
    // Atualização
    const partner = await tenantPrisma.partner.update({
      where: { id: input.id },
      data: {
        razaoSocial: parsed.razaoSocial.trim(),
        nomeFantasia: parsed.nomeFantasia?.trim() || null,
        cnpj: cleanCnpj,
        email: parsed.email?.trim() || null,
        telefone: parsed.telefone?.replace(/\D/g, "") || null,
      },
    });

    await recordAuditLog(
      tenantId,
      session.user.id,
      "PARTNER_ATUALIZADO",
      partner.id,
      { razaoSocial: partner.razaoSocial, cnpj: partner.cnpj }
    );

    revalidatePath("/parceiros");
    revalidatePath("/notas");
    revalidatePath("/");

    return {
      success: true,
      partnerId: partner.id,
      message: "Fábrica parceira atualizada com sucesso!",
    };
  } else {
    // Criação
    const partner = await tenantPrisma.partner.create({
      data: {
        tenantId,
        razaoSocial: parsed.razaoSocial.trim(),
        nomeFantasia: parsed.nomeFantasia?.trim() || null,
        cnpj: cleanCnpj,
        email: parsed.email?.trim() || null,
        telefone: parsed.telefone?.replace(/\D/g, "") || null,
      },
    });

    await recordAuditLog(
      tenantId,
      session.user.id,
      "PARTNER_CRIADO",
      partner.id,
      { razaoSocial: partner.razaoSocial, cnpj: partner.cnpj }
    );

    revalidatePath("/parceiros");
    revalidatePath("/notas");
    revalidatePath("/");

    return {
      success: true,
      partnerId: partner.id,
      message: "Fábrica parceira cadastrada com sucesso!",
    };
  }
}

/**
 * Exclui uma fábrica parceira respeitando estrita integridade referencial
 */
export async function deletePartnerAction(partnerId: string) {
  const { session, tenantId, tenantPrisma } = await requireTenantSession();

  const partner = await tenantPrisma.partner.findUnique({
    where: { id: partnerId },
    include: {
      _count: {
        select: {
          invoices: true,
          recipients: true,
        },
      },
    },
  });

  if (!partner) {
    return { success: false, error: "Fábrica parceira não encontrada." };
  }

  // PROTEÇÃO DE INTEGRIDADE FISCAL: Não permitir exclusão se houver notas vinculadas
  if (partner._count.invoices > 0) {
    return {
      success: false,
      blockedByInvoices: true,
      invoiceCount: partner._count.invoices,
      error: `Não é possível excluir a fábrica parceira "${partner.razaoSocial}" pois existem ${partner._count.invoices} nota(s) fiscal(is) vinculada(s) ao histórico da oficina.`,
    };
  }

  // Se houver destinatários de notificação apontando para o parceiro, desvincula com segurança
  if (partner._count.recipients > 0) {
    await prismaAdmin.notificationRecipient.updateMany({
      where: { partnerId: partner.id, tenantId },
      data: { partnerId: null },
    });
  }

  await tenantPrisma.partner.delete({
    where: { id: partnerId },
  });

  await recordAuditLog(
    tenantId,
    session.user.id,
    "PARTNER_EXCLUIDO",
    partnerId,
    { razaoSocial: partner.razaoSocial, cnpj: partner.cnpj }
  );

  revalidatePath("/parceiros");
  revalidatePath("/notas");
  revalidatePath("/");

  return {
    success: true,
    message: `Fábrica parceira "${partner.razaoSocial}" excluída com sucesso.`,
  };
}
