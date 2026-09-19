/**
 * Worker BullMQ de Fechamento Mensal do Contador
 * Empacota XMLs e PDFs de todas as notas fiscais do período em formato .zip,
 * armazena cópia de segurança no Cloudflare R2 e envia por e-mail para a contabilidade.
 */

import { Worker, Job } from "bullmq";
import archiver from "archiver";
import { Writable } from "stream";
import { redisConnection } from "@/lib/queue";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { getFileFromStorage, uploadMonthlyZip } from "@/lib/storage";
import { sendMonthlyClosureEmail } from "@/lib/services/email";
import { StatusNota, TipoDestinatario } from "@prisma/client";

export interface MonthlyCloseJobData {
  tenantId: string;
  mes: number; // 1 a 12
  ano: number; // ex: 2026
  contadorEmail?: string;
  actorId?: string;
}

export interface MonthlyCloseResult {
  success: boolean;
  mesAno: string;
  totalNotas: number;
  zipUrl?: string;
  contadorEmail?: string;
  error?: string;
}

/**
 * Cria um Buffer de arquivo ZIP a partir de uma lista de entradas em memória
 */
export function buildZipBuffer(
  entries: Array<{ name: string; content: Buffer | string }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    const bufferStream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    });

    bufferStream.on("finish", () => {
      resolve(Buffer.concat(chunks));
    });

    archive.on("error", (err) => reject(err));

    archive.pipe(bufferStream);

    for (const entry of entries) {
      archive.append(entry.content, { name: entry.name });
    }

    archive.finalize();
  });
}

/**
 * Executa o fechamento mensal fiscal para um tenant
 */
