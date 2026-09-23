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
  labels,
}: {
  settingKey: string;
  label: string;
  description: string;
  enabled: boolean;
  updatedBy?: string | null;
  updatedAt?: Date | null;
  /** The words this switch shows, in the reader's language. */
  labels: {
    enabled: string;
    disabled: string;
    lastChanged: string;
    changedBy: string;
    neverChanged: string;
    saving: string;
    turnOff: string;
    turnOn: string;
    confirmDisable: string;
    confirmEnable: string;
  };
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
            {enabled ? labels.enabled : labels.disabled}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">{description}</p>
        {updatedAt ? (
          <p className="mt-1 text-xs text-slate-400">
            {labels.lastChanged.replace(
              '{date}',
              updatedAt.toISOString().slice(0, 16).replace('T', ' '),
            )}
            {updatedBy ? labels.changedBy.replace('{email}', updatedBy) : ''}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">{labels.neverChanged}</p>
        )}
      </div>

      <form action={toggleFeatureAction}>
        <input type="hidden" name="key" value={settingKey} />
        <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
        <SubmitButton
          variant={enabled ? 'danger' : 'primary'}
          size="sm"
          pendingLabel={labels.saving}
          confirm={
            enabled
              ? labels.confirmDisable.replace('{label}', label)
              : labels.confirmEnable.replace('{label}', label)
          }
        >
          {enabled ? labels.turnOff : labels.turnOn}
        </SubmitButton>
      </form>
    </div>
  );
}

/** The message people see while maintenance mode is on. */
export function MaintenanceMessageForm({
  message,
  labels,
}: {
  message: string;
  /** The words this form shows, in the reader's language. */
  labels: { fieldLabel: string; saving: string; submit: string };
}) {
  const [state, formAction] = useActionState(setMaintenanceMessageAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label={labels.fieldLabel}
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

      <SubmitButton variant="secondary" pendingLabel={labels.saving}>
        {labels.submit}
      </SubmitButton>
    </form>
  );
}

export function ClearTrafficForm({
  labels,
}: {
  /** The words this form shows, in the reader's language. */
  labels: { confirm: string; pending: string; submit: string };
}) {
  const [state, formAction] = useActionState(clearTrafficAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <SubmitButton
        variant="danger"
        size="sm"
        confirm={labels.confirm}
        pendingLabel={labels.pending}
      >
        {labels.submit}
      </SubmitButton>
    </form>
  );
}

export function ModerateReviewForm({
  reviewId,
  hidden,
  labels,
}: {
  reviewId: string;
  hidden: boolean;
  /** The words this form shows, in the reader's language. */
  labels: {
    placeholder: string;
    saving: string;
    confirmRestore: string;
    confirmHide: string;
    restore: string;
    hide: string;
  };
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
          placeholder={labels.placeholder}
          maxLength={200}
          className="max-w-xs"
        />
      ) : null}

      <SubmitButton
        variant={hidden ? 'secondary' : 'danger'}
        size="sm"
        pendingLabel={labels.saving}
        confirm={hidden ? labels.confirmRestore : labels.confirmHide}
      >
        {hidden ? labels.restore : labels.hide}
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
export function ShutdownForm({
  labels,
}: {
  /** The words this form shows, in the reader's language. */
  labels: {
    alertTitle: string;
    fieldLabel: string;
    fieldHint: string;
    placeholder: string;
    pending: string;
    submit: string;
  };
}) {
  const [state, formAction] = useActionState(shutdownServerAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? (
        <Alert tone="warning" title={labels.alertTitle}>
          {state.message}
        </Alert>
      ) : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label={labels.fieldLabel}
        htmlFor="confirm-shutdown"
        error={state?.fieldErrors?.confirm}
        hint={labels.fieldHint}
      >
        <Input
          id="confirm-shutdown"
          name="confirm"
          autoComplete="off"
          placeholder={labels.placeholder}
          error={state?.fieldErrors?.confirm}
        />
      </Field>

      <SubmitButton variant="danger" pendingLabel={labels.pending}>
        {labels.submit}
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
export function DeleteSampleDataForm({
  accountCount,
  labels,
}: {
  accountCount: number;
  /** The words this form shows, in the reader's language. */
  labels: {
    empty: string;
    one: string;
    many: string;
    fieldLabel: string;
    fieldHint: string;
    /** The literal phrase the operator must type; never translated. */
    placeholder: string;
    pending: string;
    submit: string;
  };
}) {
  const [state, formAction] = useActionState(deleteSampleDataAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <p className="text-sm text-slate-600">
        {accountCount === 0
          ? labels.empty
          : (accountCount === 1 ? labels.one : labels.many).replace(
              '{count}',
              String(accountCount),
            )}
      </p>

      <Field
        label={labels.fieldLabel}
        htmlFor="confirm-sample-data"
        error={state?.fieldErrors?.confirm}
        hint={labels.fieldHint}
      >
        <Input
          id="confirm-sample-data"
          name="confirm"
          autoComplete="off"
          placeholder={labels.placeholder}
          error={state?.fieldErrors?.confirm}
        />
      </Field>

      <SubmitButton
        variant="danger"
        pendingLabel={labels.pending}
        disabled={accountCount === 0}
      >
        {labels.submit}
      </SubmitButton>
    </form>
  );
}
