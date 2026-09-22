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

  const { warmPool, keepPoolAlive } = await import('@/lib/db');
  await warmPool();
  keepPoolAlive();
}
