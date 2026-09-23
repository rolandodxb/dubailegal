'use client';

import { useActionState } from 'react';
import {
  closeInquiryAction,
  markInquiryReadAction,
  replyToInquiryAction,
} from '@/app/actions/inquiry-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Textarea } from '@/components/ui/primitives';

export function InquiryReplyForm({
  inquiryId,
  labels,
}: {
  inquiryId: string;
  labels: { yourReply: string; sending: string; sendReply: string };
}) {
  const [state, formAction] = useActionState(replyToInquiryAction, initialFormState);

  return (
    <form action={formAction} className="mt-3 space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="inquiryId" value={inquiryId} />

      <Field
        label={labels.yourReply}
        htmlFor={`reply-${inquiryId}`}
        required
        error={state?.fieldErrors?.replyBody}
      >
        <Textarea
          id={`reply-${inquiryId}`}
          name="replyBody"
          required
          minLength={5}
          maxLength={4000}
          rows={4}
          defaultValue={state?.values?.replyBody ?? ''}
          error={state?.fieldErrors?.replyBody}
        />
      </Field>

      <SubmitButton size="sm" pendingLabel={labels.sending}>
        {labels.sendReply}
      </SubmitButton>
    </form>
  );
}

export function MarkInquiryReadButton({
  inquiryId,
  labels,
}: {
  inquiryId: string;
  labels: { markAsRead: string };
}) {
  const [state, formAction] = useActionState(markInquiryReadAction, initialFormState);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      <SubmitButton variant="ghost" size="sm" pendingLabel="…">
        {labels.markAsRead}
      </SubmitButton>
    </form>
  );
}

export function CloseInquiryButton({
  inquiryId,
  labels,
}: {
  inquiryId: string;
  labels: { close: string; closeConfirm: string };
}) {
  const [state, formAction] = useActionState(closeInquiryAction, initialFormState);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      <SubmitButton variant="ghost" size="sm" confirm={labels.closeConfirm} pendingLabel="…">
        {labels.close}
      </SubmitButton>
    </form>
  );
}
