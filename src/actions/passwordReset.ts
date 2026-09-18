"use server";

import { prismaAdmin } from "@/lib/prismaAdmin";

export interface PasswordResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Solicita a recuperação de senha por e-mail
 * Estrutura preparada para integração direta com a API do Resend
 */
export async function requestPasswordResetAction(email: string): Promise<PasswordResetResult> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Informe um endereço de e-mail válido." };
  }

  try {
    // 1. Procura se existe usuário de Tenant ou PlatformAdmin com esse e-mail
    const tenantUser = await prismaAdmin.user.findUnique({
      where: { email: cleanEmail },
      include: { tenant: true },
    });

    const adminUser = !tenantUser
      ? await prismaAdmin.platformAdmin.findUnique({
          where: { email: cleanEmail },
        })
      : null;

    // Prática recomendada de segurança (OWASP):
    // Mesmo se o e-mail não existir, retornamos sucesso genérico para não vazar se a conta existe ou não.
    if (!tenantUser && !adminUser) {
      return {
        success: true,
        message: "Se o e-mail informado estiver cadastrado, enviamos as instruções de recuperação.",
      };
    }

    // 2. Integração futura com o Resend:
    // const resendApiKey = process.env.RESEND_API_KEY;
    // if (resendApiKey) {
    //   await resend.emails.send({ ... });
    // }
    console.log(`[PasswordReset] Solicitação de recuperação de senha para: ${cleanEmail}`);

    // Registra a solicitação no log de auditoria se for usuário de tenant
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
  } catch (err) {
    console.error("[requestPasswordResetAction] Erro:", err);
    return {
      success: false,
      error: "Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.",
    };
  }
}
