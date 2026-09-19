"use server";

import { prismaAdmin } from "@/lib/prismaAdmin";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "@/lib/services/email";

export interface PasswordResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ValidateTokenResult {
  valid: boolean;
  email?: string;
  error?: string;
}

/**
 * Solicita a recuperação de senha por e-mail
 * Gera token seguro de 64 caracteres com validade de 1 hora e envia via Resend
 */
export async function requestPasswordResetAction(email: string): Promise<PasswordResetResult> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Informe um endereço de e-mail válido." };
  }

  try {
    // 1. Procura se existe usuário de Tenant ou PlatformAdmin com esse e-mail
    const tenantUser = await prismaAdmin.user.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
      include: { tenant: true },
    });

    const adminUser = !tenantUser
      ? await prismaAdmin.platformAdmin.findFirst({
        where: { email: { equals: cleanEmail, mode: "insensitive" } },
      })
      : null;

    // Prática recomendada de segurança (OWASP):
    // Mesmo se o e-mail não existir, retornamos sucesso genérico para não expor a existência de contas.
    if (!tenantUser && !adminUser) {
      return {
        success: true,
        message: "Se o e-mail informado estiver cadastrado, enviamos as instruções de recuperação.",
      };
    }

    // 2. Invalida tokens anteriores não utilizados para este e-mail
    await prismaAdmin.passwordResetToken.updateMany({
      where: {
        email: cleanEmail,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // 3. Gera novo token aleatório seguro (64 caracteres hexadecimais)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de validade

    await prismaAdmin.passwordResetToken.create({
      data: {
        email: cleanEmail,
        token,
        expiresAt,
        used: false,
      },
    });

    // 4. Identifica o nome para o template de e-mail
    const nomeUsuario =
      tenantUser?.nome ||
      tenantUser?.tenant?.nomeFantasia ||
      tenantUser?.tenant?.razaoSocial ||
      adminUser?.nome ||
      "Usuário";

    // 5. Envia o e-mail via Resend API
    const emailResult = await sendPasswordResetEmail({
      to: cleanEmail,
      nomeUsuario,
      token,
    });

    if (!emailResult.success) {
      console.error("[requestPasswordResetAction] Falha ao enviar e-mail pelo Resend:", emailResult.error);
      return {
        success: false,
        error: "Não foi possível enviar o e-mail de recuperação. Tente novamente em instantes.",
      };
    }

    // 6. Registra no log de auditoria
    if (tenantUser?.tenantId) {
      await prismaAdmin.auditLog.create({
        data: {
          tenantId: tenantUser.tenantId,
          actorType: "USUARIO_TENANT",
          actorId: tenantUser.id,
          acao: "SOLICITACAO_RECUPERACAO_SENHA",
          entidade: "User",
          entidadeId: tenantUser.id,
          detalhe: { email: cleanEmail },
        },
      });
    }

    return {
      success: true,
      message: "Se o e-mail informado estiver cadastrado, enviamos as instruções de recuperação.",
    };
  } catch (err: any) {
    console.error("[requestPasswordResetAction] Erro:", err);
    return {
      success: false,
      error: "Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.",
    };
  }
}

/**
 * Valida se um token de recuperação de senha é válido e ainda não expirou
 */
export async function validateResetTokenAction(token: string): Promise<ValidateTokenResult> {
  if (!token || token.length < 16) {
    return { valid: false, error: "Link de recuperação inválido ou formato incorreto." };
  }

  try {
    const record = await prismaAdmin.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) {
      return { valid: false, error: "Link de recuperação inexistente ou inválido." };
    }

    if (record.used) {
      return { valid: false, error: "Este link de recuperação já foi utilizado. Solicite uma nova redefinição." };
    }

    if (new Date() > record.expiresAt) {
      return { valid: false, error: "Este link de recuperação expirou (validade de 1 hora). Solicite uma nova redefinição." };
    }

    return { valid: true, email: record.email };
  } catch (err) {
    console.error("[validateResetTokenAction] Erro:", err);
    return { valid: false, error: "Erro ao validar o link de recuperação." };
  }
}

/**
 * Redefine a senha do usuário utilizando o token validado
 */
export async function resetPasswordAction(
  token: string,
  novaSenha: string
): Promise<PasswordResetResult> {
  if (!token) {
    return { success: false, error: "Token de recuperação ausente." };
  }

  if (!novaSenha || novaSenha.length < 6) {
    return { success: false, error: "A nova senha deve ter no mínimo 6 caracteres." };
  }

  try {
    const record = await prismaAdmin.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.used || new Date() > record.expiresAt) {
      return {
        success: false,
        error: "Link de recuperação inválido ou expirado. Por favor, solicite um novo link.",
      };
    }

    const cleanEmail = record.email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(novaSenha, 10);

    // Atualiza a senha no User ou PlatformAdmin
    const tenantUser = await prismaAdmin.user.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (tenantUser) {
      await prismaAdmin.user.update({
        where: { id: tenantUser.id },
        data: { senhaHash: hashedPassword },
      });

      if (tenantUser.tenantId) {
        await prismaAdmin.auditLog.create({
          data: {
            tenantId: tenantUser.tenantId,
            actorType: "USUARIO_TENANT",
            actorId: tenantUser.id,
            acao: "REDEFINICAO_SENHA_SUCESSO",
            entidade: "User",
            entidadeId: tenantUser.id,
            detalhe: { email: cleanEmail },
          },
        });
      }
    } else {
      const adminUser = await prismaAdmin.platformAdmin.findFirst({
        where: { email: { equals: cleanEmail, mode: "insensitive" } },
      });

      if (adminUser) {
        await prismaAdmin.platformAdmin.update({
          where: { id: adminUser.id },
          data: { senhaHash: hashedPassword },
        });
      } else {
        return { success: false, error: "Conta de usuário não encontrada para este e-mail." };
      }
    }

    // Marca o token como utilizado
    await prismaAdmin.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    });

    return {
      success: true,
      message: "Senha alterada com sucesso! Você já pode realizar o login com suas novas credenciais.",
    };
  } catch (err: any) {
    console.error("[resetPasswordAction] Erro:", err);
    return {
      success: false,
      error: "Ocorreu um erro ao redefinir a senha. Tente novamente.",
    };
  }
}
