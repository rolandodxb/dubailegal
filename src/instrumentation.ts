/**
 * Runs once when the server process starts, before the first request.
 *
 * The database is a network away, so opening a connection costs about 790 ms of
 * TCP, TLS and pooler authentication, while a query on an open connection costs
 * the round trip alone — 58 ms to São Paulo. Warming the pool here rather than on
 * the first request means nobody's first page view pays for it.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { warmPool, keepPoolAlive, isCloudflareWorkers } = await import('@/lib/db');
  // On Workers there is no long-lived connection pool to warm: each isolate
  // connects through the driver on first use and is discarded with it.
  if (isCloudflareWorkers()) return;

  await warmPool();
  keepPoolAlive();
}
