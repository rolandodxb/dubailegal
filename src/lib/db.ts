import { PrismaClient } from '@prisma/client';

/**
 * Single PrismaClient instance. In development Next.js hot-reloads modules, so
 * the client is cached on globalThis to avoid exhausting connections.
 */
const globalForPrisma = globalThis as unknown as { __dubaiLegalPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.__dubaiLegalPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__dubaiLegalPrisma = prisma;
}
