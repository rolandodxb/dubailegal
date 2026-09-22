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
 */
export function SupportTicketForm({ contextPath }: { contextPath?: string }) {
  const [state, formAction] = useActionState(createSupportTicketAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {contextPath ? <input type="hidden" name="contextPath" value={contextPath} /> : null}

      <Field
        label="What is the problem?"
        htmlFor="support-subject"
        required
        error={state?.fieldErrors?.subject}
        hint="One line, so it can be told apart from everything else in the queue."
      >
        <Input
          id="support-subject"
          name="subject"
          required
          maxLength={120}
          defaultValue={state?.values?.subject ?? ''}
          error={state?.fieldErrors?.subject}
          placeholder="I cannot upload my Emirates ID"
        />
      </Field>

      <Field label="What is it about?" htmlFor="support-category" required error={state?.fieldErrors?.category}>
        <Select
          id="support-category"
          name="category"
          required
          defaultValue={state?.values?.category ?? 'TECHNICAL'}
          error={state?.fieldErrors?.category}
        >
          {SUPPORT_CATEGORIES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Describe it"
        htmlFor="support-body"
        required
        error={state?.fieldErrors?.body}
        hint="What you were doing, what happened, and what you expected. Support sees your account, so you do not need to repeat your details."
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

      <SubmitButton pendingLabel="Sending to support…">
        <Icon name="lifeBuoy" size={17} />
        Send to support
      </SubmitButton>

      <p className="text-xs text-slate-500">
        Support goes to platform administrators only. It is not shown to the other side of any case.
      </p>
    </form>
  );
}

/** A message in the thread. The same box serves the reporter and the administrator. */
export function SupportReplyForm({
  ticketId,
  asAdmin = false,
  disabled = false,
  disabledReason,
}: {
  ticketId: string;
  asAdmin?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, formAction] = useActionState(
    asAdmin ? replySupportTicketAsAdminAction : replySupportTicketAction,
    initialFormState,
  );

  if (disabled) {
    return <Alert tone="neutral">{disabledReason ?? 'This ticket is closed.'}</Alert>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />

      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <div>
        <label htmlFor={`support-reply-${ticketId}`} className="sr-only">
          Message
        </label>
        <Textarea
          id={`support-reply-${ticketId}`}
          name="body"
          required
          rows={3}
          maxLength={4000}
          placeholder={asAdmin ? 'Reply to the reporter…' : 'Add to this ticket…'}
          error={state?.fieldErrors?.body}
        />
      </div>

      <SubmitButton size="sm" pendingLabel="Sending…">
        {asAdmin ? 'Send reply' : 'Send message'}
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
export function SolveTicketForm({ ticketId, reference }: { ticketId: string; reference: string }) {
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
          confirm={`Mark ${reference} solved and close it? Neither side can post to it afterwards, and the reporter has to raise a new ticket if the problem comes back.`}
          pendingLabel="Closing…"
        >
          <Icon name="checkCircle" size={16} />
          Mark solved and close
        </SubmitButton>
      )}
    </form>
  );
}
