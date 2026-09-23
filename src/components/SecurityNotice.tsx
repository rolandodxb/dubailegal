import { encryptionKeySource } from '@/lib/crypto';
import { getI18n } from '@/lib/i18n';
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
export async function EncryptionNotice({
  subject,
  className,
}: {
  subject?: string;
  className?: string;
}) {
  const { t } = await getI18n();
  const labels = t.publicPages.securityNotice;
  const derived = encryptionKeySource() === 'derived';
  const heading = subject ?? labels.defaultSubject;

  return (
    <Alert
      tone="info"
      className={className}
      title={labels.title.replace('{subject}', heading)}
    >
      <p>{labels.body}</p>
      <p className="mt-2">{labels.atRest}</p>
      {derived ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs">
          <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0" />
          <span>
            {labels.derivedWarningLead}
            <code className="font-mono">ENCRYPTION_KEY</code>
            {labels.derivedWarningTail}
          </span>
        </p>
      ) : null}
    </Alert>
  );
}
