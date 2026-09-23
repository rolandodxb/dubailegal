'use client';

import { useActionState, useState } from 'react';
import { saveProfileAction } from '@/app/actions/profile-actions';
import { initialFormState } from '@/lib/form-state';
import { formatEmiratesId, emiratesIdInputHint } from '@/lib/emirates-id';
import { calculateAge, toDateInputValue } from '@/lib/format';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Textarea } from '@/components/ui/primitives';
import { CountrySelect } from './CountrySelect';
import { countryByCode } from '@/lib/countries';

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
 *
 * Every word comes from the server parent, because a client component cannot
 * read the dictionary for itself.
 */
export function ProfileForm({
  profile,
  labels,
  countryNames,
}: {
  profile: ProfileFormValues | null;
  countryNames?: Record<string, string>;
  labels: {
    notSpecified: string;
    identityBody: string;
    identityNumber: string;
    identityNumberHint: string;
    identityNumberHintUae: string;
    errorTitle: string;
    fullName: string;
    dateOfBirth: string;
    ageShown: string;
    ageHint: string;
    countryOfBirth: string;
    countryOfBirthHint: string;
    nationality: string;
    nationalityHint: string;
    countryOfResidence: string;
    countryOfResidenceHint: string;
    placeOfBirth: string;
    placeOfBirthHint: string;
    placeOfBirthPlaceholder: string;
    phone: string;
    phoneHint: string;
    emiratesId: string;
    emiratesIdBody: string;
    emiratesIdNumber: string;
    emiratesIdNumberHint: string;
    emiratesIdNumberPlaceholder: string;
    emiratesIdExpiry: string;
    work: string;
    workHint: string;
    education: string;
    educationHint: string;
    saving: string;
    saveProfile: string;
  };
}) {
  const [state, formAction] = useActionState(saveProfileAction, initialFormState);

  const value = (key: keyof ProfileFormValues, fallback = '') =>
    state?.values?.[key] ?? (profile?.[key] as string | null) ?? fallback;

  /** Same idea for the country codes, which are stored as codes rather than text. */
  const countryValue = (key: 'countryOfBirthCode' | 'nationalityCode' | 'countryOfResidenceCode') =>
    state?.values?.[key] ?? (profile?.[key] as string | null) ?? '';

  /**
   * The identity document this member's country issues.
   *
   * A member in Argentina holds a DNI, one in France an INE, one in the Emirates an
   * Emirates ID — so the field is named for their document rather than for the
   * platform's home country. It follows the nationality they choose, and falls back
   * to where they live, and it updates as they choose: the point is that somebody
   * who has said they are in Argentina is never asked for an Emirates ID.
   */
  const [identityCountry, setIdentityCountry] = useState(
    countryValue('nationalityCode') || countryValue('countryOfResidenceCode') || '',
  );
  const identityCountryNames = countryNames ?? {};
  // Named by the country, always: a United Arab Emirates member is shown
  // "Emirates ID" because that is their document, an Argentine one "DNI" because
  // that is theirs — and an account that has not said where it is gets the neutral
  // "Document number" rather than assuming the platform's home country.
  const identityDocName =
    countryByCode(identityCountry)?.nationalId ?? labels.identityNumber;
  const identityIsEmirates = identityCountry === 'AE';

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
        <Alert tone="error" title={labels.errorTitle}>
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            label={labels.fullName}
            htmlFor="fullName"
            required
            error={state?.fieldErrors?.fullName}
          >
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
          label={labels.dateOfBirth}
          htmlFor="dateOfBirth"
          required
          error={state?.fieldErrors?.dateOfBirth}
          hint={
            age !== null ? labels.ageShown.replace('{age}', String(age)) : labels.ageHint
          }
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
          emptyOption={labels.notSpecified}
          names={countryNames}
          name="countryOfBirthCode"
          label={labels.countryOfBirth}
          required
          defaultValue={countryValue('countryOfBirthCode')}
          hint={labels.countryOfBirthHint}
          error={state?.fieldErrors?.countryOfBirthCode}
        />

        <CountrySelect
          emptyOption={labels.notSpecified}
          id="nationalityCode"
          onChange={setIdentityCountry}
          name="nationalityCode"
          label={labels.nationality}
          required
          defaultValue={countryValue('nationalityCode')}
          hint={labels.nationalityHint}
          error={state?.fieldErrors?.nationalityCode}
        />

        <CountrySelect
          emptyOption={labels.notSpecified}
          id="countryOfResidenceCode"
          onChange={(code) => setIdentityCountry(code)}
          name="countryOfResidenceCode"
          label={labels.countryOfResidence}
          required
          defaultValue={countryValue('countryOfResidenceCode')}
          hint={labels.countryOfResidenceHint}
          error={state?.fieldErrors?.countryOfResidenceCode}
        />

        <Field
          label={labels.placeOfBirth}
          htmlFor="placeOfBirth"
          error={state?.fieldErrors?.placeOfBirth}
          hint={labels.placeOfBirthHint}
        >
          <Input
            id="placeOfBirth"
            name="placeOfBirth"
            maxLength={120}
            placeholder={labels.placeOfBirthPlaceholder}
            defaultValue={value('placeOfBirth')}
            error={state?.fieldErrors?.placeOfBirth}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            label={labels.phone}
            htmlFor="phone"
            required
            error={state?.fieldErrors?.phone}
            hint={labels.phoneHint}
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
        <legend className="px-1 text-sm font-semibold text-slate-900">{identityDocName}</legend>
        <p className="mb-4 text-xs text-slate-500">{labels.identityBody}</p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={identityDocName}
            htmlFor="emiratesIdNumber"
            required
            error={state?.fieldErrors?.emiratesIdNumber}
            hint={identityIsEmirates ? labels.identityNumberHintUae : labels.identityNumberHint}
          >
            <Input
              id="emiratesIdNumber"
              name="emiratesIdNumber"
              required
              inputMode={identityIsEmirates ? 'numeric' : 'text'}
              value={emiratesId}
              onChange={(event) => setEmiratesId(event.target.value)}
              onBlur={(event) => {
                if (identityIsEmirates) setEmiratesId(formatEmiratesId(event.target.value));
              }}
              placeholder={identityIsEmirates ? labels.emiratesIdNumberPlaceholder : ''}
              error={state?.fieldErrors?.emiratesIdNumber}
            />
          </Field>

          <Field
            label={labels.emiratesIdExpiry}
            htmlFor="emiratesIdExpiry"
            error={state?.fieldErrors?.emiratesIdExpiry}
          >
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
        label={labels.work}
        htmlFor="workDescription"
        required
        error={state?.fieldErrors?.workDescription}
        hint={labels.workHint}
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
        label={labels.education}
        htmlFor="educationBackground"
        required
        error={state?.fieldErrors?.educationBackground}
        hint={labels.educationHint}
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

      <SubmitButton size="lg" pendingLabel={labels.saving}>
        {labels.saveProfile}
      </SubmitButton>
    </form>
  );
}
