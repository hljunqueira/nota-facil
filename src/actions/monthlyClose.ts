"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { monthlyCloseQueue } from "@/lib/queue";
import { createTenantPrisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { TipoDestinatario } from "@prisma/client";

export interface EnqueueMonthlyCloseInput {
  mes: number;
  ano: number;
  contadorEmail?: string;
}

export async function enqueueMonthlyCloseAction(input: EnqueueMonthlyCloseInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    throw new Error("Não autorizado. Faça login novamente.");
  }

  const tenantId = session.user.tenantId;

  const mes = Number(input.mes);
  const ano = Number(input.ano);

  if (isNaN(mes) || mes < 1 || mes > 12) {
    throw new Error("Mês inválido. Escolha um valor entre 1 e 12.");
  }

  if (isNaN(ano) || ano < 2020 || ano > 2035) {
    throw new Error("Ano inválido.");
  }

  // Busca e-mail do contador cadastrado se não foi passado no modal
  let targetEmail = input.contadorEmail?.trim();
  if (!targetEmail) {
    const contador = await prismaAdmin.notificationRecipient.findFirst({
      where: {
        tenantId,
        tipo: TipoDestinatario.CONTADOR,
        ativo: true,
      },
    });
    targetEmail = contador?.email || undefined;
  }

  const job = await monthlyCloseQueue.add(
    "execute-monthly-close",
    {
      tenantId,
      mes,
      ano,
      contadorEmail: targetEmail || undefined,
      actorId: session.user.id || session.user.name || "TENANT_USER",
    },
    {
      jobId: `close_${tenantId}_${ano}_${mes}_${Date.now()}`,
    }
  );

  return {
    success: true,
    jobId: job.id,
    mes,
    ano,
    contadorEmail: targetEmail || null,
    message: `Fechamento do mês ${String(mes).padStart(2, "0")}/${ano} iniciado em segundo plano!`,
  };
}

export async function getMonthlyCloseConfigAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    throw new Error("Não autorizado.");
  }

  const tenantId = session.user.tenantId;

  const contador = await prismaAdmin.notificationRecipient.findFirst({
    where: {
      tenantId,
      tipo: TipoDestinatario.CONTADOR,
      ativo: true,
    },
  });

  return {
    contadorEmail: contador?.email || null,
    contadorNome: contador?.nome || null,
  };
}

export async function getMonthlyCloseHistoryAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    throw new Error("Não autorizado.");
  }

  const tenantId = session.user.tenantId;

  const logs = await prismaAdmin.auditLog.findMany({
    where: {
      tenantId,
      acao: { in: ["FECHAMENTO_MENSAL_CONCLUIDO", "FECHAMENTO_MENSAL_INICIADO"] },
    },
    orderBy: { timestamp: "desc" },
    take: 10,
  });

  return logs;
}
