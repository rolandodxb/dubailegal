'use client';

import { useActionState } from 'react';
import { createInquiryAction } from '@/app/actions/inquiry-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Textarea } from '@/components/ui/primitives';

/**
 * Sends an inquiry to a listed professional. Stored against the listing and
 * shown in the recipient's dashboard.
 *
 * The wording arrives from the server parent: a client component cannot read the
 * dictionary itself.
 */
export function InquiryForm({
  listingId,
  displayName,
  labels,
}: {
  listingId: string;
  displayName: string;
  labels: {
    subject: string;
    subjectPlaceholder: string;
    message: string;
    messageHint: string;
    sending: string;
    sendInquiry: string;
    privacyNote: string;
  };
}) {
  const [state, formAction] = useActionState(createInquiryAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="listingId" value={listingId} />

      <Field
        label={labels.subject}
        htmlFor="inquiry-subject"
        required
        error={state?.fieldErrors?.subject}
      >
        <Input
          id="inquiry-subject"
          name="subject"
          required
          maxLength={160}
          placeholder={labels.subjectPlaceholder}
          defaultValue={state?.values?.subject ?? ''}
          error={state?.fieldErrors?.subject}
        />
      </Field>

      <Field
        label={labels.message}
        htmlFor="inquiry-message"
        required
        error={state?.fieldErrors?.message}
        hint={labels.messageHint.replace('{name}', displayName)}
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

      <SubmitButton className="w-full" pendingLabel={labels.sending}>
        {labels.sendInquiry}
      </SubmitButton>

      <p className="text-xs text-slate-500">{labels.privacyNote}</p>
    </form>
  );
}
