'use client';

import { useActionState } from 'react';
import {
  acceptEmergencyAction,
  cancelEmergencyAction,
  cancelGuestEmergencyAction,
  closeEmergencyAction,
  raiseEmergencyAction,
  setEmergencyAvailabilityAction,
  setFirmEmergencyLawyerAction,
} from '@/app/actions/emergency-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Checkbox, Field, Input, Select, Textarea } from '@/components/ui/primitives';

/**
 * The words come from the page that renders each form: this is a client
 * component, so it cannot read the dictionary itself.
 */

/** Raises an urgent request. Deliberately blunt about what it does. */
export function EmergencyRequestForm({
  defaultPhone,
  labels,
}: {
  defaultPhone: string;
  labels: {
    sentTitle: string;
    failedTitle: string;
    title: string;
    titleHint: string;
    areaOfLaw: string;
    areaOptions: { value: string; label: string }[];
    description: string;
    descriptionHint: string;
    phone: string;
    phoneHint: string;
    dangerTitle: string;
    dangerBody: string;
    pending: string;
    submit: string;
  };
}) {
  const [state, formAction] = useActionState(raiseEmergencyAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? (
        <Alert tone="success" title={labels.sentTitle}>
          {state.message}
        </Alert>
      ) : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.failedTitle}>
          {state.message}
        </Alert>
      ) : null}

      <Field
        label={labels.title}
        htmlFor="em-title"
        required
        error={state?.fieldErrors?.title}
        hint={labels.titleHint}
      >
        <Input
          id="em-title"
          name="title"
          required
          minLength={4}
          maxLength={160}
          defaultValue={state?.values?.title ?? ''}
          error={state?.fieldErrors?.title}
        />
      </Field>

      <Field
        label={labels.areaOfLaw}
        htmlFor="em-type"
        required
        error={state?.fieldErrors?.caseType}
      >
        <Select
          id="em-type"
          name="caseType"
          required
          defaultValue={state?.values?.caseType ?? 'CRIMINAL_PENAL'}
          error={state?.fieldErrors?.caseType}
        >
          {labels.areaOptions.map((area) => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={labels.description}
        htmlFor="em-description"
        required
        error={state?.fieldErrors?.description}
        hint={labels.descriptionHint}
      >
        <Textarea
          id="em-description"
          name="description"
          required
          minLength={30}
          maxLength={4000}
          rows={6}
          defaultValue={state?.values?.description ?? ''}
          error={state?.fieldErrors?.description}
        />
      </Field>

      <Field
        label={labels.phone}
        htmlFor="em-phone"
        required
        error={state?.fieldErrors?.contactPhone}
        hint={labels.phoneHint}
      >
        <Input
          id="em-phone"
          name="contactPhone"
          type="tel"
          required
          defaultValue={state?.values?.contactPhone ?? defaultPhone}
          error={state?.fieldErrors?.contactPhone}
        />
      </Field>

      <Alert tone="warning" title={labels.dangerTitle}>
        {labels.dangerBody}
      </Alert>

      <SubmitButton size="lg" pendingLabel={labels.pending}>
        {labels.submit}
      </SubmitButton>
    </form>
  );
}

/** A professional takes an urgent request, which opens and assigns a case. */
export function AcceptEmergencyForm({
  requestId,
  labels,
}: {
  requestId: string;
  labels: { pending: string; confirm: string; submit: string };
}) {
  const [state, formAction] = useActionState(acceptEmergencyAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton pendingLabel={labels.pending} confirm={labels.confirm}>
        {labels.submit}
      </SubmitButton>
    </form>
  );
}

export function CancelEmergencyForm({
  requestId,
  labels,
}: {
  requestId: string;
  labels: { confirm: string; submit: string };
}) {
  const [state, formAction] = useActionState(cancelEmergencyAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      {state?.ok && state.message ? (
        <p className="text-xs font-medium text-green-700">{state.message}</p>
      ) : null}
      {state && !state.ok && state.message ? (
        <p className="text-xs font-medium text-red-700">{state.message}</p>
      ) : null}
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton variant="ghost" size="sm" confirm={labels.confirm} pendingLabel="…">
        {labels.submit}
      </SubmitButton>
    </form>
  );
}

