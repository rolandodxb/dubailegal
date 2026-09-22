'use client';

import { useActionState } from 'react';
import type { AccountType } from '@prisma/client';
import { saveListingAction } from '@/app/actions/profile-actions';
import { initialFormState } from '@/lib/form-state';
import { ACCOUNT_TYPE_LABEL, EMIRATES, LEGAL_AREAS } from '@/lib/constants';
import { SubmitButton } from '@/components/ui/SubmitButton';
import {
  Alert,
  Checkbox,
  ChipCheckbox,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui/primitives';

export type ListingFormValues = {
  displayName: string;
  headline: string | null;
  bio: string | null;
  primaryEmirate: string;
  emirates: string[];
  areas: string[];
  languages: string[];
  yearsOfExperience: number | null;
  acceptsNewClients: boolean;
  published: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  addressLine: string | null;
};

/**
 * The public directory entry. Publishing is explicit: a saved listing stays a
 * private draft until the member ticks "publish".
 */
export function ListingForm({
  listing,
  accountType,
  defaultDisplayName,
}: {
  listing: ListingFormValues | null;
  accountType: AccountType;
  defaultDisplayName: string;
}) {
  const [state, formAction] = useActionState(saveListingAction, initialFormState);

  const selectedAreas = new Set(
    (state?.values?.areas ? state.values.areas.split(',') : listing?.areas) ?? [],
  );
  const selectedEmirates = new Set(
    (state?.values?.emirates ? state.values.emirates.split(',') : listing?.emirates) ?? [],
  );

  const text = (key: keyof ListingFormValues, fallback = '') =>
    state?.values?.[key] ?? ((listing?.[key] as string | null) ?? fallback);

  const isPublished = state?.values?.published
    ? true
    : listing?.published ?? false;
  const acceptsNewClients = state?.values?.acceptsNewClients
    ? true
    : listing?.acceptsNewClients ?? true;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="Your listing was not saved">
          {state.message}
        </Alert>
      ) : null}

      <Field
        label="Display name"
        htmlFor="displayName"
        required
        error={state?.fieldErrors?.displayName}
        hint={
          accountType === 'FIRM'
            ? 'Your firm name as it should appear in the directory.'
            : 'Your name as you wish to be listed.'
        }
      >
        <Input
          id="displayName"
          name="displayName"
          required
          maxLength={160}
          defaultValue={state?.values?.displayName ?? listing?.displayName ?? defaultDisplayName}
          error={state?.fieldErrors?.displayName}
        />
      </Field>

      <Field
        label="Headline"
        htmlFor="headline"
        error={state?.fieldErrors?.headline}
        hint="One line under your name, for example “Criminal defence · Dubai”."
      >
        <Input
          id="headline"
          name="headline"
          maxLength={160}
          defaultValue={text('headline')}
          error={state?.fieldErrors?.headline}
        />
      </Field>

      <Field
        label="About"
        htmlFor="bio"
        error={state?.fieldErrors?.bio}
        hint={`Appears on your public ${ACCOUNT_TYPE_LABEL[accountType].toLowerCase()} profile.`}
      >
        <Textarea
          id="bio"
          name="bio"
          rows={6}
          maxLength={3000}
          defaultValue={text('bio')}
          error={state?.fieldErrors?.bio}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Main emirate"
          htmlFor="primaryEmirate"
          required
          error={state?.fieldErrors?.primaryEmirate}
        >
          <Select
            id="primaryEmirate"
            name="primaryEmirate"
            required
            defaultValue={state?.values?.primaryEmirate ?? listing?.primaryEmirate ?? 'DUBAI'}
            error={state?.fieldErrors?.primaryEmirate}
          >
            {EMIRATES.map((emirate) => (
              <option key={emirate.value} value={emirate.value}>
                {emirate.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Years of experience"
          htmlFor="yearsOfExperience"
          error={state?.fieldErrors?.yearsOfExperience}
        >
          <Input
            id="yearsOfExperience"
            name="yearsOfExperience"
            type="number"
            min={0}
            max={80}
            defaultValue={state?.values?.yearsOfExperience ?? listing?.yearsOfExperience ?? ''}
            error={state?.fieldErrors?.yearsOfExperience}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">
          Emirates covered
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        </legend>
        <p className="mt-0.5 text-xs text-slate-500">
          Used by the directory&rsquo;s emirate filter. Must include your main emirate.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EMIRATES.map((emirate) => (
            <ChipCheckbox
              key={emirate.value}
              id={`listing-emirate-${emirate.value}`}
              name="emirates"
              value={emirate.value}
              label={emirate.label}
              defaultChecked={selectedEmirates.has(emirate.value)}
            />
          ))}
        </div>
        {state?.fieldErrors?.emirates ? (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
            {state.fieldErrors.emirates}
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">
          Areas of law
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        </legend>
        <p className="mt-0.5 text-xs text-slate-500">
          Used by the directory&rsquo;s legal-type filter. Select every area you actually practise.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEGAL_AREAS.map((area) => (
            <ChipCheckbox
              key={area.value}
              id={`listing-area-${area.value}`}
              name="areas"
              value={area.value}
              label={area.label}
              defaultChecked={selectedAreas.has(area.value)}
            />
          ))}
        </div>
        {state?.fieldErrors?.areas ? (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
            {state.fieldErrors.areas}
          </p>
        ) : null}
      </fieldset>

      <Field
        label="Languages"
        htmlFor="languages"
        required
        error={state?.fieldErrors?.languages}
        hint="Separate with commas, for example: Arabic, English, French."
      >
        <Input
          id="languages"
          name="languages"
          required
          defaultValue={(state?.values?.languages ?? listing?.languages?.join(', ')) ?? 'Arabic, English'}
          error={state?.fieldErrors?.languages}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Contact email"
          htmlFor="contactEmail"
          error={state?.fieldErrors?.contactEmail}
          hint="Published. Leave blank to keep your account email private."
        >
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={text('contactEmail')}
            error={state?.fieldErrors?.contactEmail}
          />
        </Field>

        <Field label="Contact phone" htmlFor="contactPhone" error={state?.fieldErrors?.contactPhone}>
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            defaultValue={text('contactPhone')}
            error={state?.fieldErrors?.contactPhone}
          />
        </Field>
      </div>

      <Field
        label="Practice address in the UAE"
        htmlFor="addressLine"
        error={state?.fieldErrors?.addressLine}
        hint="Published, so a client can see where you actually are. For example: Office 1204, Sample Tower, Sheikh Zayed Road, Dubai."
      >
        <Input
          id="addressLine"
          name="addressLine"
          maxLength={300}
          defaultValue={text('addressLine')}
          error={state?.fieldErrors?.addressLine}
        />
      </Field>

      <Field label="Website" htmlFor="listingWebsite" error={state?.fieldErrors?.website}>
        <Input
          id="listingWebsite"
          name="website"
          inputMode="url"
          placeholder="https://example.ae"
          defaultValue={text('website')}
          error={state?.fieldErrors?.website}
        />
      </Field>

      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">Visibility</legend>
        <Checkbox
          id="acceptsNewClients"
          name="acceptsNewClients"
          label="I am accepting new clients"
          description="Uncheck to show visitors that you are not taking new instructions."
          defaultChecked={acceptsNewClients}
        />
        <Checkbox
          id="published"
          name="published"
          label="Publish this listing in the public directory"
          description="Leave unchecked to keep it as a private draft only you can see."
          defaultChecked={isPublished}
        />
      </fieldset>

      <SubmitButton size="lg" pendingLabel="Saving…">
        Save listing
      </SubmitButton>
    </form>
  );
}
