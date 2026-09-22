import { PrismaClient } from '@prisma/client';

/**
 * Single PrismaClient instance for the whole process.
 *
 * Cached on `globalThis` **in production as well as in development**, and that
 * matters more than it looks: Next.js bundles server code per route, so the same
 * module can be loaded more than once in one process. Without the global cache
 * each copy built its own client and therefore its own connection pool, which
 * exhausted Supabase's session pooler — it serves only 15 clients in total — and
 * made connection use unpredictable. One client, one pool, whatever the bundler
 * does.
 */
const globalForPrisma = globalThis as unknown as { __dubaiLegalPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.__dubaiLegalPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
  });

globalForPrisma.__dubaiLegalPrisma = prisma;

/**
 * Keep the connection pool open.
 *
 * When PostgreSQL is a network away — Supabase in another region — opening a
 * connection costs the handshake: measured on this installation, about **790 ms**
 * for the first query of a new connection (TCP, TLS and pooler authentication),
 * against **58 ms** for a query on a connection that is already open.
 *
 * Prisma opens connections lazily, as concurrency demands them, which meant the
 * first parallel page after every restart paid several handshakes at once, and so
 * did the first page after the pooler closed an idle connection. Warming the pool
 * once at startup removes the first; a periodic ping removes the second, because
 * a connection that is never idle is never closed.
 *
 * Both are best-effort: a failure here is not a failure of the application, which
 * will surface any real problem on the request that needs the database.
 *
 * The number is deliberately below `connection_limit` in DATABASE_URL: Supabase's
 * session pooler serves at most 15 clients in total, and exhausting it makes new
 * connections fail outright, which is worse than an occasional handshake.
 */
const WARM_CONNECTIONS = Number(process.env.DB_WARM_CONNECTIONS ?? 4);
const KEEPALIVE_MS = Number(process.env.DB_KEEPALIVE_MS ?? 45_000);

/** Pings the database a few times, so the connections are open and paid for. */
export async function warmPool(): Promise<void> {
  if (WARM_CONNECTIONS <= 0) return;
  await Promise.all(
    Array.from({ length: WARM_CONNECTIONS }, () =>
      prisma.$queryRaw`select 1`.catch(() => undefined),
    ),
  );
}

/** Keeps them open, so an idle period does not bring the handshake back. */
export function keepPoolAlive(): void {
  setInterval(() => {
    void Promise.all(
      Array.from({ length: Math.min(WARM_CONNECTIONS, 4) }, () =>
        prisma.$queryRaw`select 1`.catch(() => undefined),
      ),
    );
  }, KEEPALIVE_MS).unref();
}

/** Only inside the Next.js server: not in scripts, not during a build. */
const isServerRuntime =
  process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PHASE !== 'phase-production-build';

// Warming is done once from src/instrumentation.ts at server start, not here:
// this module can be loaded several times per process, and each copy would
// otherwise warm (and re-open) the pool again.
if (!isServerRuntime) {
  void warmPool();
}
