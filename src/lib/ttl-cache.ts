/**
 * A short-lived in-process cache.
 *
 * The database is a network away — 57 ms per round trip to São Paulo — so the
 * cheapest query is the one that is not made. This caches the reads that are
 * public, identical for everybody, and change slowly: the published directory,
 * the facet counts behind its filters, the community's topic counts, the landing
 * page's totals.
 *
 * It deliberately does **not** cache anything belonging to a signed-in member —
 * cases, payments, alerts, messages, documents — because those must be current.
 *
 * Two properties make it safe to use on a long-running server:
 *
 *   · a failed load is not cached, so an error is retried rather than remembered;
 *   · concurrent callers share one in-flight promise, so ten people opening the
 *     directory at once cause one query rather than ten.
 *
 * The TTLs are short (seconds), because a listing published a moment ago should
 * appear a moment later.
 */
type Entry = { value: unknown; expiresAt: number };

const globalForCache = globalThis as unknown as {
  __dubaiLegalCache?: Map<string, Entry>;
  __dubaiLegalInFlight?: Map<string, Promise<unknown>>;
};

const store = (globalForCache.__dubaiLegalCache ??= new Map<string, Entry>());
const inFlight = (globalForCache.__dubaiLegalInFlight ??= new Map<string, Promise<unknown>>());

/**
 * Set `DISABLE_READ_CACHE=1` to bypass the cache entirely.
 *
 * The end-to-end suites write fixtures to the database **from their own
 * process**, which an in-process cache cannot be told about, so they run with it
 * off and exercise the real queries. Everything else runs with it on.
 */
const disabled = process.env.DISABLE_READ_CACHE === '1';

export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  if (disabled) return load();

  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const running = inFlight.get(key) as Promise<T> | undefined;
  if (running) return running;

  const promise = load()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/** Drops one entry, or every entry whose key starts with a prefix. */
export function invalidate(prefix: string): void {
  for (const key of [...store.keys()]) {
    if (key === prefix || key.startsWith(prefix)) store.delete(key);
  }
}

/** How many entries are held, for the check that the cache is doing its job. */
export function cacheSize(): number {
  return store.size;
}
