'use client';

import { useActionState, useState } from 'react';
import { saveProfileAction } from '@/app/actions/profile-actions';
import { initialFormState } from '@/lib/form-state';
import { formatEmiratesId, emiratesIdInputHint } from '@/lib/emirates-id';
import { calculateAge, toDateInputValue } from '@/lib/format';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Textarea } from '@/components/ui/primitives';
import { CountrySelect } from './CountrySelect';

export type ProfileFormValues = {
  fullName: string;
  dateOfBirth: Date | null;
  placeOfBirth: string | null;
  countryOfResidence: string | null;
  nationality: string | null;
  countryOfBirthCode?: string | null;
  nationalityCode?: string | null;
  countryOfResidenceCode?: string | null;
  declaresNoResidencePermit?: boolean;
  phone: string | null;
  emiratesIdNumber: string | null;
  emiratesIdExpiry: Date | null;
  workDescription: string | null;
  educationBackground: string | null;
};

/**
 * Profile basics required of every account type.
 *
 * Age is shown but never submitted: it is derived from the date of birth, so
 * the two can never contradict each other.
 */
export function ProfileForm({ profile }: { profile: ProfileFormValues | null }) {
  const [state, formAction] = useActionState(saveProfileAction, initialFormState);

  const value = (key: keyof ProfileFormValues, fallback = '') =>
    state?.values?.[key] ?? (profile?.[key] as string | null) ?? fallback;

  /** Same idea for the country codes, which are stored as codes rather than text. */
  const countryValue = (key: 'countryOfBirthCode' | 'nationalityCode' | 'countryOfResidenceCode') =>
    state?.values?.[key] ?? (profile?.[key] as string | null) ?? '';

  const [emiratesId, setEmiratesId] = useState(
    state?.values?.emiratesIdNumber ?? profile?.emiratesIdNumber ?? '',
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    state?.values?.dateOfBirth ?? toDateInputValue(profile?.dateOfBirth ?? null),
  );

  const age = calculateAge(dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null);
  const idHint = emiratesIdInputHint(emiratesId);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="Your profile was not saved">
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Full name" htmlFor="fullName" required error={state?.fieldErrors?.fullName}>
            <Input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              maxLength={120}
              defaultValue={value('fullName')}
              error={state?.fieldErrors?.fullName}
            />
          </Field>
        </div>

        <Field
          label="Date of birth"
          htmlFor="dateOfBirth"
          required
          error={state?.fieldErrors?.dateOfBirth}
          hint={age !== null ? `Your age is shown as ${age}.` : 'Used to show your age.'}
        >
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            error={state?.fieldErrors?.dateOfBirth}
          />
        </Field>

        <CountrySelect
          id="countryOfBirthCode"
          name="countryOfBirthCode"
          label="Country of birth"
          required
          defaultValue={countryValue('countryOfBirthCode')}
          hint="The country that issued your birth documents. This decides which identity document you are asked for."
          error={state?.fieldErrors?.countryOfBirthCode}
        />

        <CountrySelect
          id="nationalityCode"
          name="nationalityCode"
          label="Nationality"
          required
          defaultValue={countryValue('nationalityCode')}
          hint="Whose passport you hold. It can differ from where you were born, and often does."
          error={state?.fieldErrors?.nationalityCode}
        />

        <CountrySelect
          id="countryOfResidenceCode"
          name="countryOfResidenceCode"
          label="Country of residence"
          required
          defaultValue={countryValue('countryOfResidenceCode')}
          hint="Where you actually live. If it is not where your nationality is from, a residence permit is asked for as well."
          error={state?.fieldErrors?.countryOfResidenceCode}
        />

        <Field
          label="Place of birth, as written"
          htmlFor="placeOfBirth"
          error={state?.fieldErrors?.placeOfBirth}
          hint="The town or city, shown to reviewers and never published."
        >
          <Input
            id="placeOfBirth"
            name="placeOfBirth"
            maxLength={120}
            placeholder="e.g. Rosario"
            defaultValue={value('placeOfBirth')}
            error={state?.fieldErrors?.placeOfBirth}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="Phone number"
            htmlFor="phone"
            required
            error={state?.fieldErrors?.phone}
            hint="Include the country code, for example +971 50 123 4567."
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={value('phone')}
              error={state?.fieldErrors?.phone}
            />
          </Field>
        </div>
      </div>

      {/* ── Emirates ID ─────────────────────────────────────────────────── */}
      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">Emirates ID</legend>
        <p className="mb-4 text-xs text-slate-500">
          Required for every account type. One Emirates ID can verify only one Dubai Legal account.
          It is never shown publicly — reviewers see the full number, everyone else sees it masked.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Emirates ID number"
            htmlFor="emiratesIdNumber"
            required
            error={state?.fieldErrors?.emiratesIdNumber}
            hint="15 digits, in the form 784-YYYY-NNNNNNN-C."
          >
            <Input
              id="emiratesIdNumber"
              name="emiratesIdNumber"
              required
              inputMode="numeric"
              value={emiratesId}
              onChange={(event) => setEmiratesId(event.target.value)}
              onBlur={(event) => setEmiratesId(formatEmiratesId(event.target.value))}
              placeholder="784-1990-1234567-1"
              error={state?.fieldErrors?.emiratesIdNumber}
            />
          </Field>

          <Field label="Emirates ID expiry" htmlFor="emiratesIdExpiry" error={state?.fieldErrors?.emiratesIdExpiry}>
            <Input
              id="emiratesIdExpiry"
              name="emiratesIdExpiry"
              type="date"
              defaultValue={state?.values?.emiratesIdExpiry ?? toDateInputValue(profile?.emiratesIdExpiry ?? null)}
              error={state?.fieldErrors?.emiratesIdExpiry}
            />
          </Field>
        </div>

        {idHint ? <p className="mt-2 text-xs text-slate-500">{idHint}</p> : null}

        {/* The check digit is still computed and still recorded for the reviewer,
            who uses it as one more thing to look at. It is not shown here: a
            notice about an internal digit told the person typing their own ID
            nothing they could act on except to worry. */}
      </fieldset>

      {/* ── Work and education ──────────────────────────────────────────── */}
      <Field
        label="Your work"
        htmlFor="workDescription"
        required
        error={state?.fieldErrors?.workDescription}
        hint="Briefly describe what you actually do. Lawyers and firms: describe your practice."
      >
        <Textarea
          id="workDescription"
          name="workDescription"
          required
          maxLength={2000}
          rows={4}
          defaultValue={value('workDescription')}
          error={state?.fieldErrors?.workDescription}
        />
      </Field>

      <Field
        label="Education background"
        htmlFor="educationBackground"
        required
        error={state?.fieldErrors?.educationBackground}
        hint="Degrees, institutions and years. This is shown on your public profile."
      >
        <Textarea
          id="educationBackground"
          name="educationBackground"
          required
          maxLength={2000}
          rows={4}
          defaultValue={value('educationBackground')}
          error={state?.fieldErrors?.educationBackground}
        />
      </Field>

      <SubmitButton size="lg" pendingLabel="Saving…">
        Save profile
      </SubmitButton>
    </form>
  );
}
