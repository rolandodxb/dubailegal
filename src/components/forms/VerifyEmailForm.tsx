'use client';

import { useActionState } from 'react';
import { verifyEmailAction } from '@/app/actions/auth-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert } from '@/components/ui/primitives';

/**
 * Confirmation is an explicit button press, not a page load.
 *
 * Corporate mail scanners and link prefetchers follow URLs in email. If the
 * token were consumed on GET, simply receiving the message could confirm the
 * address. A POST makes the human the actor.
 *
 * The words come from the page: this is a client component, so it cannot read
 * the dictionary itself.
 */
export function VerifyEmailForm({
  token,
  labels,
}: {
  token: string;
  labels: { pending: string; submit: string };
}) {
  const [state, formAction] = useActionState(verifyEmailAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="token" value={token} />

      <SubmitButton className="w-full" size="lg" pendingLabel={labels.pending}>
        {labels.submit}
      </SubmitButton>
    </form>
  );
}
