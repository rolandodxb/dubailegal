import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { env } from './env';
import { decryptBytes, encryptBytes, isEncrypted } from './crypto';
import { sha256Hex } from './tokens';
import {
  ALLOWED_CHAT_EXTENSIONS,
  ALLOWED_CHAT_MIME_TYPES,
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_CHAT_ATTACHMENT_BYTES,
  MAX_UPLOAD_BYTES,
} from './constants';

export type StoredFile = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
};

/** Thrown with a message that is safe to show the user verbatim. */
export class UploadRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadRejected';
  }
}

/**
 * What a file actually is, from its first bytes.
 *
 * The declared type and the extension are never trusted on their own: a file
 * that says it is a PDF but starts with something else is refused. Archives are
 * recognised because a case conversation is where a client and their lawyer send
 * each other bundles, and every one of them is served as a download rather than
 * rendered, which is what makes accepting them safe.
 */
function detectMimeType(bytes: Uint8Array): string | null {
  const startsWith = (...values: number[]) => values.every((value, index) => bytes[index] === value);

  if (startsWith(0x25, 0x50, 0x44, 0x46)) return 'application/pdf'; // %PDF
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (
    bytes.length >= 12 &&
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'; // RIFF....WEBP
  }

  // ── Archives and bundles ────────────────────────────────────────────────
  if (startsWith(0x50, 0x4b, 0x03, 0x04) || startsWith(0x50, 0x4b, 0x05, 0x06)) {
    // Also what a .docx, .xlsx, .pptx and .odt file is underneath: a zip.
    return 'application/zip';
  }
  if (startsWith(0x52, 0x61, 0x72, 0x21, 0x1a, 0x07)) return 'application/vnd.rar';
  if (startsWith(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c)) return 'application/x-7z-compressed';
  if (startsWith(0x1f, 0x8b)) return 'application/gzip';
  if (
    bytes.length > 262 &&
    bytes[257] === 0x75 &&
    bytes[258] === 0x73 &&
    bytes[259] === 0x74 &&
    bytes[260] === 0x61
  ) {
    return 'application/x-tar'; // "ustar" at offset 257
  }

  // ── Media ───────────────────────────────────────────────────────────────
  // What MediaRecorder produces, and what a client sends when they film
  // something. Recognised by container, so a call recording is stored as a
  // recording rather than refused as an unreadable file.
  if (startsWith(0x1a, 0x45, 0xdf, 0xa3)) return 'video/webm'; // EBML: WebM, Matroska
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  ) {
    // ....ftyp: MP4, M4A, 3GP
    return 'video/mp4';
  }
  if (startsWith(0x4f, 0x67, 0x67, 0x53)) return 'video/ogg'; // OggS

  // Plain text, but only if it really is text: no NUL bytes, and nothing that
  // could be served as markup.
  const sample = bytes.subarray(0, 1024);
  const looksTextual =
    sample.length > 0 &&
    !sample.includes(0) &&
    sample.every(
      (byte) =>
        byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126) || byte > 160,
    );
  if (looksTextual) return 'text/plain';

  return null;
}

export function uploadDirAbsolute(): string {
  return path.resolve(process.cwd(), env.uploadDir);
}

/**
 * Resolves a storage key to an absolute path, refusing anything that would
 * escape the upload directory.
 */
export function resolveStoragePath(storageKey: string): string {
  const base = uploadDirAbsolute();
  const resolved = path.resolve(base, storageKey);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new UploadRejected('Invalid document reference.');
  }
  return resolved;
}

export type StoreOptions = {
  /**
   * Accept bundles and office files as well as documents and images: what a case
   * conversation allows. The evidence store does not, because a verification
   * reviewer has no use for a zip of somebody's emails.
   */
  allowArchives?: boolean;
};

/**
 * Persists an uploaded file.
 *
 * The declared content type is not trusted: the file signature must match an
 * allowed type, so a renamed executable cannot be stored behind an image content
 * type. What is written to disk is **encrypted**, so a copy of the upload
 * directory is not a copy of anybody's papers.
 */
export async function storeUpload(
  file: File,
  ownerUserId: string,
  options: StoreOptions = {},
): Promise<StoredFile> {
  const allowArchives = options.allowArchives === true;
  const maxBytes = allowArchives ? MAX_CHAT_ATTACHMENT_BYTES : MAX_UPLOAD_BYTES;
  const extensions: readonly string[] = allowArchives
    ? ALLOWED_CHAT_EXTENSIONS
    : ALLOWED_UPLOAD_EXTENSIONS;
  const mimeTypes: readonly string[] = allowArchives ? ALLOWED_CHAT_MIME_TYPES : ALLOWED_UPLOAD_MIME_TYPES;

  if (!file || typeof file === 'string' || file.size === 0) {
    throw new UploadRejected('The selected file is empty.');
  }
  if (file.size > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new UploadRejected(`Files must be ${limitMb} MB or smaller.`);
  }

  const originalName = file.name || 'document';
  const extension = path.extname(originalName).toLowerCase();
  if (!extensions.includes(extension)) {
    throw new UploadRejected(
      `Unsupported file type "${extension || 'unknown'}". Allowed: ${extensions.join(', ')}.`,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectMimeType(bytes);
  if (detected === null) {
    throw new UploadRejected(
      allowArchives
        ? 'That file could not be read. Documents, images, spreadsheets, text and archives are accepted.'
        : 'That file is not a readable PDF, JPEG, PNG or WebP image.',
    );
  }
  if (!mimeTypes.includes(detected)) {
    throw new UploadRejected(`File type ${detected} is not accepted.`);
  }

  // The detected type wins; a mismatched client-declared type is noted, not obeyed.
  const mimeType = detected;

  const storageKey = `${ownerUserId}/${randomBytes(16).toString('hex')}${extension}`;
  const absolute = resolveStoragePath(storageKey);
  await mkdir(path.dirname(absolute), { recursive: true });

  // The digest is of the file as uploaded, before anything is done to it, so it
  // still identifies the document the person is holding.
  const sha256 = sha256Hex(bytes);
  await writeFile(absolute, encryptBytes(bytes), { mode: 0o600 });

  return {
    storageKey,
    fileName: originalName.slice(0, 200),
    mimeType,
    sizeBytes: bytes.byteLength,
    sha256,
  };
}

/**
 * Reads a stored file back.
 *
 * Files written by this version are encrypted; anything written before it is not,
 * and both are served, so no document that was already uploaded stops working.
 */
export async function readUpload(storageKey: string): Promise<Buffer> {
  const raw = await readFile(resolveStoragePath(storageKey));
  return isEncrypted(raw) ? decryptBytes(raw) : raw;
}

/** Removes the file from disk. Missing files are not an error. */
export async function deleteUpload(storageKey: string): Promise<void> {
  try {
    await unlink(resolveStoragePath(storageKey));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw error;
  }
}
