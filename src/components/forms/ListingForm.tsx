'use client';

import { useActionState } from 'react';
import { saveListingAction } from '@/app/actions/profile-actions';
import { initialFormState } from '@/lib/form-state';
import { EMIRATES, LEGAL_AREAS } from '@/lib/constants';
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
  /** The emirate, for a listing in the United Arab Emirates. Null elsewhere. */
  primaryEmirate: string | null;
  emirates: string[];
  /** The worldwide description of the same place, for everywhere else. */
  primaryCountryCode?: string | null;
  primaryDivisionCode?: string | null;
  primaryLocality?: string | null;
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
 * The words this form shows, resolved on the server so the client bundle never
 * has to carry the whole dictionary.
 *
 * `emirateLabels` and `areaLabels` are the shared names of the emirates and the
 * areas of law, keyed by the stored code; the values come from the dictionary's
 * label vocabulary, so they are translated with everything else.
 */
export type ListingFormLabels = {
  notSavedTitle: string;
  displayName: string;
  displayNameHint: string;
  headline: string;
  headlineHint: string;
  about: string;
  aboutHint: string;
  mainEmirate: string;
  yearsOfExperience: string;
  emiratesCovered: string;
  emiratesHelp: string;
  areasOfLaw: string;
  areasHelp: string;
  languages: string;
  languagesHint: string;
  languagesDefault: string;
  contactEmail: string;
  contactEmailHint: string;
  contactPhone: string;
  practiceAddress: string;
  practiceAddressHint: string;
  website: string;
  visibility: string;
  acceptingClients: string;
  acceptingClientsHint: string;
  publishListing: string;
  publishListingHint: string;
  saveListing: string;
  saving: string;
  emirateLabels: Record<string, string>;
  areaLabels: Record<string, string>;
};

/**
 * The public directory entry. Publishing is explicit: a saved listing stays a
 * private draft until the member ticks "publish".
 */
export function ListingForm({
  listing,
  defaultDisplayName,
  labels,
}: {
  listing: ListingFormValues | null;
  defaultDisplayName: string;
  labels: ListingFormLabels;
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
        <Alert tone="error" title={labels.notSavedTitle}>
          {state.message}
        </Alert>
      ) : null}

      <Field
        label={labels.displayName}
        htmlFor="displayName"
        required
        error={state?.fieldErrors?.displayName}
        hint={labels.displayNameHint}
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
        label={labels.headline}
        htmlFor="headline"
        error={state?.fieldErrors?.headline}
        hint={labels.headlineHint}
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
        label={labels.about}
        htmlFor="bio"
        error={state?.fieldErrors?.bio}
        hint={labels.aboutHint}
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
          label={labels.mainEmirate}
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
                {labels.emirateLabels[emirate.value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={labels.yearsOfExperience}
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
          {labels.emiratesCovered}
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        </legend>
        <p className="mt-0.5 text-xs text-slate-500">{labels.emiratesHelp}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EMIRATES.map((emirate) => (
            <ChipCheckbox
              key={emirate.value}
              id={`listing-emirate-${emirate.value}`}
              name="emirates"
              value={emirate.value}
              label={labels.emirateLabels[emirate.value]}
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
          {labels.areasOfLaw}
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        </legend>
        <p className="mt-0.5 text-xs text-slate-500">{labels.areasHelp}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEGAL_AREAS.map((area) => (
            <ChipCheckbox
              key={area.value}
              id={`listing-area-${area.value}`}
              name="areas"
              value={area.value}
              label={labels.areaLabels[area.value]}
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
        label={labels.languages}
        htmlFor="languages"
        required
        error={state?.fieldErrors?.languages}
        hint={labels.languagesHint}
      >
        <Input
          id="languages"
          name="languages"
          required
          defaultValue={
            (state?.values?.languages ?? listing?.languages?.join(', ')) ?? labels.languagesDefault
          }
          error={state?.fieldErrors?.languages}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={labels.contactEmail}
          htmlFor="contactEmail"
          error={state?.fieldErrors?.contactEmail}
          hint={labels.contactEmailHint}
        >
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={text('contactEmail')}
            error={state?.fieldErrors?.contactEmail}
          />
        </Field>

        <Field
          label={labels.contactPhone}
          htmlFor="contactPhone"
          error={state?.fieldErrors?.contactPhone}
        >
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
        label={labels.practiceAddress}
        htmlFor="addressLine"
        error={state?.fieldErrors?.addressLine}
        hint={labels.practiceAddressHint}
      >
        <Input
          id="addressLine"
          name="addressLine"
          maxLength={300}
          defaultValue={text('addressLine')}
          error={state?.fieldErrors?.addressLine}
        />
      </Field>

      <Field label={labels.website} htmlFor="listingWebsite" error={state?.fieldErrors?.website}>
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
        <legend className="px-1 text-sm font-semibold text-slate-900">{labels.visibility}</legend>
        <Checkbox
          id="acceptsNewClients"
          name="acceptsNewClients"
          label={labels.acceptingClients}
          description={labels.acceptingClientsHint}
          defaultChecked={acceptsNewClients}
        />
        <Checkbox
          id="published"
          name="published"
          label={labels.publishListing}
          description={labels.publishListingHint}
          defaultChecked={isPublished}
        />
      </fieldset>

      <SubmitButton size="lg" pendingLabel={labels.saving}>
        {labels.saveListing}
      </SubmitButton>
    </form>
  );
}
