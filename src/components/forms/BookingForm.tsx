'use client';

import { useActionState, useState } from 'react';
import { bookAppointmentAction } from '@/app/actions/appointment-actions';
import { initialFormState } from '@/lib/form-state';
import { SLOT_MINUTES } from '@/lib/constants';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Select, Textarea } from '@/components/ui/primitives';

export type BookableClient = {
  id: string;
  name: string;
  email: string;
  cases: { id: string; reference: string; title: string }[];
};

/**
 * Books a meeting with one of the lawyer's clients.
 *
 * Only genuinely free slots are offered: the list is computed server-side from
 * the lawyer's existing diary, and the database's unique constraint on
 * (lawyer, start time) is the final guard against a double booking.
 */
export function BookingForm({
  lawyerProfileId,
  dateKey,
  freeHours,
  clients,
}: {
  lawyerProfileId: string;
  dateKey: string;
  freeHours: { hour: number; label: string }[];
  clients: BookableClient[];
}) {
  const [state, formAction] = useActionState(bookAppointmentAction, initialFormState);
  const [clientId, setClientId] = useState(state?.values?.clientId ?? '');

  if (clients.length === 0) {
    return (
      <Alert tone="neutral">
        You have no clients with an accepted case yet. A meeting can be booked once you have
        accepted a case.
      </Alert>
    );
  }

  if (freeHours.length === 0) {
    return (
      <Alert tone="warning">
        Every slot on this day is taken. Choose another day in the calendar.
      </Alert>
    );
  }

  const selectedClient = clients.find((client) => client.id === clientId);

  return (
    <form action={formAction} className="space-y-5">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="lawyerProfileId" value={lawyerProfileId} />
      <input type="hidden" name="dateKey" value={dateKey} />

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">
          Available time
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        </legend>
        <p className="mt-0.5 text-xs text-slate-500">
          Meeting length {SLOT_MINUTES} minutes. Times are UAE time.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {freeHours.map((slot) => (
            <label
              key={slot.hour}
              htmlFor={`slot-${slot.hour}`}
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:font-medium has-checked:text-brand-800"
            >
              <input
                id={`slot-${slot.hour}`}
                type="radio"
                name="hour"
                value={slot.hour}
                required
                defaultChecked={state?.values?.hour === String(slot.hour)}
                className="sr-only"
              />
              {slot.label}
            </label>
          ))}
        </div>
        {state?.fieldErrors?.hour ? (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
            {state.fieldErrors.hour}
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">
          How will you meet?
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        </legend>
        <p className="mt-0.5 text-xs text-slate-500">
          A video call opens a conference room. An office visit is a request the client has to
          accept, because they have to travel.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(
            [
              { value: 'VIDEO_CALL', label: 'Video call', hint: 'Conference room' },
              { value: 'OFFICE_VISIT', label: 'Office visit', hint: 'Client must accept' },
              { value: 'PHONE_CALL', label: 'Phone call', hint: 'No room needed' },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              htmlFor={`mode-${option.value}`}
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:font-medium has-checked:text-brand-800"
            >
              <input
                id={`mode-${option.value}`}
                type="radio"
                name="mode"
                value={option.value}
                required
                defaultChecked={
                  (state?.values?.mode ?? 'OFFICE_VISIT') === option.value
                }
                className="sr-only"
              />
              <span className="block">{option.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{option.hint}</span>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.mode ? (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
            {state.fieldErrors.mode}
          </p>
        ) : null}
      </fieldset>

      <Field
        label="Office address"
        htmlFor="officeAddress"
        error={state?.fieldErrors?.officeAddress}
        hint="Required for an office visit — this is what the client is asked to come to."
      >
        <Textarea
          id="officeAddress"
          name="officeAddress"
          rows={2}
          maxLength={300}
          placeholder="Office 1204, Sample Tower, Sheikh Zayed Road, Dubai"
          defaultValue={state?.values?.officeAddress ?? ''}
          error={state?.fieldErrors?.officeAddress}
        />
      </Field>

      <Field
        label="Client"
        htmlFor="booking-client"
        required
        error={state?.fieldErrors?.clientId}
        hint="Only clients with an accepted case can be booked with."
      >
        <Select
          id="booking-client"
          name="clientId"
          required
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          error={state?.fieldErrors?.clientId}
        >
          <option value="">Choose a client…</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.cases.length} case{client.cases.length === 1 ? '' : 's'})
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="About which case"
        htmlFor="booking-case"
        error={state?.fieldErrors?.caseId}
        hint="Optional. Defaults to the client's most recent case."
      >
        <Select id="booking-case" name="caseId" disabled={!selectedClient}>
          <option value="">Most recent case</option>
          {(selectedClient?.cases ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.reference} — {item.title}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Agenda" htmlFor="booking-note" error={state?.fieldErrors?.note}>
        <Textarea
          id="booking-note"
          name="note"
          rows={3}
          maxLength={1000}
          placeholder="What will be discussed?"
          defaultValue={state?.values?.note ?? ''}
          error={state?.fieldErrors?.note}
        />
      </Field>

      <SubmitButton size="lg" pendingLabel="Booking…">
        Register booking
      </SubmitButton>

      <p className="text-xs text-slate-500">
        The client is alerted immediately that they are expected to attend.
      </p>
    </form>
  );
}
