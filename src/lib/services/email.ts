/**
 * Serviço de Envio de E-mails Transacionais via Resend API
 * Com identificação oficial do Tenant (Facção/Oficina) e domínio verificado notas@appnotafacil.online
 * Documentação: https://resend.com/docs/api-reference/emails/send-email
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const DEFAULT_EMAIL_FROM = "notas@appnotafacil.online";

export interface EmailAttachment {
  filename: string;
  content: string; // Base64
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface TenantEmailInfo {
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj?: string;
  emailPrincipal?: string;
  telefoneContato?: string;
  chavePix?: string | null;
  dadosBancarios?: string | null;
}

export async function sendEmail({
  to,
  subject,
  html,
  fromName,
  replyTo,
  attachments,
}: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const toArray = Array.isArray(to) ? to : [to];

    // Formata o remetente identificando o tenant (ex: "H E LEMOS CONFECCAO via Nota Fácil <notas@appnotafacil.online>")
    const displayName = fromName ? `${fromName.replace(/<|>|"/g, "").trim()} via Nota Fácil` : "Nota Fácil";
    const from = `${displayName} <${DEFAULT_EMAIL_FROM}>`;

    const body: any = {
      from,
      to: toArray,
      subject,
      html,
    };

    if (replyTo && replyTo.includes("@")) {
      body.reply_to = replyTo;
    }

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
      signal: AbortSignal.timeout(15000),
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
 * Envia e-mail seguro para redefinição de senha
 */
