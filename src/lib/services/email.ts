/**
 * Serviço de Envio de E-mails Transacionais via Resend API
 * Documentação: https://resend.com/docs/api-reference/emails/send-email
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

const EMAIL_FROM =
  process.env.EMAIL_FROM || "Nota Fácil <notas@appnotafacil.online>";

export interface EmailAttachment {
  filename: string;
  content: string; // Base64
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const toArray = Array.isArray(to) ? to : [to];

    const body: any = {
      from: EMAIL_FROM,
      to: toArray,
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      body.attachments = attachments;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.message || `Resend API HTTP ${res.status}`,
      };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error("[sendEmail] Falha no envio via Resend:", err);
    return {
      success: false,
      error: err.message || "Timeout ou falha de conexão com a API Resend",
    };
  }
}

/**
 * Monta e envia e-mail formal de NF-e autorizada com anexos de PDF e XML
 */
export async function sendInvoiceEmail({
  to,
  razaoSocialEmitente,
  numeroNota,
  serieNota,
  chaveAcesso,
  valorTotal,
  danfePdfBuffer,
  xmlContent,
}: {
  to: string;
  razaoSocialEmitente: string;
  numeroNota: number;
  serieNota: number;
  chaveAcesso: string;
  valorTotal: number;
  danfePdfBuffer?: Buffer;
  xmlContent?: string | Buffer;
}): Promise<{ success: boolean; error?: string }> {
  const formattedValor = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valorTotal);

  const attachments: EmailAttachment[] = [];

  if (danfePdfBuffer) {
    attachments.push({
      filename: `DANFE_${numeroNota}_${chaveAcesso.slice(-8)}.pdf`,
      content: danfePdfBuffer.toString("base64"),
    });
  }

  if (xmlContent) {
    const xmlBuffer =
      typeof xmlContent === "string"
        ? Buffer.from(xmlContent, "utf-8")
        : xmlContent;
    attachments.push({
      filename: `NFe_${numeroNota}_${chaveAcesso.slice(-8)}.xml`,
      content: xmlBuffer.toString("base64"),
    });
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
        .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; }
        .header { text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
        .badge { display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; }
        .title { font-size: 20px; font-weight: bold; margin: 12px 0 4px; color: #0f172a; }
        .desc { font-size: 13px; color: #64748b; margin: 0; }
        .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .info-label { color: #64748b; }
        .info-value { font-weight: 600; color: #0f172a; }
        .chave-box { background-color: #f1f5f9; border-radius: 8px; padding: 10px; font-family: monospace; font-size: 11px; word-break: break-all; margin-top: 12px; text-align: center; }
        .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">NF-e Autorizada pela SEFAZ</span>
          <h1 class="title">Nota Fiscal Eletrônica Emitida</h1>
          <p class="desc">${razaoSocialEmitente}</p>
        </div>

        <p style="font-size: 14px; line-height: 1.5;">Olá,</p>
        <p style="font-size: 13px; color: #475569; line-height: 1.5;">
          A nota fiscal de retorno/remessa de costura foi devidamente autorizada na SEFAZ. Os arquivos oficiais (DANFE em PDF e XML com assinatura digital) estão anexados a esta mensagem.
        </p>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Número da NF-e:</span>
            <span class="info-value">Nº ${numeroNota} (Série ${serieNota})</span>
          </div>
          <div class="info-row">
            <span class="info-label">Valor Total:</span>
            <span class="info-value" style="color: #047857;">${formattedValor}</span>
          </div>
          <div style="margin-top: 10px;">
            <span class="info-label">Chave de Acesso SEFAZ:</span>
            <div class="chave-box">${chaveAcesso}</div>
          </div>
        </div>

        <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
          Este documento foi emitido e processado automaticamente pelo sistema <strong>Nota Fácil</strong>.
        </p>

        <div class="footer">
          Nota Fácil SaaS B2B • Emissão e Retorno de Notas Fiscais em 1 Clique<br>
          Ambiente Seguro • SSL 256-bit
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `NF-e Nº ${numeroNota} Autorizada — ${razaoSocialEmitente}`,
    html,
    attachments,
  });
}

/**
 * Envia o pacote ZIP mensal de notas para a contabilidade
 */
export async function sendMonthlyClosureEmail({
  to,
  razaoSocialOficina,
  mesAno,
  zipBuffer,
  totalNotas,
}: {
  to: string;
  razaoSocialOficina: string;
  mesAno: string;
  zipBuffer: Buffer;
  totalNotas: number;
}): Promise<{ success: boolean; error?: string }> {
  const attachments: EmailAttachment[] = [
    {
      filename: `Fechamento_${razaoSocialOficina.replace(/\W+/g, "_")}_${mesAno}.zip`,
      content: zipBuffer.toString("base64"),
    },
  ];

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
        .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; }
        .title { font-size: 20px; font-weight: bold; margin: 12px 0 4px; color: #0f172a; }
        .desc { font-size: 13px; color: #64748b; margin: 0; }
        .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; }
        .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1 class="title">Fechamento Mensal Fiscal — ${mesAno}</h1>
        <p class="desc">${razaoSocialOficina}</p>

        <p style="font-size: 13px; color: #475569; margin-top: 16px;">
          Prezado(a) Contador(a),
        </p>
        <p style="font-size: 13px; color: #475569;">
          Segue em anexo o pacote compactado (.zip) contendo todos os arquivos XMLs autorizados e DANFEs em PDF referentes ao mês de <strong>${mesAno}</strong> da empresa <strong>${razaoSocialOficina}</strong>.
        </p>

        <div class="info-box">
          <p style="margin: 0;"><strong>Competência:</strong> ${mesAno}</p>
          <p style="margin: 6px 0 0;"><strong>Total de Notas Emitidas/Processadas:</strong> ${totalNotas}</p>
        </div>

        <div class="footer">
          Nota Fácil • Fechamento Mensal Automatizado para Contabilidade
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Fechamento Fiscal ${mesAno} — ${razaoSocialOficina}`,
    html,
    attachments,
  });
}
