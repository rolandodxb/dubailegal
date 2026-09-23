'use client';

import { useActionState } from 'react';
import {
  createSupportTicketAction,
  replySupportTicketAction,
  replySupportTicketAsAdminAction,
  solveSupportTicketAction,
} from '@/app/actions/support-actions';
import { initialFormState } from '@/lib/form-state';
import { SUPPORT_CATEGORIES } from '@/lib/support';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Icon } from '@/components/icons';

/**
 * The reporting form.
 *
 * Support is a conversation, so the first message is written in the same place
 * the rest will be. The category is asked for because it tells the person reading
 * it what they are dealing with before they open the thread.
 *
 * The wording arrives from the server parent: a client component cannot read the
 * dictionary itself. `categories` maps the stored code to the reader's word.
 */
export function SupportTicketForm({
  contextPath,
  labels,
}: {
  contextPath?: string;
  labels: {
    problem: string;
    problemHint: string;
    problemPlaceholder: string;
    about: string;
    describe: string;
    describeHint: string;
    sendingToSupport: string;
    sendToSupport: string;
    privacyNote: string;
    categories: Record<string, string>;
  };
}) {
  const [state, formAction] = useActionState(createSupportTicketAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {contextPath ? <input type="hidden" name="contextPath" value={contextPath} /> : null}

      <Field
        label={labels.problem}
        htmlFor="support-subject"
        required
        error={state?.fieldErrors?.subject}
        hint={labels.problemHint}
      >
        <Input
          id="support-subject"
          name="subject"
          required
          maxLength={120}
          defaultValue={state?.values?.subject ?? ''}
          error={state?.fieldErrors?.subject}
          placeholder={labels.problemPlaceholder}
        />
      </Field>

      <Field
        label={labels.about}
        htmlFor="support-category"
        required
        error={state?.fieldErrors?.category}
      >
        <Select
          id="support-category"
          name="category"
          required
          defaultValue={state?.values?.category ?? 'TECHNICAL'}
          error={state?.fieldErrors?.category}
        >
          {SUPPORT_CATEGORIES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {labels.categories[entry.value] ?? entry.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={labels.describe}
        htmlFor="support-body"
        required
        error={state?.fieldErrors?.body}
        hint={labels.describeHint}
      >
        <Textarea
          id="support-body"
          name="body"
          required
          rows={6}
          maxLength={4000}
          defaultValue={state?.values?.body ?? ''}
          error={state?.fieldErrors?.body}
        />
      </Field>

      <SubmitButton pendingLabel={labels.sendingToSupport}>
        <Icon name="lifeBuoy" size={17} />
        {labels.sendToSupport}
      </SubmitButton>

      <p className="text-xs text-slate-500">{labels.privacyNote}</p>
    </form>
  );
}

/** A message in the thread. The same box serves the reporter and the administrator. */
export function SupportReplyForm({
  ticketId,
  asAdmin = false,
  disabled = false,
  disabledReason,
  labels,
}: {
  ticketId: string;
  asAdmin?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  labels: {
    closedTicket: string;
    message: string;
    replyPlaceholder: string;
    replyPlaceholderAdmin: string;
    sending: string;
    sendReply: string;
    sendMessage: string;
  };
}) {
  const [state, formAction] = useActionState(
    asAdmin ? replySupportTicketAsAdminAction : replySupportTicketAction,
    initialFormState,
  );

  if (disabled) {
    return <Alert tone="neutral">{disabledReason ?? labels.closedTicket}</Alert>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />

      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <div>
        <label htmlFor={`support-reply-${ticketId}`} className="sr-only">
          {labels.message}
        </label>
        <Textarea
          id={`support-reply-${ticketId}`}
          name="body"
          required
          rows={3}
          maxLength={4000}
          placeholder={asAdmin ? labels.replyPlaceholderAdmin : labels.replyPlaceholder}
          error={state?.fieldErrors?.body}
        />
      </div>

      <SubmitButton size="sm" pendingLabel={labels.sending}>
        {asAdmin ? labels.sendReply : labels.sendMessage}
      </SubmitButton>
    </form>
  );
}

/**
 * The administrator's "solved" button.
 *
 * Pressing it closes the ticket for both sides. The confirmation says so, because
 * a closed ticket cannot be reopened — the reporter has to raise a new one.
 */
export function SolveTicketForm({
  ticketId,
  reference,
  labels,
}: {
  ticketId: string;
  reference: string;
  labels: { solveConfirm: string; closing: string; markSolved: string };
}) {
  const [state, formAction] = useActionState(solveSupportTicketAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />

      {state && !state.ok && state.message ? (
        <p className="text-xs font-medium text-red-700">{state.message}</p>
      ) : null}
      {state?.ok && state.message ? (
        <p className="text-xs font-medium text-green-700">{state.message}</p>
      ) : null}

      {state?.ok ? null : (
        <SubmitButton
          variant="danger"
          confirm={labels.solveConfirm.replace('{reference}', reference)}
          pendingLabel={labels.closing}
        >
          <Icon name="checkCircle" size={16} />
          {labels.markSolved}
        </SubmitButton>
      )}
    </form>
  );
}
