// import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
  prismaPgPool?: pg.Pool;
};

const globalForPrisma = globalThis as PrismaGlobal;

if (!globalForPrisma.prismaPgPool) {
  globalForPrisma.prismaPgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg(globalForPrisma.prismaPgPool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;