export async function executeMonthlyClose(
  jobData: MonthlyCloseJobData,
  customDb?: any
): Promise<MonthlyCloseResult> {
  const db = customDb || prismaAdmin;
  const { tenantId, mes, ano, contadorEmail: overrideEmail, actorId } = jobData;

  const mesPad = String(mes).padStart(2, "0");
  const mesAno = `${mesPad}/${ano}`;
  const mesAnoFile = `${ano}-${mesPad}`;

  // 1. Busca dados do tenant
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} não encontrado.`);
  }

  // 2. Determina e-mail do contador (override ou cadastrado em NotificationRecipient)
  let emailDestinatario = overrideEmail;

  if (!emailDestinatario) {
    const recipientContador = await db.notificationRecipient.findFirst({
      where: {
        tenantId,
        tipo: TipoDestinatario.CONTADOR,
        ativo: true,
      },
    });
    emailDestinatario = recipientContador?.email || undefined;
  }

  // 3. Busca todas as notas fiscais autorizadas do mês
  const startDate = new Date(ano, mes - 1, 1, 0, 0, 0);
  const endDate = new Date(ano, mes, 0, 23, 59, 59);

  const invoices = await db.invoice.findMany({
    where: {
      tenantId,
      status: StatusNota.AUTORIZADA,
      dataEmissao: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      partner: {
        select: { razaoSocial: true, cnpj: true },
      },
    },
    orderBy: { numero: "asc" },
  });

  // 4. Monta as entradas do arquivo ZIP
  const zipEntries: Array<{ name: string; content: Buffer | string }> = [];

  // Relatório consolidado em formato CSV para conferência do contador com segregação de CFOPs
  let csvReport = "Numero;Serie;Tipo;Modalidade;CFOP_Principal;ChaveAcesso;Parceiro;CNPJ;ValorTotal;BaseCalculoSimples;DataEmissao;Status\n";
  let totalValor = 0;
  let totalTributavelSimples = 0;
  let totalNaoTributavel = 0;

  for (const inv of invoices) {
    const chave = inv.chaveAcesso || `NF_${inv.numero}`;
    const valor = Number(inv.valorTotal) || 0;
    totalValor += valor;

    let modalidade = inv.modalidadeEmissao || (inv.tipo === "ENTRADA" ? "REMESSA_ENTRADA" : "OUTRO");
    let cfopPrincipal = "5902";
    let baseCalculoSimples = 0;

    if (inv.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO") {
      cfopPrincipal = "5124";
      baseCalculoSimples = valor;
      totalTributavelSimples += valor;
    } else if (inv.modalidadeEmissao === "RETORNO_MERCADORIA") {
      cfopPrincipal = "5902";
      baseCalculoSimples = 0;
      totalNaoTributavel += valor;
    } else if (inv.modalidadeEmissao === "CONJUNTA") {
      cfopPrincipal = "5902/5124";
      const raw: any = inv.rawJson || {};
      const itens = raw?.payloadEnviado?.itens || raw?.itens || [];
      const itemServico = itens.find((it: any) => it.cfop === "5124");
      const valorServico = itemServico ? Number(itemServico.valor_total || 0) : 0;
      baseCalculoSimples = valorServico;
      totalTributavelSimples += valorServico;
      totalNaoTributavel += (valor - valorServico);
    } else if (inv.tipo === "ENTRADA") {
      cfopPrincipal = "5901";
      baseCalculoSimples = 0;
    } else {
      baseCalculoSimples = 0;
      totalNaoTributavel += valor;
    }

    const valorFmt = valor.toFixed(2).replace(".", ",");
    const baseSimplesFmt = baseCalculoSimples.toFixed(2).replace(".", ",");
    const dataFmt = inv.dataEmissao
      ? new Date(inv.dataEmissao).toLocaleDateString("pt-BR")
      : "";
    const parceiroNome = (inv.partner?.razaoSocial || "N/A").replace(/;/g, " ");
    const parceiroCnpj = inv.partner?.cnpj || "N/A";

    csvReport += `${inv.numero};${inv.serie};${inv.tipo};${modalidade};${cfopPrincipal};${chave};${parceiroNome};${parceiroCnpj};${valorFmt};${baseSimplesFmt};${dataFmt};${inv.status}\n`;

    // Inclui XML se disponível
    if (inv.xmlUrl) {
      try {
        const xmlBuffer = await getFileFromStorage(inv.xmlUrl);
        if (xmlBuffer) {
          zipEntries.push({
            name: `xml/${chave}.xml`,
            content: xmlBuffer,
          });
        }
      } catch (err) {
        console.warn(`[monthlyClose] Aviso ao recuperar XML da nota ${chave}:`, err);
      }
    } else if (inv.rawJson) {
      // Fallback com representação dos dados se o XML não estiver no storage
      zipEntries.push({
        name: `xml/${chave}_dados.json`,
        content: JSON.stringify(inv.rawJson, null, 2),
      });
    }

    // Inclui PDF se disponível
    if (inv.pdfUrl) {
      try {
        const pdfBuffer = await getFileFromStorage(inv.pdfUrl);
        if (pdfBuffer) {
          zipEntries.push({
            name: `pdf/${chave}.pdf`,
            content: pdfBuffer,
          });
        }
      } catch (err) {
        console.warn(`[monthlyClose] Aviso ao recuperar PDF da nota ${chave}:`, err);
      }
    }
  }

  // Rodapé com Resumo Fiscal para o Contador
  const totalGeralFmt = totalValor.toFixed(2).replace(".", ",");
  const totalTributavelFmt = totalTributavelSimples.toFixed(2).replace(".", ",");
  const totalNaoTributavelFmt = totalNaoTributavel.toFixed(2).replace(".", ",");

  csvReport += `\n`;
  csvReport += `--- RESUMO FISCAL PARA APURACAO DO SIMPLES NACIONAL (LC 123/2006) ---\n`;
  csvReport += `Total Geral Movimentado no Periodo:;R$ ${totalGeralFmt}\n`;
  csvReport += `BASE DE CALCULO TRIBUTAVEL (CFOP 5124 - Anexo II Industria):;R$ ${totalTributavelFmt}\n`;
  csvReport += `TOTAL NAO TRIBUTAVEL (CFOP 5902 - Retorno de Insumos de Terceiros):;R$ ${totalNaoTributavelFmt}\n`;
  csvReport += `AVISO AO CONTADOR:;Apenas o valor indicado na BASE DE CALCULO TRIBUTAVEL (CFOP 5124) deve compor a receita bruta para a guia DAS. Os valores sob CFOP 5902 representam mero retorno de mercadoria de terceiros sem acrescimo patrimonial.\n`;

  // Adiciona o relatório CSV na raiz do ZIP
  zipEntries.push({
    name: `Relatorio_Fiscal_${tenant.razaoSocial.replace(/\W+/g, "_")}_${mesAnoFile}.csv`,
    content: "\uFEFF" + csvReport, // UTF-8 BOM para abrir direto no Excel
  });

  // 5. Gera o Buffer compactado do ZIP
  const zipBuffer = await buildZipBuffer(zipEntries);

  // 6. Armazena cópia de segurança no Cloudflare R2 / Storage
  let zipUrl: string | undefined;
  try {
    zipUrl = await uploadMonthlyZip(tenantId, mesAnoFile, zipBuffer);
  } catch (storageErr) {
    console.warn(`[monthlyClose] Aviso ao salvar ZIP no storage:`, storageErr);
  }

  // 7. Dispara e-mail para a contabilidade (se configurado)
  if (emailDestinatario) {
    try {
      await sendMonthlyClosureEmail({
        to: emailDestinatario,
        tenantInfo: {
          razaoSocial: tenant.razaoSocial,
          nomeFantasia: tenant.nomeFantasia,
          cnpj: tenant.cnpj,
          emailPrincipal: tenant.emailPrincipal || undefined,
          telefoneContato: tenant.telefoneContato || undefined,
        },
        razaoSocialOficina: tenant.razaoSocial,
        mesAno,
        zipBuffer,
        totalNotas: invoices.length,
      });
    } catch (emailErr) {
      console.error(`[monthlyClose] Erro ao enviar e-mail para ${emailDestinatario}:`, emailErr);
    }
  }

  // 8. Grava log de auditoria
  try {
    if (db.auditLog?.create) {
      await db.auditLog.create({
        data: {
          tenantId,
          actorType: "USER",
          actorId: actorId || "SYSTEM",
          acao: "FECHAMENTO_MENSAL_CONCLUIDO",
          entidade: "MonthlyClosure",
          entidadeId: mesAnoFile,
          detalhe: {
            mes: mesPad,
            ano,
            totalNotas: invoices.length,
            contadorEmail: emailDestinatario,
            zipUrl,
          },
        },
      });
    }
  } catch (auditErr) {
    // Silencia em ambiente offline
  }

  return {
    success: true,
    mesAno,
    totalNotas: invoices.length,
    zipUrl,
    contadorEmail: emailDestinatario,
  };
}

/**
 * Cria o Worker BullMQ para a fila `monthly-close`
 */
export function createMonthlyCloseWorker() {
  return new Worker(
    "monthly-close",
    async (job: Job<MonthlyCloseJobData>) => {
      console.log(`[monthlyCloseWorker] Iniciando fechamento mensal job ${job.id}...`, job.data);
      const result = await executeMonthlyClose(job.data);
      console.log(`[monthlyCloseWorker] Fechamento mensal concluído:`, result);
      return result;
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  );
}
