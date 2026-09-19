import { PrismaClient } from "@prisma/client";
import { prismaAdmin } from "./prismaAdmin";

/**
 * Cria um cliente Prisma fortemente isolado para um tenant específico.
 * Utiliza o Prisma Client Extension ($extends) para forçar o scoping de tenantId
 * em todas as consultas e operações dos modelos do tenant, prevenindo vazamento de dados.
 */
export function createTenantPrisma(tenantId: string) {
  return prismaAdmin.$extends({
    query: {
      partner: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findUnique({ args, query }) {
          const res = await query(args);
          if (res && (res as any).tenantId && (res as any).tenantId !== tenantId) {
            return null;
          }
          return res;
        },
        async count({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...(args.data as any), tenantId };
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
      invoice: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findUnique({ args, query }) {
          const res = await query(args);
          if (res && (res as any).tenantId && (res as any).tenantId !== tenantId) {
            return null;
          }
          return res;
        },
        async count({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...(args.data as any), tenantId };
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
      cfopRule: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findUnique({ args, query }) {
          const res = await query(args);
          if (res && (res as any).tenantId && (res as any).tenantId !== tenantId) {
            return null;
          }
          return res;
        },
        async count({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...(args.data as any), tenantId };
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
      notificationRecipient: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findUnique({ args, query }) {
          const res = await query(args);
          if (res && (res as any).tenantId && (res as any).tenantId !== tenantId) {
            return null;
          }
          return res;
        },
        async count({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...(args.data as any), tenantId };
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
      partnerPriceHistory: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findUnique({ args, query }) {
          const res = await query(args);
          if (res && (res as any).tenantId && (res as any).tenantId !== tenantId) {
            return null;
          }
          return res;
        },
        async create({ args, query }) {
          args.data = { ...(args.data as any), tenantId };
          return query(args);
        },
        async upsert({ args, query }) {
          args.create = { ...(args.create as any), tenantId };
          args.update = { ...(args.update as any), tenantId };
          return query(args);
        },
      },
      auditLog: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...(args.data as any), tenantId };
          return query(args);
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof createTenantPrisma>;