/** A lawyer turns their own emergency availability on or off. */
export function EmergencyAvailabilityForm({
  accepts,
  note,
  labels,
}: {
  accepts: boolean;
  note: string | null;
  labels: {
    available: string;
    notAvailable: string;
    pending: string;
    stop: string;
    start: string;
  };
}) {
  const [state, formAction] = useActionState(setEmergencyAvailabilityAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="accepts" value={accepts ? 'false' : 'true'} />

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
            accepts
              ? 'bg-green-50 text-green-800 ring-green-200'
              : 'bg-slate-100 text-slate-700 ring-slate-200'
          }`}
        >
          {accepts ? labels.available : labels.notAvailable}
        </span>
        <SubmitButton
          variant={accepts ? 'danger' : 'primary'}
          size="sm"
          pendingLabel={labels.pending}
        >
          {accepts ? labels.stop : labels.start}
        </SubmitButton>
      </div>
    </form>
  );
}

export function EmergencyNoteForm({
  note,
  labels,
}: {
  note: string | null;
  labels: { label: string; hint: string; pending: string; submit: string };
}) {
  const [state, formAction] = useActionState(setEmergencyAvailabilityAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="accepts" value="true" />
      <Field label={labels.label} htmlFor="em-note" hint={labels.hint}>
        <Input id="em-note" name="note" maxLength={160} defaultValue={note ?? ''} />
      </Field>
      <SubmitButton variant="secondary" size="sm" pendingLabel={labels.pending}>
        {labels.submit}
      </SubmitButton>
    </form>
  );
}

/** A firm names one of its lawyers as its always-active emergency contact. */
export function FirmEmergencyForm({
  lawyerProfileId,
  lawyerName,
  active,
  disabled,
  labels,
}: {
  lawyerProfileId: string;
  lawyerName: string;
  active: boolean;
  disabled?: boolean;
  labels: {
    pending: string;
    removeConfirm: string;
    makeConfirm: string;
    active: string;
    make: string;
  };
}) {
  const [state, formAction] = useActionState(setFirmEmergencyLawyerAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      {state?.ok && state.message ? (
        <p className="text-xs font-medium text-green-700">{state.message}</p>
      ) : null}
      {state && !state.ok && state.message ? (
        <p className="text-xs font-medium text-red-700">{state.message}</p>
      ) : null}

      <input type="hidden" name="lawyerProfileId" value={lawyerProfileId} />
      <input type="hidden" name="active" value={active ? 'false' : 'true'} />

      <SubmitButton
        variant={active ? 'primary' : 'secondary'}
        size="sm"
        disabled={disabled}
        pendingLabel={labels.pending}
        confirm={
          active
            ? labels.removeConfirm.replace('{name}', lawyerName)
            : labels.makeConfirm.replace('{name}', lawyerName)
        }
      >
        {active ? labels.active : labels.make}
      </SubmitButton>
    </form>
  );
}

/**
 * The caller calls the whole thing off, from inside the room.
 *
 * Pressed by mistake or because the situation changed, either way the request
 * stops ringing lawyers the moment it is pressed. The token in the link is the
 * credential, so this works without an account.
 */
export function CancelGuestEmergencyForm({
  roomCode,
  token,
  labels,
}: {
  roomCode: string;
  token: string;
  labels: { confirm: string; pending: string; submit: string; note: string };
}) {
  const [state, formAction] = useActionState(cancelGuestEmergencyAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="roomCode" value={roomCode} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton
        variant="danger"
        confirm={labels.confirm}
        pendingLabel={labels.pending}
      >
        {labels.submit}
      </SubmitButton>
      <p className="text-xs text-slate-500">{labels.note}</p>
    </form>
  );
}

/** The professional who answered ends the call. */
export function CloseEmergencyForm({
  requestId,
  labels,
}: {
  requestId: string;
  labels: { confirm: string; pending: string; submit: string };
}) {
  const [state, formAction] = useActionState(closeEmergencyAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      {state?.ok && state.message ? (
        <p className="text-xs font-medium text-green-700">{state.message}</p>
      ) : null}
      {state && !state.ok && state.message ? (
        <p className="text-xs font-medium text-red-700">{state.message}</p>
      ) : null}
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton
        variant="secondary"
        size="sm"
        confirm={labels.confirm}
        pendingLabel={labels.pending}
      >
        {labels.submit}
      </SubmitButton>
    </form>
  );
}
