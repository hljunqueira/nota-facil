/**
 * Worker BullMQ de Geração Mensal de Cobranças (Boleto/Pix) no Asaas
 * Executado todo dia 1º do mês para emitir a fatura com vencimento fixo no dia 10.
 */

import { Worker, Job } from "bullmq";
import { redisConnection } from "@/lib/queue";
import { generateMonthlyChargesForAllActiveTenants } from "@/lib/services/asaas";

export function createMonthlyBillingWorker() {
  const worker = new Worker(
    "billing",
    async (job: Job) => {
      console.log(`[Worker:billing] Iniciando job ${job.name} (ID: ${job.id})...`);
      const result = await generateMonthlyChargesForAllActiveTenants();
      console.log(
        `[Worker:billing] Faturamento mensal concluído: ${result.createdCount} faturas geradas, ${result.skippedCount} já existentes (Total: ${result.totalTenants} oficinas).`
      );
      return result;
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );

  return worker;
}
