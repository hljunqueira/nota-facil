import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6380";

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
    // Retry incremental com limite
    return Math.min(times * 100, 3000);
  },
});

// Fila de Sincronização Periódica de Notas Recebidas (MDe)
export const syncInvoicesQueue = new Queue("sync-invoices", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

// Fila de Mensageria (WhatsApp + E-mail)
export const notificationsQueue = new Queue("notifications", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: 500,
    removeOnFail: 500,
  },
});

// Fila de Fechamento Mensal do Contador (Empacotamento ZIP e E-mail)
export const monthlyCloseQueue = new Queue("monthly-close", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 50,
    removeOnFail: 50,
  },
});
