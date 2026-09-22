/**
 * Where to send somebody after they sign in.
 *
 * Only a path on this site is honoured, and only a single-slash path: `//evil`
 * is a protocol-relative URL, so accepting it would turn a sign-in link into an
 * open redirect that could be used to phish the person who followed it.
 */
export function safeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('\\')) return fallback;
  return trimmed;
}
