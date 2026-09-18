"use server";

import bcrypt from "bcryptjs";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { publicRegisterSchema, PublicRegisterInput } from "@/lib/validations";
import { StatusCadastro, StatusConta, AmbienteFiscal, UserRole } from "@prisma/client";

export interface RegisterResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function registerTenantAction(
  data: PublicRegisterInput
): Promise<RegisterResult> {
  // 1. Validação via Zod
  const validation = publicRegisterSchema.safeParse(data);
  if (!validation.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of validation.error.issues) {
      const path = issue.path[0];
      if (path && typeof path === "string") {
        fieldErrors[path] = issue.message;
      }
    }
    return {
      success: false,
      error: "Por favor, corrija os erros no formulário.",
      fieldErrors,
    };
  }

  const {
    razaoSocial,
    nomeFantasia,
    cnpj,
    inscricaoEstadual,
    responsavelNome,
    telefoneContato,
    emailPrincipal,
    senha,
  } = validation.data;

  const cleanCnpj = cnpj.replace(/\D/g, "");
  const cleanEmail = emailPrincipal.trim().toLowerCase();

  try {
    // 2. Verificar duplicidade de CNPJ
    const existingTenant = await prismaAdmin.tenant.findUnique({
      where: { cnpj: cleanCnpj },
    });

    if (existingTenant) {
      return {
        success: false,
        error: "Este CNPJ já possui cadastro na plataforma.",
        fieldErrors: { cnpj: "CNPJ já cadastrado no sistema" },
      };
    }

    // 3. Verificar duplicidade de E-mail de Usuário
    const existingUser = await prismaAdmin.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: "Este e-mail já está em uso por outro usuário.",
        fieldErrors: { emailPrincipal: "E-mail já cadastrado" },
      };
    }

    // 4. Criptografar Senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    // 5. Transação Atômica: Cria Tenant + User Inicial + AuditLog
    await prismaAdmin.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          razaoSocial: razaoSocial.trim(),
          nomeFantasia: nomeFantasia?.trim() || null,
          cnpj: cleanCnpj,
          inscricaoEstadual: inscricaoEstadual.trim().toUpperCase(),
          emailPrincipal: cleanEmail,
          telefoneContato: telefoneContato.trim(),
          statusCadastro: StatusCadastro.PENDENTE_ANALISE,
          statusConta: StatusConta.EM_ONBOARDING,
          ambiente: AmbienteFiscal.HOMOLOGACAO,
          serieNfe: 1,
          proximoNumero: 1,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          nome: responsavelNome.trim(),
          email: cleanEmail,
          senhaHash,
          role: UserRole.TENANT,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorType: "USUARIO_TENANT",
          actorId: user.id,
          acao: "CADASTRO_PUBLICO_SOLICITADO",
          entidade: "TENANT",
          entidadeId: tenant.id,
          detalhe: {
            cnpj: cleanCnpj,
            razaoSocial: tenant.razaoSocial,
            responsavel: user.nome,
            email: user.email,
          },
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("[registerTenantAction] Erro ao registrar oficina:", err);
    return {
      success: false,
      error: "Ocorreu um erro ao salvar o cadastro. Tente novamente mais tarde.",
    };
  }
}