export async function sendPasswordResetEmail({
  to,
  nomeUsuario,
  token,
}: {
  to: string;
  nomeUsuario: string;
  token: string;
}): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `https://appnotafacil.online/redefinir-senha?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redefinição de Senha</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
        .card { max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .badge { display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
        .title { font-size: 22px; font-weight: 800; margin: 16px 0 8px; color: #0f172a; }
        .text { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
        .callout { background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px; margin: 20px 0; font-size: 12px; color: #92400e; line-height: 1.5; }
        .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; pt: 20px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">Segurança da Conta</span>
        <h1 class="title">Redefinir sua Senha de Acesso</h1>
        <p class="text">Olá, <strong>${nomeUsuario}</strong>.</p>
        <p class="text">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Nota Fácil</strong>. Clique no botão abaixo para cadastrar uma nova senha com segurança:</p>
        
        <div class="btn-container">
          <a href="${resetUrl}" class="btn" target="_blank">Redefinir Minha Senha</a>
        </div>

        <div class="callout">
          ⚠️ <strong>Link válido por 1 hora.</strong> Se você não solicitou a alteração de senha, nenhuma ação é necessária e sua senha atual continuará segura.
        </div>

        <p class="text" style="font-size: 12px; color: #94a3b8; word-break: break-all;">
          Caso o botão não funcione, copie e cole o link no seu navegador:<br>
          <a href="${resetUrl}" style="color: #0284c7;">${resetUrl}</a>
        </p>

        <div class="footer">
          Nota Fácil Cloud • Emissão e Retorno de NF-e Descomplicada<br>
          Ambiente Seguro • SSL 256-bit
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: "Redefinição de Senha — Nota Fácil",
    fromName: "Nota Fácil Segurança",
    replyTo: "suporte@appnotafacil.online",
    html,
  });
}

/**
 * Monta e envia e-mail formal de NF-e autorizada com identificação explícita do Tenant
 * e anexos do DANFE (PDF) e do XML da SEFAZ
 */
export async function sendInvoiceEmail({
  to,
  tenantInfo,
  razaoSocialEmitente,
  numeroNota,
  serieNota,
  chaveAcesso,
  valorTotal,
  modalidade,
  parceiroNome,
  previsaoPagamento,
  danfePdfBuffer,
  xmlContent,
}: {
  to: string | string[];
  tenantInfo?: TenantEmailInfo;
  razaoSocialEmitente: string;
  numeroNota: number;
  serieNota: number;
  chaveAcesso: string;
  valorTotal: number;
  modalidade?: string | null;
  parceiroNome?: string | null;
  previsaoPagamento?: string | null;
  danfePdfBuffer?: Buffer;
  xmlContent?: string | Buffer;
}): Promise<{ success: boolean; error?: string }> {
  const formattedValor = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valorTotal);

  const attachments: EmailAttachment[] = [];

  if (danfePdfBuffer && danfePdfBuffer.length > 0) {
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
    if (xmlBuffer.length > 0) {
      attachments.push({
        filename: `${chaveAcesso}.xml`,
        content: xmlBuffer.toString("base64"),
      });
    }
  }

  const isCobranca = modalidade === "COBRANCA_INDUSTRIALIZACAO" || modalidade === "CONJUNTA";
  const modalidadeLabel = isCobranca
    ? "Cobrança de Prestação de Serviços (CFOP 5124)"
    : "Retorno de Mercadoria / Insumos (CFOP 5902)";

  const nomeOficina = tenantInfo?.nomeFantasia || tenantInfo?.razaoSocial || razaoSocialEmitente;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NF-e Autorizada - ${nomeOficina}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header-brand { border-bottom: 2px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 22px; }
        .oficina-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
        .oficina-sub { font-size: 12px; color: #64748b; margin: 4px 0 0; }
        .badge { display: inline-block; background-color: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 12px; }
        .title { font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #0f172a; }
        .text { font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 16px; }
        .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 20px 0; font-size: 13px; }
        .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
        .info-label { color: #64748b; font-weight: 500; }
        .info-value { color: #0f172a; font-weight: 700; text-align: right; }
        .chave-box { font-family: monospace; font-size: 11px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; margin-top: 6px; word-break: break-all; color: #334155; }
        .highlight-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; margin: 16px 0; }
        .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header-brand">
          <h2 class="oficina-name">${nomeOficina}</h2>
          <p class="oficina-sub">
            ${tenantInfo?.cnpj ? `CNPJ: ${tenantInfo.cnpj} • ` : ""}
            ${tenantInfo?.telefoneContato ? `Contato: ${tenantInfo.telefoneContato}` : "Prestadora de Serviços de Confecção"}
          </p>
        </div>

        <span class="badge">✓ NF-e Autorizada pela SEFAZ</span>
        <h1 class="title">${modalidadeLabel}</h1>

        <p class="text">
          Prezados da <strong>${parceiroNome || "Fábrica Parceira"}</strong>,
        </p>
        <p class="text">
          Encaminhamos os documentos fiscais referentes ao lote industrializado por <strong>${nomeOficina}</strong>. Seguem em anexo a este e-mail o <strong>DANFE em formato PDF</strong> e o <strong>arquivo XML oficial</strong>.
        </p>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Número da NF-e:</span>
            <span class="info-value">Nº ${numeroNota} (Série ${serieNota})</span>
          </div>
          <div class="info-row">
            <span class="info-label">Valor Total:</span>
            <span class="info-value" style="color: ${isCobranca ? "#059669" : "#475569"}; font-size: 15px;">
              ${formattedValor}
            </span>
          </div>
          ${
            previsaoPagamento
              ? `
          <div class="info-row">
            <span class="info-label">Previsão de Depósito:</span>
            <span class="info-value" style="color: #0284c7;">${previsaoPagamento}</span>
          </div>
          `
              : ""
          }
          <div style="margin-top: 10px;">
            <span class="info-label">Chave de Acesso SEFAZ (44 dígitos):</span>
            <div class="chave-box">${chaveAcesso}</div>
          </div>
          ${
            isCobranca && (tenantInfo?.chavePix || tenantInfo?.dadosBancarios)
              ? `
          <div style="margin-top: 14px; padding: 14px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;">
            <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 0.5px; margin-bottom: 6px;">
              Dados para Depósito / Pix da Costura (Oficina)
            </span>
            ${
              tenantInfo.chavePix
                ? `
            <div style="margin-bottom: 6px; font-size: 13px; color: #166534;">
              <strong>Chave Pix:</strong> <code style="background-color: #dcfce7; padding: 2px 6px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold; color: #14532d;">${tenantInfo.chavePix}</code>
            </div>
            `
                : ""
            }
            ${
              tenantInfo.dadosBancarios
                ? `
            <div style="font-size: 12px; color: #166534; line-height: 1.4;">
              <strong>Dados Bancários:</strong> ${tenantInfo.dadosBancarios.replace(/\n/g, "<br>")}
            </div>
            `
                : ""
            }
          </div>
          `
              : ""
          }
        </div>

        <p class="text" style="font-size: 12px; color: #64748b;">
          Documento gerado e processado eletronicamente através do sistema <strong>Nota Fácil</strong>.
        </p>

        <div class="footer">
          Enviado por <strong>${nomeOficina}</strong> através da plataforma Nota Fácil Cloud.<br>
          Para responder a este comunicado, responda diretamente a este e-mail.
        </div>
      </div>
    </body>
    </html>
  `;

  const subject = `NF-e Nº ${numeroNota} (${isCobranca ? "Cobrança" : "Retorno"}) — ${nomeOficina}${parceiroNome ? ` para ${parceiroNome}` : ""}`;

  return sendEmail({
    to,
    subject,
    fromName: nomeOficina,
    replyTo: tenantInfo?.emailPrincipal || undefined,
    html,
    attachments,
  });
}

