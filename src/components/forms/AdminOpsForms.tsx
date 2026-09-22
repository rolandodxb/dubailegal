'use client';

import { useActionState } from 'react';
import {
  clearTrafficAction,
  deleteSampleDataAction,
  moderateReviewAction,
  setMaintenanceMessageAction,
  shutdownServerAction,
  toggleFeatureAction,
} from '@/app/actions/admin-ops-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Textarea } from '@/components/ui/primitives';

/**
 * One switch per function.
 *
 * A single click flips the setting: the value to write is carried in the form,
 * so this does not need client state and still works with JavaScript disabled.
 */
export function FeatureToggle({
  settingKey,
  label,
  description,
  enabled,
  updatedBy,
  updatedAt,
}: {
  settingKey: string;
  label: string;
  description: string;
  enabled: boolean;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 py-4">
      <div className="min-w-64 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
              enabled
                ? 'bg-green-50 text-green-800 ring-green-200'
                : 'bg-red-50 text-red-800 ring-red-200'
            }`}
          >
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">{description}</p>
        {updatedAt ? (
          <p className="mt-1 text-xs text-slate-400">
            Last changed {updatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC
            {updatedBy ? ` by ${updatedBy}` : ''}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Never changed from its default.</p>
        )}
      </div>

      <form action={toggleFeatureAction}>
        <input type="hidden" name="key" value={settingKey} />
        <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
        <SubmitButton
          variant={enabled ? 'danger' : 'primary'}
          size="sm"
          pendingLabel="Saving…"
          confirm={
            enabled
              ? `Disable “${label}” for everyone? Existing data is not affected.`
              : `Enable “${label}”?`
          }
        >
          {enabled ? 'Turn off' : 'Turn on'}
        </SubmitButton>
      </form>
    </div>
  );
}

/** The message people see while maintenance mode is on. */
export function MaintenanceMessageForm({ message }: { message: string }) {
  const [state, formAction] = useActionState(setMaintenanceMessageAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label="Message shown during maintenance"
        htmlFor="maintenance-message"
        error={state?.fieldErrors?.message}
      >
        <Textarea
          id="maintenance-message"
          name="message"
          rows={3}
          maxLength={500}
          defaultValue={state?.values?.message ?? message}
          error={state?.fieldErrors?.message}
        />
      </Field>

      <SubmitButton variant="secondary" pendingLabel="Saving…">
        Save message
      </SubmitButton>
    </form>
  );
}

export function ClearTrafficForm() {
  const [state, formAction] = useActionState(clearTrafficAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <SubmitButton
        variant="danger"
        size="sm"
        confirm="Delete the entire traffic register? This cannot be undone, though the deletion itself is recorded."
        pendingLabel="Clearing…"
      >
        Clear the traffic register
      </SubmitButton>
    </form>
  );
}

export function ModerateReviewForm({
  reviewId,
  hidden,
}: {
  reviewId: string;
  hidden: boolean;
}) {
  const [state, formAction] = useActionState(moderateReviewAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      {state?.ok && state.message ? (
        <p className="text-xs font-medium text-green-700">{state.message}</p>
      ) : null}
      {state && !state.ok && state.message ? (
        <p className="text-xs font-medium text-red-700">{state.message}</p>
      ) : null}

      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="hidden" value={hidden ? 'false' : 'true'} />

      {!hidden ? (
        <Input
          name="reason"
          placeholder="Reason shown to the author"
          maxLength={200}
          className="max-w-xs"
        />
      ) : null}

      <SubmitButton
        variant={hidden ? 'secondary' : 'danger'}
        size="sm"
        pendingLabel="Saving…"
        confirm={hidden ? 'Restore this review?' : 'Hide this review from the public profile?'}
      >
        {hidden ? 'Restore review' : 'Hide review'}
      </SubmitButton>
    </form>
  );
}

/**
 * Stops the application process.
 *
 * Guarded by a typed phrase rather than a checkbox, because there is no way to
 * undo it from the browser: the app has to be started again from a terminal.
 */
export function ShutdownForm() {
  const [state, formAction] = useActionState(shutdownServerAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? (
        <Alert tone="warning" title="Shutting down">
          {state.message}
        </Alert>
      ) : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label="Type SHUT DOWN to confirm"
        htmlFor="confirm-shutdown"
        error={state?.fieldErrors?.confirm}
        hint="The application will stop responding and must be started again from a terminal."
      >
        <Input
          id="confirm-shutdown"
          name="confirm"
          autoComplete="off"
          placeholder="SHUT DOWN"
          error={state?.fieldErrors?.confirm}
        />
      </Field>

      <SubmitButton variant="danger" pendingLabel="Shutting down…">
        Shut down the server
      </SubmitButton>
    </form>
  );
}

/**
 * Deletes every seeded sample account.
 *
 * The only fabricated records this installation can hold are the demo accounts
 * created by `npm run seed:demo`, and they are flagged as such. Real accounts are
 * never touched, whatever they are called — but the confirmation phrase is typed
 * rather than clicked, because an operator should have to mean it.
 */
export function DeleteSampleDataForm({ accountCount }: { accountCount: number }) {
  const [state, formAction] = useActionState(deleteSampleDataAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <p className="text-sm text-slate-600">
        {accountCount === 0
          ? 'There are no sample accounts on this installation, so there is nothing to delete.'
          : `${accountCount} seeded sample account${accountCount === 1 ? '' : 's'} will be deleted, with every document, case and message belonging to ${accountCount === 1 ? 'it' : 'them'}. No real account is affected.`}
      </p>

      <Field
        label="Type DELETE SAMPLE DATA to confirm"
        htmlFor="confirm-sample-data"
        error={state?.fieldErrors?.confirm}
        hint="This cannot be undone."
      >
        <Input
          id="confirm-sample-data"
          name="confirm"
          autoComplete="off"
          placeholder="DELETE SAMPLE DATA"
          error={state?.fieldErrors?.confirm}
        />
      </Field>

      <SubmitButton
        variant="danger"
        pendingLabel="Deleting sample data…"
        disabled={accountCount === 0}
      >
        Delete all sample data
      </SubmitButton>
    </form>
  );
}
