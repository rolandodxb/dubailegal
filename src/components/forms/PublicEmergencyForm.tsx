'use client';

import { useActionState } from 'react';
import { raisePublicEmergencyAction } from '@/app/actions/emergency-actions';
import { initialFormState } from '@/lib/form-state';
import { LEGAL_AREAS } from '@/lib/constants';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui/primitives';

/**
 * The no-login emergency form.
 *
 * Three fields are required and nothing else: a name, a number to call back on,
 * and what is happening. No account, no password, no email confirmation — the
 * point is to be in front of a lawyer in seconds. Submitting goes straight to a
 * video room.
 */
export function PublicEmergencyForm() {
  const [state, formAction] = useActionState(raisePublicEmergencyAction, initialFormState);

  const value = (key: string) => state?.values?.[key] ?? '';

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="We could not send that">
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Your name"
          htmlFor="em-name"
          required
          error={state?.fieldErrors?.guestName}
          hint="A first name is enough."
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
          label="Number to call you on"
          htmlFor="em-phone"
          required
          error={state?.fieldErrors?.guestPhone}
          hint="A lawyer may call this before joining the room."
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
        label="What is happening?"
        htmlFor="em-description"
        required
        error={state?.fieldErrors?.description}
        hint="A sentence is enough. The lawyer reads this as they join."
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
        <Field label="Area of law" htmlFor="em-type" required error={state?.fieldErrors?.caseType}>
          <Select
            id="em-type"
            name="caseType"
            required
            defaultValue={value('caseType') || 'CRIMINAL_PENAL'}
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
          label="Email"
          htmlFor="em-email"
          error={state?.fieldErrors?.guestEmail}
          hint="Optional. For a copy of what you sent."
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

      <SubmitButton size="lg" className="w-full" pendingLabel="Finding a lawyer…">
        Get a lawyer on video now
      </SubmitButton>

      <p className="text-xs text-slate-500">
        No account needed. You go straight to a video room where a lawyer on emergency call joins
        you. Keep the page open.
      </p>
    </form>
  );
}
