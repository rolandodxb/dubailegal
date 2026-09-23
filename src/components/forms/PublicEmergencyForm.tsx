'use client';

import { useActionState } from 'react';
import { raisePublicEmergencyAction } from '@/app/actions/emergency-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui/primitives';

/**
 * The no-login emergency form.
 *
 * Three fields are required and nothing else: a name, a number to call back on,
 * and what is happening. No account, no password, no email confirmation — the
 * point is to be in front of a lawyer in seconds. Submitting goes straight to a
 * video room.
 *
 * The words come from the page that renders it: this is a client component, so
 * it cannot read the dictionary itself.
 */
export function PublicEmergencyForm({
  labels,
}: {
  labels: {
    failedTitle: string;
    name: string;
    nameHint: string;
    phone: string;
    phoneHint: string;
    description: string;
    descriptionHint: string;
    areaOfLaw: string;
    areaOptions: { value: string; label: string }[];
    email: string;
    emailHint: string;
    pending: string;
    submit: string;
    note: string;
  };
}) {
  const [state, formAction] = useActionState(raisePublicEmergencyAction, initialFormState);

  const value = (key: string) => state?.values?.[key] ?? '';

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.failedTitle}>
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={labels.name}
          htmlFor="em-name"
          required
          error={state?.fieldErrors?.guestName}
          hint={labels.nameHint}
        >
          <Input
            id="em-name"
            name="guestName"
            required
            maxLength={120}
            autoComplete="name"
            defaultValue={value('guestName')}
            error={state?.fieldErrors?.guestName}
          />
        </Field>

        <Field
          label={labels.phone}
          htmlFor="em-phone"
          required
          error={state?.fieldErrors?.guestPhone}
          hint={labels.phoneHint}
        >
          <Input
            id="em-phone"
            name="guestPhone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+971 50 123 4567"
            defaultValue={value('guestPhone')}
            error={state?.fieldErrors?.guestPhone}
          />
        </Field>
      </div>

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
          minLength={10}
          maxLength={2000}
          rows={4}
          defaultValue={value('description')}
          error={state?.fieldErrors?.description}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
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
            defaultValue={value('caseType') || 'CRIMINAL_PENAL'}
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
          label={labels.email}
          htmlFor="em-email"
          error={state?.fieldErrors?.guestEmail}
          hint={labels.emailHint}
        >
          <Input
            id="em-email"
            name="guestEmail"
            type="email"
            autoComplete="email"
            defaultValue={value('guestEmail')}
            error={state?.fieldErrors?.guestEmail}
          />
        </Field>
      </div>

      <SubmitButton size="lg" className="w-full" pendingLabel={labels.pending}>
        {labels.submit}
      </SubmitButton>

      <p className="text-xs text-slate-500">{labels.note}</p>
    </form>
  );
}
