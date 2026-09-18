/**
 * Worker BullMQ de Sincronização Periódica de Notas Recebidas (MDe)
 * Consulta a Focus NFe via cursor `lastMdeVersao`, deduplica com idempotência e cadastra notas de entrada.
 */

import { Worker, Job } from "bullmq";
import { redisConnection } from "@/lib/queue";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { getFocusBaseUrl, downloadFocusNfeDocument } from "@/lib/services/focusNfe";
import { parseNfeXml } from "@/lib/services/xmlParser";
import { uploadInvoiceXml } from "@/lib/storage";
import { StatusConta, StatusNota, TipoNota } from "@prisma/client";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ProcessMdeResult {
  newInvoicesImported: number;
  duplicatesSkipped: number;
}

export interface SyncCycleResult {
  tenantsChecked: number;
  newInvoicesImported: number;
  duplicatesSkipped: number;
}

/**
 * Processa um lote de itens MDe recebidos para um tenant, com deduplicação estrita
 */
export async function processTenantMdeItems(
  tenant: {
    id: string;
    lastMdeVersao: bigint;
    ambiente?: any;
    focusNfeTokenProducao?: string | null;
    focusNfeTokenHomologacao?: string | null;
  },
  items: any[],
  customDb?: {
    invoice: { findFirst: (args: any) => Promise<any>; create: (args: any) => Promise<any> };
    partner: { findFirst: (args: any) => Promise<any>; create: (args: any) => Promise<any> };
    auditLog?: { create: (args: any) => Promise<any> };
  },
  skipDownload: boolean = false
): Promise<ProcessMdeResult> {
  const db = customDb || (prismaAdmin as any);
  let newInvoicesImported = 0;
  let duplicatesSkipped = 0;

  const token =
    tenant.ambiente === "PRODUCAO"
      ? tenant.focusNfeTokenProducao
      : tenant.focusNfeTokenHomologacao;

  if (!token) {
    console.warn(`[syncInvoicesWorker] Tenant ${tenant.id} sem token Focus NFe configurado para ${tenant.ambiente}. Pulando download de arquivos.`);
    return { newInvoicesImported: 0, duplicatesSkipped: items.length };
  }

  for (const item of items) {
    const chaveAcesso = item.chave_nfe || item.chave;
    if (!chaveAcesso) continue;

    // DEDUPLICAÇÃO ESTRITA: Verifica se a nota já foi cadastrada anteriormente
    const existingInvoice = await db.invoice.findFirst({
      where: {
        OR: [
          { chaveAcesso },
          { idempotencyKey: `mde_${tenant.id}_${chaveAcesso}` },
        ],
      },
    });

    if (existingInvoice) {
      duplicatesSkipped++;
      continue; // Pula sem duplicar!
    }

    // Cadastra ou vincula a fábrica parceira emitente
    let partnerId: string | null = null;
    const cnpjEmitente = (item.cnpj_emitente || "").replace(/\D/g, "");

    if (cnpjEmitente) {
      let partner = await db.partner.findFirst({
        where: {
          tenantId: tenant.id,
          cnpj: cnpjEmitente,
        },
      });

      if (!partner) {
        partner = await db.partner.create({
          data: {
            tenantId: tenant.id,
            razaoSocial: item.nome_emitente || "Fábrica Parceira",
            cnpj: cnpjEmitente,
          },
        });
      }

      partnerId = partner.id;
    }

    // Tenta baixar o XML e extrair os itens detalhados para deixar pronto para inversão
    let xmlUrl: string | null = null;
    let parsedXml: any = null;

    if (!skipDownload && item.caminho_xml && token) {
      try {
        const xmlDownload = await downloadFocusNfeDocument(item.caminho_xml, token, tenant.ambiente || "HOMOLOGACAO");
        if (xmlDownload.success && xmlDownload.buffer) {
          const xmlContent = xmlDownload.buffer.toString("utf-8");
          xmlUrl = await uploadInvoiceXml(tenant.id, chaveAcesso, xmlContent);
          parsedXml = parseNfeXml(xmlContent);
        }
      } catch (xmlErr) {
        console.warn(`[syncInvoicesWorker] Aviso ao baixar XML da nota ${chaveAcesso}:`, xmlErr);
      }
    }

    // Cria a nota fiscal de entrada
    const numero = parsedXml?.numero || parseInt(item.numero || "0", 10);
    const serie = parsedXml?.serie || parseInt(item.serie || "1", 10);
    const valorTotal = parsedXml?.valorTotal || parseFloat(item.valor_total || item.valor || "0");
    const dataEmissao = parsedXml?.dataEmissao || (item.data_emissao ? new Date(item.data_emissao) : new Date());

    const invoice = await db.invoice.create({
      data: {
        tenantId: tenant.id,
        numero,
        serie,
        chaveAcesso,
        tipo: TipoNota.ENTRADA,
        finalidade: "Remessa para Industrializacao por Encomenda",
        status: StatusNota.AUTORIZADA,
        valorTotal,
        dataEmissao,
        xmlUrl,
        partnerId,
        idempotencyKey: `mde_${tenant.id}_${chaveAcesso}`,
        rawJson: {
          itemOriginal: item,
          itens: parsedXml?.itens || [],
          emitente: parsedXml?.emitente || { razaoSocial: item.nome_emitente, cnpj: cnpjEmitente },
        },
      },
    });

    if (db.auditLog?.create) {
      try {
        await db.auditLog.create({
          data: {
            tenantId: tenant.id,
            actorType: "SYSTEM",
            actorId: "BULLMQ_SYNC_WORKER",
            acao: "NFE_ENTRADA_SINCRONIZADA_MDE",
            entidade: "Invoice",
            entidadeId: invoice.id,
            detalhe: {
              numero,
              chaveAcesso,
              fabrica: item.nome_emitente,
            },
          },
        });
      } catch (auditErr) {
        // Silencia erro de auditoria para não interromper ingestão
      }
    }

    newInvoicesImported++;
  }

  return {
    newInvoicesImported,
    duplicatesSkipped,
  };
}

