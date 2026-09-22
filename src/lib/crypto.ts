import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { env } from './env';

/**
 * Encryption at rest, in the application.
 *
 * Two things in this product are encrypted before they touch the disk or the
 * database: every uploaded file, and the text of every case message. Both are
 * encrypted with AES-256-GCM under a key that lives in the environment and
 * nowhere else, so a copy of the upload directory, a database dump or a stolen
 * backup is not a copy of anybody's papers or conversations.
 *
 * What this does **not** claim: it is not end-to-end encryption. The application
 * server holds the key, because it has to serve the file to its owner. End-to-end
 * would mean the key never reaches the server, and nothing in this build does
 * that. The wording the interface uses says what is true and no more.
 *
 * The format is versioned:
 *   files   — the bytes "DLE1" followed by 12 random bytes of nonce, the
 *             ciphertext, and the 16-byte authentication tag.
 *   strings — the prefix "dle1:" followed by base64 of nonce | ciphertext | tag.
 * Anything without that marker is legacy plaintext and is read as-is, so
 * existing uploads and messages keep working.
 */

const FILE_MAGIC = Buffer.from('DLE1', 'ascii');
const STRING_PREFIX = 'dle1:';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

/**
 * The key.
 *
 * A 32-byte key, base64, from ENCRYPTION_KEY. When it is absent — a development
 * machine, a test run — one is derived from the session secret so that the
 * application still works, and the fact that it is derived rather than supplied
 * is reported by `encryptionKeySource()` so the interface can say so.
 */
function key(): Buffer {
  if (env.encryptionKey) {
    const decoded = Buffer.from(env.encryptionKey, 'base64');
    if (decoded.length === 32) return decoded;
    // A key of the wrong length is a misconfiguration, not a reason to run
    // unencrypted: it is stretched to 32 bytes rather than ignored.
    return createHash('sha256').update(decoded).digest();
  }
  return createHash('sha256').update(`dubai-legal:${env.appSecret}`).digest();
}

/** Whether the key came from the environment or was derived from the session secret. */
export function encryptionKeySource(): 'environment' | 'derived' {
  const decoded = env.encryptionKey ? Buffer.from(env.encryptionKey, 'base64') : null;
  return decoded && decoded.length === 32 ? 'environment' : 'derived';
}

/** True when these bytes were written by `encryptBytes`. */
export function isEncrypted(payload: Buffer): boolean {
  return payload.length > FILE_MAGIC.length + NONCE_BYTES + TAG_BYTES && payload.subarray(0, 4).equals(FILE_MAGIC);
}

export function encryptBytes(plain: Uint8Array): Buffer {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key(), nonce);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plain)), cipher.final()]);
  return Buffer.concat([FILE_MAGIC, nonce, ciphertext, cipher.getAuthTag()]);
}

export function decryptBytes(payload: Buffer): Buffer {
  if (!isEncrypted(payload)) return payload;
  const nonce = payload.subarray(FILE_MAGIC.length, FILE_MAGIC.length + NONCE_BYTES);
  const tag = payload.subarray(payload.length - TAG_BYTES);
  const ciphertext = payload.subarray(FILE_MAGIC.length + NONCE_BYTES, payload.length - TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key(), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/** True when this text was written by `encryptText`. */
export function isEncryptedText(value: string): boolean {
  return value.startsWith(STRING_PREFIX);
}

/**
 * Encrypts a string for storage in a text column.
 *
 * Used for the body of a case message. The database then holds nothing readable
 * about what a client and their lawyer said to each other — which matters,
 * because a conversation between them may be privileged.
 */
export function encryptText(plain: string): string {
  return STRING_PREFIX + encryptBytes(Buffer.from(plain, 'utf8')).toString('base64');
}

export function decryptText(value: string): string {
  if (!isEncryptedText(value)) return value;
  try {
    return decryptBytes(Buffer.from(value.slice(STRING_PREFIX.length), 'base64')).toString('utf8');
  } catch {
    // A value that cannot be decrypted — a key that was rotated without a
    // migration — must not take a page down with it.
    return '[This message could not be decrypted with the current key.]';
  }
}

/** Constant-time comparison, for anything secret that arrives from outside. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
