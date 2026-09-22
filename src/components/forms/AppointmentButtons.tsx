'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import {
  cancelAppointmentAction,
  deleteAppointmentAction,
  rescheduleAppointmentAction,
} from '@/app/actions/appointment-actions';
import { initialFormState } from '@/lib/form-state';
import { BOOKABLE_HOURS } from '@/lib/appointment-slots';
import { buttonClasses, Field, Input, Select } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Icon } from '@/components/icons';

/** Lets either side call off a meeting. The other party is notified in-app. */
export function CancelAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const [state, formAction] = useActionState(cancelAppointmentAction, initialFormState);

  return (
    <form action={formAction} className="mt-1">
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      {state?.ok && state.message ? (
        <span className="mr-2 text-xs text-green-700">{state.message}</span>
      ) : null}
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <SubmitButton
        variant="ghost"
        size="sm"
        confirm="Cancel this meeting? The other party will be told."
        pendingLabel="Cancelling…"
      >
        Cancel meeting
      </SubmitButton>
    </form>
  );
}

/**
 * Moves a meeting to another time.
 *
 * Kept behind a disclosure so a diary full of meetings is still readable, and
 * pre-filled with the time it is already at, so the form always shows the
 * starting point.
 */
export function RescheduleAppointmentForm({
  appointmentId,
  defaultDateKey,
  defaultHour,
  defaultMode,
  defaultOfficeAddress,
}: {
  appointmentId: string;
  defaultDateKey: string;
  defaultHour: number;
  defaultMode: string;
  defaultOfficeAddress: string | null;
}) {
  const [state, formAction] = useActionState(rescheduleAppointmentAction, initialFormState);
  const mode = state?.values?.mode ?? defaultMode;
  const hour = Number(state?.values?.hour ?? defaultHour);

  return (
    <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-slate-700 marker:content-none">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="calendar" size={14} />
          Change the time
        </span>
      </summary>

      <form action={formAction} className="space-y-3 border-t border-slate-200 p-3">
        <input type="hidden" name="appointmentId" value={appointmentId} />

        {state?.ok && state.message ? (
          <p className="text-xs font-medium text-green-700">{state.message}</p>
        ) : null}
        {state && !state.ok && state.message ? (
          <p className="text-xs font-medium text-red-700">{state.message}</p>
        ) : null}

        {state?.ok ? null : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="New date" htmlFor={`date-${appointmentId}`} required error={state?.fieldErrors?.dateKey}>
                <Input
                  id={`date-${appointmentId}`}
                  name="dateKey"
                  type="date"
                  required
                  defaultValue={state?.values?.dateKey ?? defaultDateKey}
                  error={state?.fieldErrors?.dateKey}
                />
              </Field>

              <Field label="Hour (UAE)" htmlFor={`hour-${appointmentId}`} required error={state?.fieldErrors?.hour}>
                <Select
                  id={`hour-${appointmentId}`}
                  name="hour"
                  required
                  defaultValue={String(hour)}
                  error={state?.fieldErrors?.hour}
                >
                  {BOOKABLE_HOURS.map((value) => (
                    <option key={value} value={value}>
                      {String(value).padStart(2, '0')}:00
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Happens by" htmlFor={`mode-${appointmentId}`} required error={state?.fieldErrors?.mode}>
                <Select
                  id={`mode-${appointmentId}`}
                  name="mode"
                  required
                  defaultValue={mode}
                  error={state?.fieldErrors?.mode}
                >
                  <option value="OFFICE_VISIT">Office visit</option>
                  <option value="VIDEO_CALL">Video call</option>
                  <option value="PHONE_CALL">Phone call</option>
                </Select>
              </Field>
            </div>

            {mode === 'OFFICE_VISIT' ? (
              <Field
                label="Office address"
                htmlFor={`address-${appointmentId}`}
                required
                error={state?.fieldErrors?.officeAddress}
                hint="The client is asked to accept the new time, because they have to travel."
              >
                <Input
                  id={`address-${appointmentId}`}
                  name="officeAddress"
                  required
                  maxLength={300}
                  defaultValue={state?.values?.officeAddress ?? defaultOfficeAddress ?? ''}
                  error={state?.fieldErrors?.officeAddress}
                />
              </Field>
            ) : null}

            <p className="text-[11px] text-slate-500">
              If the meeting is a video call, a conference room is created or kept. The client is told
              the new time either way.
            </p>

            <SubmitButton size="sm" pendingLabel="Moving…">
              Save the new time
            </SubmitButton>
          </>
        )}
      </form>
    </details>
  );
}

/**
 * Deletes a meeting outright.
 *
 * Not the same as cancelling: a cancellation leaves a record and tells the other
 * party, a deletion removes the arrangement and tells nobody. The button says so
 * before it is pressed, because that difference is the whole point of having both.
 */
export function DeleteAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const [state, formAction] = useActionState(deleteAppointmentAction, initialFormState);

  return (
    <form action={formAction} className="mt-1">
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      {state?.ok && state.message ? (
        <span className="mr-2 text-xs text-green-700">{state.message}</span>
      ) : null}
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <SubmitButton
        variant="danger"
        size="sm"
        confirm="Delete this meeting? The client will NOT be told — use Cancel instead if you want them alerted."
        pendingLabel="Deleting…"
      >
        Delete meeting
      </SubmitButton>
      <p className="mt-1 text-[11px] text-slate-500">
        Deleting removes it and tells the client nothing. Cancel instead if they should be alerted.
      </p>
    </form>
  );
}

/**
 * Ends a call that was asked for from a case.
 *
 * Either side can press it: a call started by mistake, or one that has said what
 * it needed to say, should not leave a room open that keeps looking like it is
 * waiting for somebody. Both sides are told it is over.
 */
export function CancelCallButton({ appointmentId }: { appointmentId: string }) {
  const [state, formAction] = useActionState(cancelAppointmentAction, initialFormState);
  const router = useRouter();

  return (
    <form action={formAction} className="space-y-2">
      {state && !state.ok && state.message ? (
        <p className="text-xs font-medium text-red-700">{state.message}</p>
      ) : null}
      {state?.ok && state.message ? (
        <p className="text-xs font-medium text-green-700">{state.message} The room is closed.</p>
      ) : null}
      <input type="hidden" name="appointmentId" value={appointmentId} />
      {state?.ok ? (
        <button
          type="button"
          onClick={() => router.push('/rooms')}
          className={buttonClasses('secondary', 'md')}
        >
          Back to my rooms
        </button>
      ) : (
        <SubmitButton
          variant="danger"
          confirm="End this call? The room closes and the other person is told."
          pendingLabel="Ending…"
        >
          End this call
        </SubmitButton>
      )}
    </form>
  );
}
