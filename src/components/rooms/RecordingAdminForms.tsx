'use client';

import { useActionState, useState } from 'react';
import {
  deleteAllRecordingsAction,
  deleteRecordingAction,
} from '@/app/actions/room-actions';
import { initialFormState } from '@/lib/form-state';
import { Alert, Field, Input } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Icon } from '@/components/icons';

/** A typed confirmation, because deleting every recording cannot be undone. */
const CONFIRMATION = 'delete-all';

/**
 * The one control that clears the platform of recordings.
 *
 * It asks for the word to be typed rather than a click to be confirmed, because a
 * dialog is dismissed by reflex and typing is not. The button stays disabled until
 * it matches, so the failure mode is "nothing happened" rather than "everything
 * happened".
 */
export function DeleteAllRecordingsForm({
  count,
  labels,
}: {
  count: number;
  labels: { label: string; hint: string; hintOne: string; submit: string; pending: string };
}) {
  const [state, formAction] = useActionState(deleteAllRecordingsAction, initialFormState);
  const [typed, setTyped] = useState('');
  const hint = (count === 1 ? labels.hintOne : labels.hint).replace('{count}', String(count));

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field label={labels.label} htmlFor="confirm" required hint={hint}>
        <Input
          id="confirm"
          name="confirm"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={CONFIRMATION}
          autoComplete="off"
        />
      </Field>

      <SubmitButton
        variant="danger"
        disabled={typed.trim() !== CONFIRMATION || count === 0}
        pendingLabel={labels.pending}
      >
        <Icon name="trash" size={17} />
        {labels.submit}
      </SubmitButton>
    </form>
  );
}

/** Removing one recording, from the row it belongs to. */
export function DeleteRecordingForm({
  recordingId,
  roomCode,
  labels,
}: {
  recordingId: string;
  roomCode: string;
  labels: { confirm: string; submit: string; pending: string };
}) {
  const [state, formAction] = useActionState(deleteRecordingAction, initialFormState);

  return (
    <form action={formAction} className="shrink-0 space-y-2">
      <input type="hidden" name="recordingId" value={recordingId} />
      {state && !state.ok && state.message ? (
        <p className="text-xs font-medium text-red-700">{state.message}</p>
      ) : null}
      <SubmitButton
        variant="danger"
        size="sm"
        confirm={labels.confirm.replace('{room}', roomCode)}
        pendingLabel={labels.pending}
      >
        <Icon name="trash" size={15} />
        {labels.submit}
      </SubmitButton>
    </form>
  );
}
