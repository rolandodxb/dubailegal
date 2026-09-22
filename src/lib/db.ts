import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

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

/**
 * Whether the database connection is made by a driver adapter rather than
 * Prisma's own engine.
 *
 * The default engine is a native binary, which cannot run inside a V8 isolate —
 * so on Cloudflare Workers the client has to speak the PostgreSQL wire protocol
 * itself, through `@prisma/adapter-pg` over the runtime's TCP sockets. The same
 * path can be forced anywhere with `DB_DRIVER=pg`, which is how it is tested
 * without a Workers account.
 */
function useDriverAdapter(): boolean {
  return isCloudflareWorkers() || process.env.DB_DRIVER === 'pg';
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (useDriverAdapter() && url) {
    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: url, max: 5 }),
      log: ['warn', 'error'],
    });
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
  });
}

/**
 * The client is created on **first use**, not when this module is loaded.
 *
 * That matters on Cloudflare Workers, where the environment bindings are placed
 * into `process.env` per request rather than at module scope. Creating the client
 * at import time there found no `DATABASE_URL`, fell through to Prisma's own
 * engine, and every page failed with "could not locate the Query Engine" — the
 * one thing that cannot work inside a V8 isolate. Reading the environment when a
 * request actually needs the database removes the whole class of problem.
 *
 * It is also slightly better on Node: a process that never queries never
 * connects.
 */
let client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (!client) {
    client = globalForPrisma.__dubaiLegalPrisma ?? createClient();
    globalForPrisma.__dubaiLegalPrisma = client;
  }
  return client;
}

/**
 * A proxy rather than the client itself, so `prisma.user.findMany()` and
 * `prisma.$queryRaw` resolve the client at call time. Every call site keeps
 * compiling and reading exactly as before.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const active = getClient() as unknown as Record<string | symbol, unknown>;
    const value = active[property];
    return typeof value === 'function' ? value.bind(active) : value;
  },
  has(_target, property) {
    return property in (getClient() as unknown as object);
  },
}) as PrismaClient;



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

/**
 * Keeps them open, so an idle period does not bring the handshake back.
 *
 * Node.js only. A Workers isolate is created and discarded per request (or per
 * burst), so there is nothing to keep alive and an interval would be refused.
 */
export function keepPoolAlive(): void {
  if (isCloudflareWorkers()) return;
  setInterval(() => {
    void Promise.all(
      Array.from({ length: Math.min(WARM_CONNECTIONS, 4) }, () =>
        prisma.$queryRaw`select 1`.catch(() => undefined),
      ),
    );
  }, KEEPALIVE_MS).unref();
}

/**
 * Whether this is running on Cloudflare Workers.
 *
 * Workerd identifies itself in the user agent, which is the one check that works
 * without importing a Cloudflare-only module.
 */
export function isCloudflareWorkers(): boolean {
  // `WebSocketPair` exists only in workerd. It is a better signal than the user
  // agent, which is not set to `Cloudflare-Workers` under `wrangler dev` — and
  // getting this wrong is not cosmetic: without the adapter the client tries to
  // load Prisma's native query engine, which cannot exist in a V8 isolate, and
  // every page fails with "could not locate the Query Engine".
  if (typeof (globalThis as Record<string, unknown>).WebSocketPair !== 'undefined') return true;
  return typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
}

/** Only inside the Node.js server: not in scripts, not during a build. */
const isServerRuntime =
  process.env.NEXT_RUNTIME === 'nodejs' &&
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  !isCloudflareWorkers();

// Warming is done once from src/instrumentation.ts at server start, not here:
// this module can be loaded several times per process, and each copy would
// otherwise warm (and re-open) the pool again.
if (!isServerRuntime) {
  void warmPool();
}
