import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './env';

/** 256 bits of entropy, URL-safe. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Tokens are stored only as a SHA-256 digest, so a leaked database read cannot
 * be replayed as a session or a password-reset link.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Keyed digest used for values we must compare but must not store in clear. */
export function keyedDigest(value: string): string {
  return createHmac('sha256', env.appSecret).update(value).digest('hex');
}

/** IP addresses are only ever stored hashed. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return keyedDigest(`ip:${ip}`).slice(0, 32);
}

export function sha256Hex(buffer: Buffer | Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/** Length-safe, constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
