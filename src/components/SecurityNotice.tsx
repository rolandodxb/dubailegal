import { encryptionKeySource } from '@/lib/crypto';
import { Alert } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

/**
 * What is encrypted, and what that does and does not mean.
 *
 * The claim on the screen has to match what the code does, so this reads the
 * actual state of the key rather than asserting a feature. Both sentences below
 * are true of this build: files and message bodies are encrypted with
 * AES-256-GCM before they reach the disk or the database, and the server holds
 * the key because it has to give the file back to its owner. Calling that
 * end-to-end encryption would be a lie.
 */
export function EncryptionNotice({
  subject = 'Documents and conversations',
  className,
}: {
  subject?: string;
  className?: string;
}) {
  const derived = encryptionKeySource() === 'derived';

  return (
    <Alert tone="info" className={className} title={`${subject} are encrypted`}>
      <p>
        Every file you upload, every file sent through a case conversation and every message is
        encrypted with AES-256-GCM before it is written to disk or to the database. A copy of the
        storage directory or a database dump is not a copy of your papers or your conversations.
        Access is separate from encryption: only you and the people on your case can open them, and
        an administrator cannot read a case conversation at all.
      </p>
      <p className="mt-2">
        This is encryption at rest, not end-to-end encryption. The server holds the key, because it
        has to hand your own file back to you.
      </p>
      {derived ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs">
          <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0" />
          <span>
            This installation is running on a key derived from APP_SECRET. Set{' '}
            <code className="font-mono">ENCRYPTION_KEY</code> before going live, and keep a copy of
            it somewhere safe: without it, uploaded files and messages cannot be read again.
          </span>
        </p>
      ) : null}
    </Alert>
  );
}
