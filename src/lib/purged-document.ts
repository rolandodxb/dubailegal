/**
 * The name a document is left with once its evidence has been destroyed.
 *
 * Kept in its own module, free of server imports, because the components that
 * *display* a document also have to recognise this value — and those run in the
 * browser, where the purge service (which reaches the database and the storage
 * backend) must never be pulled in.
 */
export const PURGED_DOCUMENT_NAME = 'purged after verification';

/** True when the stored name is the marker rather than a file somebody uploaded. */
export function isPurgedDocument(fileName: string | null | undefined): boolean {
  return fileName === PURGED_DOCUMENT_NAME;
}
