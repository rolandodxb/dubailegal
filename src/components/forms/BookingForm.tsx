'use client';

import { useActionState, useState } from 'react';
import { bookAppointmentAction } from '@/app/actions/appointment-actions';
import { initialFormState } from '@/lib/form-state';
import type { MemberCasesDict } from '@/lib/i18n/dict/memberCases';
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
  labels,
  modeLabels,
}: {
  lawyerProfileId: string;
  dateKey: string;
  freeHours: { hour: number; label: string }[];
  clients: BookableClient[];
  labels: MemberCasesDict['booking'];
  /** The three ways a meeting can happen, in the reader's language. */
  modeLabels: { VIDEO_CALL: string; OFFICE_VISIT: string; PHONE_CALL: string };
}) {
  const [state, formAction] = useActionState(bookAppointmentAction, initialFormState);
  const [clientId, setClientId] = useState(state?.values?.clientId ?? '');

  if (clients.length === 0) {
    return <Alert tone="neutral">{labels.noClients}</Alert>;
  }

  if (freeHours.length === 0) {
    return <Alert tone="warning">{labels.noFreeSlots}</Alert>;
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
          {labels.availableTime}
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        </legend>
        <p className="mt-0.5 text-xs text-slate-500">
          {labels.meetingLength.replace('{minutes}', String(SLOT_MINUTES))}
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
          {labels.howMeet}
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        </legend>
        <p className="mt-0.5 text-xs text-slate-500">{labels.modeHint}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(
            [
              { value: 'VIDEO_CALL', label: modeLabels.VIDEO_CALL, hint: labels.modeVideoCallHint },
              { value: 'OFFICE_VISIT', label: modeLabels.OFFICE_VISIT, hint: labels.modeOfficeVisitHint },
              { value: 'PHONE_CALL', label: modeLabels.PHONE_CALL, hint: labels.modePhoneCallHint },
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
        label={labels.officeAddress}
        htmlFor="officeAddress"
        error={state?.fieldErrors?.officeAddress}
        hint={labels.officeAddressHint}
      >
        <Textarea
          id="officeAddress"
          name="officeAddress"
          rows={2}
          maxLength={300}
          placeholder={labels.officeAddressPlaceholder}
          defaultValue={state?.values?.officeAddress ?? ''}
          error={state?.fieldErrors?.officeAddress}
        />
      </Field>

      <Field
        label={labels.client}
        htmlFor="booking-client"
        required
        error={state?.fieldErrors?.clientId}
        hint={labels.clientHint}
      >
        <Select
          id="booking-client"
          name="clientId"
          required
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          error={state?.fieldErrors?.clientId}
        >
          <option value="">{labels.chooseClient}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {(client.cases.length === 1 ? labels.clientCases : labels.clientCasesPlural)
                .replace('{name}', client.name)
                .replace('{count}', String(client.cases.length))}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={labels.aboutWhichCase}
        htmlFor="booking-case"
        error={state?.fieldErrors?.caseId}
        hint={labels.aboutWhichCaseHint}
      >
        <Select id="booking-case" name="caseId" disabled={!selectedClient}>
          <option value="">{labels.mostRecentCase}</option>
          {(selectedClient?.cases ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.reference} — {item.title}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={labels.agenda} htmlFor="booking-note" error={state?.fieldErrors?.note}>
        <Textarea
          id="booking-note"
          name="note"
          rows={3}
          maxLength={1000}
          placeholder={labels.agendaPlaceholder}
          defaultValue={state?.values?.note ?? ''}
          error={state?.fieldErrors?.note}
        />
      </Field>

      <SubmitButton size="lg" pendingLabel={labels.booking}>
        {labels.registerBooking}
      </SubmitButton>

      <p className="text-xs text-slate-500">{labels.alerted}</p>
    </form>
  );
}
