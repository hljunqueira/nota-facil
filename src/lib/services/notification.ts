/**
 * Orquestrador de Mensageria B2B com Fallback Automático:
 * WhatsApp (Evolution API) ➔ Fallback para E-mail (Resend API)
 */

import { sendWhatsAppDocument, sendWhatsAppMessage } from "./whatsapp";
import { sendInvoiceEmail, TenantEmailInfo } from "./email";
import { prismaAdmin } from "@/lib/prismaAdmin";

export interface InvoiceNotificationPayload {
  tenantId: string;
  invoiceId: string;
  razaoSocialEmitente: string;
  numeroNota: number;
  serieNota: number;
  chaveAcesso: string;
  valorTotal: number;
  destinatarioNome: string;
  destinatarioTelefone?: string | null;
  destinatarioEmail?: string | null;
  danfePdfBuffer?: Buffer;
  danfePdfUrl?: string;
  xmlContent?: string | Buffer;
  xmlUrl?: string;
  tenantInfo?: TenantEmailInfo;
  modalidade?: string | null;
}

export interface NotificationResult {
  success: boolean;
  channelUsed: "WHATSAPP" | "EMAIL" | "NONE";
  fallbackTriggered: boolean;
  error?: string;
}

async function safeAuditLog(data: any) {
  try {
    await prismaAdmin.auditLog.create({ data });
  } catch (err: any) {
    console.warn("[safeAuditLog] Aviso: Não foi possível gravar AuditLog (DB offline ou inacessível):", err.message);
  }
}

/**
 * Envia notificação de NF-e autorizada.
 * Tenta prioritariamente via WhatsApp. Caso falhe ou não haja telefone,
 * aciona automaticamente o fallback para E-mail e registra tudo em AuditLog.
 */
export async function sendInvoiceNotification(
  payload: InvoiceNotificationPayload
): Promise<NotificationResult> {
  const {
    tenantId,
    invoiceId,
    razaoSocialEmitente,
    numeroNota,
    serieNota,
    chaveAcesso,
    valorTotal,
    destinatarioNome,
    destinatarioTelefone,
    destinatarioEmail,
    danfePdfBuffer,
    danfePdfUrl,
    xmlContent,
    xmlUrl,
  } = payload;

  let whatsappAttempted = false;
  let whatsappError: string | undefined;

  // 1. Tenta envio via WhatsApp se houver telefone
  if (destinatarioTelefone && destinatarioTelefone.trim().length >= 10) {
    whatsappAttempted = true;

    try {
      const formattedValor = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(valorTotal);

      const caption = `📄 *Nota Fiscal Autorizada!*\n\nOlá *${destinatarioNome}*,\nA NF-e de retorno *Nº ${numeroNota}* (Série ${serieNota}) foi autorizada na SEFAZ pela empresa *${razaoSocialEmitente}*.\n\n💰 *Valor:* ${formattedValor}\n🔑 *Chave:* \`${chaveAcesso}\`\n\n_Segue o DANFE em PDF anexo. Arquivo XML disponível em:_ ${xmlUrl || "anexo no e-mail"}`;

      // Se houver buffer de PDF ou URL pública
      const mediaToSend =
        danfePdfBuffer && danfePdfBuffer.length > 0
          ? `data:application/pdf;base64,${danfePdfBuffer.toString("base64")}`
          : danfePdfUrl;

      let waResult: { success: boolean; error?: string } = {
        success: false,
        error: "Sem mídia para envio",
      };

      if (mediaToSend) {
        waResult = await sendWhatsAppDocument({
          number: destinatarioTelefone,
          mediaBase64OrUrl: mediaToSend,
          fileName: `DANFE_${numeroNota}.pdf`,
          caption,
          mimeType: "application/pdf",
        });
      } else {
        waResult = await sendWhatsAppMessage({
          number: destinatarioTelefone,
          text: caption,
        });
      }

      if (waResult.success) {
        // WhatsApp teve sucesso
        await safeAuditLog({
          tenantId,
          actorType: "SYSTEM",
          actorId: "MESSAGING_WORKER",
          acao: "NOTIFICACAO_WHATSAPP_ENVIADA",
          entidade: "Invoice",
          entidadeId: invoiceId,
          detalhe: {
            canal: "WHATSAPP",
            destinatarioTelefone,
            numeroNota,
            chaveAcesso,
          },
        });

        return {
          success: true,
          channelUsed: "WHATSAPP",
          fallbackTriggered: false,
        };
      } else {
        whatsappError = waResult.error;
      }
    } catch (err: any) {
      whatsappError = err.message || "Erro inesperado ao enviar WhatsApp";
    }
  }

  // 2. Fallback Automático para E-mail
  if (destinatarioEmail && destinatarioEmail.includes("@")) {
    try {
      const emailResult = await sendInvoiceEmail({
        to: destinatarioEmail,
        tenantInfo: payload.tenantInfo,
        razaoSocialEmitente,
        numeroNota,
        serieNota,
        chaveAcesso,
        valorTotal,
        modalidade: payload.modalidade,
        parceiroNome: destinatarioNome,
        danfePdfBuffer,
        xmlContent,
      });

      if (emailResult.success) {
        // Registra o fallback no AuditLog
        await safeAuditLog({
          tenantId,
          actorType: "SYSTEM",
          actorId: "MESSAGING_WORKER",
          acao: whatsappAttempted
            ? "NOTIFICACAO_WHATSAPP_FALHOU_FALLBACK_EMAIL"
            : "NOTIFICACAO_EMAIL_ENVIADA",
          entidade: "Invoice",
          entidadeId: invoiceId,
          detalhe: {
            canal: "EMAIL",
            destinatarioEmail,
            numeroNota,
            chaveAcesso,
            motivoFallback: whatsappAttempted
              ? `WhatsApp falhou: ${whatsappError}`
              : "Telefone não cadastrado",
          },
        });

        return {
          success: true,
          channelUsed: "EMAIL",
          fallbackTriggered: whatsappAttempted,
        };
      }
    } catch (emailErr: any) {
      console.error("[sendInvoiceNotification] Erro no fallback de e-mail:", emailErr);
    }
  }

  // 3. Falha em ambos os canais
  await safeAuditLog({
    tenantId,
    actorType: "SYSTEM",
    actorId: "MESSAGING_WORKER",
    acao: "NOTIFICACAO_FALHOU_TODOS_CANAIS",
    entidade: "Invoice",
    entidadeId: invoiceId,
    detalhe: {
      destinatarioNome,
      destinatarioTelefone,
      destinatarioEmail,
      whatsappError,
      numeroNota,
    },
  });

  return {
    success: false,
    channelUsed: "NONE",
    fallbackTriggered: whatsappAttempted,
    error: whatsappError || "Não foi possível enviar por WhatsApp nem por E-mail.",
  };
}