/**
 * Executa um ciclo completo de sincronização de MDe para todos os tenants ativos
 */
export async function runSyncInvoicesCycle(): Promise<SyncCycleResult> {
  const tenants = await prismaAdmin.tenant.findMany({
    where: {
      statusConta: StatusConta.ATIVO,
      focusNfeIdEmpresa: { not: null },
    },
  });

  let totalNew = 0;
  let totalDuplicates = 0;

  for (const tenant of tenants) {
    try {
      const baseUrl = getFocusBaseUrl(tenant.ambiente);
      const token =
        tenant.ambiente === "PRODUCAO"
          ? tenant.focusNfeTokenProducao
          : tenant.focusNfeTokenHomologacao;

      if (!token) {
        console.warn(`[syncInvoicesWorker] Tenant ${tenant.id} (${tenant.cnpj}) sem token Focus NFe configurado para ${tenant.ambiente}. Pulando sincronização MDe.`);
        continue;
      }

      const cleanCnpj = tenant.cnpj.replace(/\D/g, "");
      const versaoCursor = tenant.lastMdeVersao.toString();

      const url = `${baseUrl}/v2/nfes_recebidas?cnpj=${cleanCnpj}&versao=${versaoCursor}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        console.warn(`[syncInvoicesWorker] Focus NFe retornou HTTP ${res.status} para o CNPJ ${cleanCnpj}`);
        continue;
      }

      // Cursor de versão para próxima busca incremental
      const maxVersionHeader = res.headers.get("x-max-version") || res.headers.get("X-Max-Version");
      const json = await res.json();
      const items: any[] = Array.isArray(json) ? json : json.itens || json.notas || [];

      // Processa o lote de notas com deduplicação
      const batchResult = await processTenantMdeItems(tenant, items);
      totalNew += batchResult.newInvoicesImported;
      totalDuplicates += batchResult.duplicatesSkipped;

      // Atualiza o cursor lastMdeVersao
      if (maxVersionHeader) {
        const newVersion = BigInt(maxVersionHeader);
        if (newVersion > tenant.lastMdeVersao) {
          await prismaAdmin.tenant.update({
            where: { id: tenant.id },
            data: { lastMdeVersao: newVersion },
          });
        }
      }

      // Delay de segurança para rate-limiting entre chamadas de tenants
      await sleep(600);
    } catch (err: any) {
      console.error(`[syncInvoicesWorker] Erro ao sincronizar tenant ${tenant.id}:`, err);
    }
  }

  return {
    tenantsChecked: tenants.length,
    newInvoicesImported: totalNew,
    duplicatesSkipped: totalDuplicates,
  };
}

/**
 * Cria o Worker BullMQ para a fila `sync-invoices`
 */
export function createSyncInvoicesWorker() {
  return new Worker(
    "sync-invoices",
    async (job: Job) => {
      console.log(`[syncInvoicesWorker] Iniciando job de sincronização ${job.id}...`);
      const result = await runSyncInvoicesCycle();
      console.log(`[syncInvoicesWorker] Sincronização concluída:`, result);
      return result;
    },
    {
      connection: redisConnection,
      concurrency: 1, // Concorrência 1 para garantir sincronização sequencial sem race conditions
    }
  );
}
