'use client';

import { useActionState } from 'react';
import { createInquiryAction } from '@/app/actions/inquiry-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Textarea } from '@/components/ui/primitives';

/**
 * Sends an inquiry to a listed professional. Stored against the listing and
 * shown in the recipient's dashboard.
 */
export function InquiryForm({ listingId, displayName }: { listingId: string; displayName: string }) {
  const [state, formAction] = useActionState(createInquiryAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="listingId" value={listingId} />

      <Field label="Subject" htmlFor="inquiry-subject" required error={state?.fieldErrors?.subject}>
        <Input
          id="inquiry-subject"
          name="subject"
          required
          maxLength={160}
          placeholder="e.g. Advice on a commercial lease dispute"
          defaultValue={state?.values?.subject ?? ''}
          error={state?.fieldErrors?.subject}
        />
      </Field>

      <Field
        label="Message"
        htmlFor="inquiry-message"
        required
        error={state?.fieldErrors?.message}
        hint={`Describe your situation briefly. At least 20 characters. This goes to ${displayName}.`}
      >
        <Textarea
          id="inquiry-message"
          name="message"
          required
          minLength={20}
          maxLength={4000}
          rows={6}
          defaultValue={state?.values?.message ?? ''}
          error={state?.fieldErrors?.message}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Sending…">
        Send inquiry
      </SubmitButton>

      <p className="text-xs text-slate-500">
        Your name and the email address on your account are shared with the recipient so they can
        reply. Your Emirates ID is never shared through the directory.
      </p>
    </form>
  );
}
