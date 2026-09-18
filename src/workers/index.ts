/**
 * Master Worker Runner — SaaS B2B "Nota Fácil"
 * Inicializa e gerencia os workers BullMQ e agendamentos periódicos (Cron).
 */

import { syncInvoicesQueue } from "@/lib/queue";
import { createSyncInvoicesWorker } from "./syncInvoicesWorker";
import { createMonthlyCloseWorker } from "./monthlyCloseWorker";

async function bootstrap() {
  console.log("==================================================");
  console.log("🚀 [Nota Fácil Worker] Inicializando Background Runners...");
  console.log("==================================================");

  // Inicializa worker de sincronização MDe
  const syncWorker = createSyncInvoicesWorker();
  const monthlyWorker = createMonthlyCloseWorker();

  syncWorker.on("completed", (job) => {
    console.log(`[Worker:sync-invoices] Job ${job.id} concluído com sucesso.`);
  });

  syncWorker.on("failed", (job, err) => {
    console.error(`[Worker:sync-invoices] Job ${job?.id} falhou:`, err);
  });

  monthlyWorker.on("completed", (job) => {
    console.log(`[Worker:monthly-close] Job ${job.id} concluído com sucesso.`);
  });

  monthlyWorker.on("failed", (job, err) => {
    console.error(`[Worker:monthly-close] Job ${job?.id} falhou:`, err);
  });

  // Agendamento periódico de sincronização MDe (a cada 2 horas)
  try {
    await syncInvoicesQueue.add(
      "periodic-sync-mde",
      {},
      {
        repeat: {
          pattern: "0 */2 * * *", // A cada 2 horas no minuto 0
        },
        jobId: "scheduled-mde-sync",
      }
    );
    console.log("⏰ [Worker] Agendamento de sincronização MDe registrado: a cada 2 horas (0 */2 * * *).");
  } catch (scheduleErr) {
    console.warn("⚠️ [Worker] Aviso ao registrar agendamento no Redis:", scheduleErr);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 [Worker] Sinal ${signal} recebido. Encerrando graciosamente...`);
    try {
      await Promise.all([syncWorker.close(), monthlyWorker.close()]);
      console.log("✅ [Worker] Workers encerrados.");
      process.exit(0);
    } catch (err) {
      console.error("❌ [Worker] Erro ao encerrar workers:", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("❌ [Worker] Falha fatal ao iniciar worker:", err);
  process.exit(1);
});
