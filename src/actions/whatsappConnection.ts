"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaAdmin } from "@/lib/prismaAdmin";
import {
  checkWhatsAppInstanceStatus,
  getOrCreateWhatsAppQrCode,
  disconnectWhatsAppInstance,
  sendWhatsAppMessage,
  getTenantWhatsAppInstanceName,
} from "@/lib/services/whatsapp";

async function requireTenantInfo() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    throw new Error("Não autorizado. Faça login novamente.");
  }

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      id: true,
      razaoSocial: true,
      cnpj: true,
      telefoneContato: true,
    },
  });

  if (!tenant) {
    throw new Error("Oficina não encontrada no sistema.");
  }

  const instanceName = getTenantWhatsAppInstanceName(tenant.cnpj);
  return { tenant, instanceName };
}

/**
 * Retorna o status de conexão do WhatsApp da oficina
 */
export async function getTenantWhatsAppStatusAction() {
  const { instanceName, tenant } = await requireTenantInfo();
  const status = await checkWhatsAppInstanceStatus(instanceName);

  return {
    ...status,
    instanceName,
    telefoneContato: tenant.telefoneContato,
  };
}

/**
 * Gera ou recupera o QR Code para pareamento do WhatsApp da oficina
 */
export async function getTenantWhatsAppQrCodeAction() {
  const { instanceName } = await requireTenantInfo();
  return getOrCreateWhatsAppQrCode(instanceName);
}

/**
 * Desconecta a sessão do WhatsApp da oficina
 */
export async function disconnectTenantWhatsAppAction() {
  const { instanceName } = await requireTenantInfo();
  return disconnectWhatsAppInstance(instanceName);
}

/**
 * Envia uma mensagem de teste para o número cadastrado da própria oficina
 */
export async function sendWhatsAppTestMessageAction() {
  const { instanceName, tenant } = await requireTenantInfo();
  if (!tenant.telefoneContato) {
    return { success: false, error: "A oficina não possui telefone de contato cadastrado." };
  }

  const text = `✅ *Nota Fácil — Teste de Conexão WhatsApp*\n\nSeu WhatsApp comercial foi conectado com sucesso ao sistema Nota Fácil!\n\nA partir de agora, suas notas fiscais autorizadas, DANFEs em PDF e fechamentos contábeis mensais serão enviados diretamente deste número para seus clientes e contador.`;

  return sendWhatsAppMessage({
    instanceName,
    number: tenant.telefoneContato,
    text,
  });
}
