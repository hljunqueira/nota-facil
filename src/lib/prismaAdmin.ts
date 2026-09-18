import { PrismaClient } from "@prisma/client";

const globalForPrismaAdmin = globalThis as unknown as {
  prismaAdmin: PrismaClient | undefined;
};

export const prismaAdmin =
  globalForPrismaAdmin.prismaAdmin ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrismaAdmin.prismaAdmin = prismaAdmin;
}

export default prismaAdmin;
