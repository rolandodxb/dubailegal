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
import { LEGAL_AREAS } from '@/lib/constants';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Checkbox, Field, Input, Select, Textarea } from '@/components/ui/primitives';

/** Raises an urgent request. Deliberately blunt about what it does. */
export function EmergencyRequestForm({ defaultPhone }: { defaultPhone: string }) {
  const [state, formAction] = useActionState(raiseEmergencyAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? (
        <Alert tone="success" title="Your request is out">
          {state.message}
        </Alert>
      ) : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="The request was not sent">
          {state.message}
        </Alert>
      ) : null}

      <Field
        label="What has happened?"
        htmlFor="em-title"
        required
        error={state?.fieldErrors?.title}
        hint="A few words — for example “Police questioning tonight”."
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

      <Field label="Area of law" htmlFor="em-type" required error={state?.fieldErrors?.caseType}>
        <Select
          id="em-type"
          name="caseType"
          required
          defaultValue={state?.values?.caseType ?? 'CRIMINAL_PENAL'}
          error={state?.fieldErrors?.caseType}
        >
          {LEGAL_AREAS.map((area) => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="What do you need right now?"
        htmlFor="em-description"
        required
        error={state?.fieldErrors?.description}
        hint="At least 30 characters. A professional reads this before calling you back."
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
        label="Number to call you back on"
        htmlFor="em-phone"
        required
        error={state?.fieldErrors?.contactPhone}
        hint="This is shared with the professionals who take emergencies. It may differ from your profile number."
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

      <Alert tone="warning" title="Before you send">
        Your request goes to every professional who takes emergencies. It is not a substitute for
        the police, an ambulance or emergency services — if somebody is in danger, call 999 first.
      </Alert>

      <SubmitButton size="lg" pendingLabel="Sending to every emergency lawyer…">
        Send my urgent request
      </SubmitButton>
    </form>
  );
}

/** A professional takes an urgent request, which opens and assigns a case. */
export function AcceptEmergencyForm({ requestId }: { requestId: string }) {
  const [state, formAction] = useActionState(acceptEmergencyAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton
        pendingLabel="Taking it…"
        confirm="Take this urgent request? A case will be opened and assigned to you."
      >
        Take this case
      </SubmitButton>
    </form>
  );
}

export function CancelEmergencyForm({ requestId }: { requestId: string }) {
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
      <SubmitButton variant="ghost" size="sm" confirm="Withdraw your urgent request?" pendingLabel="…">
        Withdraw
      </SubmitButton>
    </form>
  );
}

/** A lawyer turns their own emergency availability on or off. */
export function EmergencyAvailabilityForm({
  accepts,
  note,
}: {
  accepts: boolean;
  note: string | null;
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
          {accepts ? 'Available for emergencies' : 'Not available for emergencies'}
        </span>
        <SubmitButton variant={accepts ? 'danger' : 'primary'} size="sm" pendingLabel="Saving…">
          {accepts ? 'Stop taking emergencies' : 'Make me available'}
        </SubmitButton>
      </div>
    </form>
  );
}

export function EmergencyNoteForm({ note }: { note: string | null }) {
  const [state, formAction] = useActionState(setEmergencyAvailabilityAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="accepts" value="true" />
      <Field
        label="What you cover, and when"
        htmlFor="em-note"
        hint="Shown with your availability, for example “Criminal matters, 24/7” or “Urgent injunctions, weekdays”."
      >
        <Input id="em-note" name="note" maxLength={160} defaultValue={note ?? ''} />
      </Field>
      <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
        Save availability note
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
}: {
  lawyerProfileId: string;
  lawyerName: string;
  active: boolean;
  disabled?: boolean;
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
        pendingLabel="Saving…"
        confirm={
          active
            ? `Remove ${lawyerName} as your firm's emergency contact?`
            : `Make ${lawyerName} your firm's emergency contact? Urgent requests will be assigned to them directly.`
        }
      >
        {active ? 'Emergency contact' : 'Make emergency contact'}
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
}: {
  roomCode: string;
  token: string;
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
        confirm="Cancel this urgent request? Every lawyer who saw it is told it is over, and the room closes."
        pendingLabel="Cancelling…"
      >
        Cancel this urgent request
      </SubmitButton>
      <p className="text-xs text-slate-500">
        Pressed it by mistake, or no longer need a lawyer? This stops the request immediately.
      </p>
    </form>
  );
}

/** The professional who answered ends the call. */
export function CloseEmergencyForm({ requestId }: { requestId: string }) {
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
        confirm="End this call and mark the request as dealt with? The caller is told."
        pendingLabel="Closing…"
      >
        End the call
      </SubmitButton>
    </form>
  );
}
