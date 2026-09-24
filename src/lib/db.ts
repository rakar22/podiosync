import { PrismaClient } from "@prisma/client";
// @ts-expect-error shared CJS bootstrap used by server.js before Prisma connects
import { applyDatabaseEnv } from "../../scripts/database-url.cjs";

applyDatabaseEnv(process.env, process.cwd());

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
