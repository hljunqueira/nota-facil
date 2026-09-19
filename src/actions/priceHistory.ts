"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma";
import { prismaAdmin } from "@/lib/prismaAdmin";

async function requireTenantSession() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.tenantId) {
    throw new Error("Sessão expirada ou acesso restrito a oficinas.");
  }
  const tenantId = session.user.tenantId;
  const tenantPrisma = createTenantPrisma(tenantId);
  return { session, tenantId, tenantPrisma };
}

/**
 * Consulta o último preço praticado para determinado parceiro e referência de costura
 */
export async function getPartnerLastPriceAction(partnerId: string, referencia: string) {
  try {
    const { tenantId, tenantPrisma } = await requireTenantSession();

    const cleanRef = (referencia || "").trim().toUpperCase();
    if (!cleanRef || !partnerId) {
      return { success: false, error: "Referência e parceiro são obrigatórios." };
    }

    // 1. Busca na tabela indexada de histórico
    const record = await tenantPrisma.partnerPriceHistory.findFirst({
      where: {
        partnerId,
        referencia: { equals: cleanRef, mode: "insensitive" },
      },
      orderBy: { dataRegistro: "desc" },
    });

    if (record) {
      return {
        success: true,
        encontrado: true,
        valorUnitario: Number(record.valorUnitario),
        dataRegistro: record.dataRegistro,
        descricao: record.descricao,
      };
    }

    // 2. Fallback de busca reversa em notas fiscais de cobrança emitidas anteriormente
    const previousInvoices = await tenantPrisma.invoice.findMany({
      where: {
        partnerId,
        modalidadeEmissao: "COBRANCA_INDUSTRIALIZACAO",
      },
      orderBy: { dataEmissao: "desc" },
      take: 15,
    });

    for (const inv of previousInvoices) {
      const raw: any = inv.rawJson || {};
      const itens = raw?.focusPayload?.itens || raw?.itens || [];

      for (const item of itens) {
        const itemRef = String(item.codigo || item.referencia || "").trim().toUpperCase();
        if (itemRef === cleanRef && item.valor_unitario_comercial) {
          const valor = Number(item.valor_unitario_comercial);

          // Salva para cache futuro
          await tenantPrisma.partnerPriceHistory.upsert({
            where: {
              tenantId_partnerId_referencia: {
                tenantId,
                partnerId,
                referencia: cleanRef,
              },
            },
            create: {
              tenantId,
              partnerId,
              referencia: cleanRef,
              descricao: item.descricao || null,
              valorUnitario: valor,
              ultimaNotaId: inv.id,
              dataRegistro: inv.dataEmissao,
            },
            update: {
              valorUnitario: valor,
              dataRegistro: inv.dataEmissao,
            },
          });

          return {
            success: true,
            encontrado: true,
            valorUnitario: valor,
            dataRegistro: inv.dataEmissao,
            descricao: item.descricao,
          };
        }
      }
    }

    return { success: true, encontrado: false };
  } catch (err: any) {
    console.error("[getPartnerLastPriceAction] Erro:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Grava ou atualiza manualmente ou por emissão o preço de uma referência para o parceiro
 */
export async function savePartnerPriceAction({
  partnerId,
  referencia,
  valorUnitario,
  descricao,
  notaId,
}: {
  partnerId: string;
  referencia: string;
  valorUnitario: number;
  descricao?: string;
  notaId?: string;
}) {
  try {
    const { tenantId, tenantPrisma } = await requireTenantSession();

    const cleanRef = (referencia || "").trim().toUpperCase();
    if (!cleanRef || !partnerId || valorUnitario <= 0) {
      return { success: false, error: "Dados inválidos para registro de preço." };
    }

    const saved = await tenantPrisma.partnerPriceHistory.upsert({
      where: {
        tenantId_partnerId_referencia: {
          tenantId,
          partnerId,
          referencia: cleanRef,
        },
      },
      create: {
        tenantId,
        partnerId,
        referencia: cleanRef,
        descricao: descricao || null,
        valorUnitario,
        ultimaNotaId: notaId || null,
        dataRegistro: new Date(),
      },
      update: {
        valorUnitario,
        descricao: descricao || undefined,
        ultimaNotaId: notaId || undefined,
        dataRegistro: new Date(),
      },
    });

    return { success: true, record: saved };
  } catch (err: any) {
    console.error("[savePartnerPriceAction] Erro:", err);
    return { success: false, error: err.message };
  }
}