/**
 * Envia o pacote ZIP mensal de notas para a contabilidade com identificação da oficina
 */
export async function sendMonthlyClosureEmail({
  to,
  tenantInfo,
  razaoSocialOficina,
  mesAno,
  zipBuffer,
  totalNotas,
}: {
  to: string;
  tenantInfo?: TenantEmailInfo;
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

  const nomeOficina = tenantInfo?.nomeFantasia || tenantInfo?.razaoSocial || razaoSocialOficina;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fechamento Fiscal Mensal</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
        .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .title { font-size: 20px; font-weight: 800; margin: 12px 0 4px; color: #0f172a; }
        .desc { font-size: 13px; color: #64748b; margin: 0; }
        .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 20px 0; font-size: 13px; }
        .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1 class="title">Fechamento Fiscal Mensal — ${mesAno}</h1>
        <p class="desc">${nomeOficina} ${tenantInfo?.cnpj ? `(CNPJ: ${tenantInfo.cnpj})` : ""}</p>

        <p style="font-size: 13px; color: #475569; margin-top: 18px;">
          Prezado(a) Contador(a),
        </p>
        <p style="font-size: 13px; color: #475569; line-height: 1.6;">
          Segue em anexo o arquivo compactado <strong>(.ZIP)</strong> contendo todos os arquivos XMLs autorizados, DANFEs em PDF e relatório consolidado em planilha CSV referentes ao mês de <strong>${mesAno}</strong> da empresa <strong>${nomeOficina}</strong>.
        </p>

        <div class="info-box">
          <p style="margin: 0;"><strong>Competência:</strong> ${mesAno}</p>
          <p style="margin: 8px 0 0;"><strong>Total de Notas Emitidas/Processadas:</strong> ${totalNotas}</p>
        </div>

        <p style="font-size: 12px; color: #64748b;">
          Pacote gerado automaticamente através da plataforma <strong>Nota Fácil</strong>.
        </p>

        <div class="footer">
          Enviado por <strong>${nomeOficina}</strong> para o escritório contábil.<br>
          Dúvidas? Responda diretamente a este e-mail.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Fechamento Fiscal ${mesAno} — ${nomeOficina}`,
    fromName: `${nomeOficina} — Contabilidade`,
    replyTo: tenantInfo?.emailPrincipal || undefined,
    html,
    attachments,
  });
}

/**
 * Envia e-mail de boas-vindas e ativação quando a conta da oficina é aprovada pelo Admin
 */
export async function sendTenantWelcomeEmail({
  to,
  razaoSocial,
  nomeResponsavel,
}: {
  to: string;
  razaoSocial: string;
  nomeResponsavel?: string;
}): Promise<{ success: boolean; error?: string }> {
  const loginUrl = "https://appnotafacil.online/login";

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Conta Aprovada</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
        .card { max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .badge { display: inline-block; background-color: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; border: 1px solid #a7f3d0; text-transform: uppercase; }
        .title { font-size: 22px; font-weight: 800; margin: 16px 0 8px; color: #0f172a; }
        .text { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #059669; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; }
        .box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #334155; }
        .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">✓ Cadastro Aprovado</span>
        <h1 class="title">Sua conta no Nota Fácil está pronta!</h1>
        <p class="text">Olá, <strong>${nomeResponsavel || razaoSocial}</strong>.</p>
        <p class="text">
          Temos o prazer de informar que o cadastro da empresa <strong>${razaoSocial}</strong> foi aprovado com sucesso em nossa plataforma.
        </p>

        <div class="box">
          <p style="margin: 0 0 6px;"><strong>Próximos passos para começar a emitir:</strong></p>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>Acesse o painel com seu e-mail e senha.</li>
            <li>Conecte seu Certificado Digital A1 em Configurações.</li>
            <li>Cadastre ou importe as notas de remessa das suas fábricas parceiras.</li>
          </ul>
        </div>

        <div class="btn-container">
          <a href="${loginUrl}" class="btn" target="_blank">Acessar Meu Painel</a>
        </div>

        <div class="footer">
          Nota Fácil Cloud • Emissão e Retorno de NF-e Descomplicada<br>
          Dúvidas? Entre em contato pelo WhatsApp de Suporte.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Conta Aprovada com Sucesso — Bem-vindo ao Nota Fácil`,
    fromName: "Nota Fácil Boas-Vindas",
    replyTo: "suporte@appnotafacil.online",
    html,
  });
}
