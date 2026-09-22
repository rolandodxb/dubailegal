import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * OpenNext Cloudflare configuration.
 *
 * Incremental static regeneration is left off deliberately. Every page in this
 * application depends on who is signed in, so there is nothing static to
 * revalidate — the caching that matters is the short-lived read cache in
 * `src/lib/ttl-cache.ts`, which lives in the Worker's memory.
 */
export default defineCloudflareConfig({});
