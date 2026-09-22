'use client';

import { useActionState } from 'react';
import {
  saveFirmCredentialAction,
  saveLawyerCredentialAction,
} from '@/app/actions/profile-actions';
import { initialFormState } from '@/lib/form-state';
import { EMIRATES } from '@/lib/constants';
import { toDateInputValue } from '@/lib/format';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Select } from '@/components/ui/primitives';

type LawyerValues = {
  licenseNumber: string;
  licensingAuthority: string;
  licenseIssuedOn: Date | null;
  licenseExpiresOn: Date | null;
  yearsOfExperience: number | null;
  barAssociationNumber: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankIban: string | null;
  bankAccountNumber: string | null;
  bankSwift: string | null;
  bankBranch: string | null;
  bankInstructions: string | null;
};

/**
 * The legal information a lawyer account must supply. Required before the
 * account can be submitted for verification.
 */
export function LawyerCredentialForm({ credential }: { credential: LawyerValues | null }) {
  const [state, formAction] = useActionState(saveLawyerCredentialAction, initialFormState);

  const text = (key: 'licenseNumber' | 'licensingAuthority' | 'barAssociationNumber', fallback = '') =>
    state?.values?.[key] ?? (credential?.[key] as string | null) ?? fallback;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="Your licence details were not saved">
          {state.message}
        </Alert>
      ) : null}

      <Field
        label="Licence number"
        htmlFor="licenseNumber"
        required
        error={state?.fieldErrors?.licenseNumber}
        hint="The number on your permit or licence to provide legal representation in the UAE."
      >
        <Input
          id="licenseNumber"
          name="licenseNumber"
          required
          maxLength={80}
          defaultValue={text('licenseNumber')}
          error={state?.fieldErrors?.licenseNumber}
        />
      </Field>

      <Field
        label="Licensing authority"
        htmlFor="licensingAuthority"
        required
        error={state?.fieldErrors?.licensingAuthority}
        hint="For example the Dubai Legal Affairs Department, or the UAE Ministry of Justice."
      >
        <Input
          id="licensingAuthority"
          name="licensingAuthority"
          required
          maxLength={160}
          defaultValue={text('licensingAuthority')}
          error={state?.fieldErrors?.licensingAuthority}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Issued on" htmlFor="licenseIssuedOn" error={state?.fieldErrors?.licenseIssuedOn}>
          <Input
            id="licenseIssuedOn"
            name="licenseIssuedOn"
            type="date"
            defaultValue={state?.values?.licenseIssuedOn ?? toDateInputValue(credential?.licenseIssuedOn ?? null)}
            error={state?.fieldErrors?.licenseIssuedOn}
          />
        </Field>

        <Field
          label="Valid until"
          htmlFor="licenseExpiresOn"
          error={state?.fieldErrors?.licenseExpiresOn}
          hint="Shown on your public profile once verified."
        >
          <Input
            id="licenseExpiresOn"
            name="licenseExpiresOn"
            type="date"
            defaultValue={state?.values?.licenseExpiresOn ?? toDateInputValue(credential?.licenseExpiresOn ?? null)}
            error={state?.fieldErrors?.licenseExpiresOn}
          />
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
            defaultValue={state?.values?.yearsOfExperience ?? credential?.yearsOfExperience ?? ''}
            error={state?.fieldErrors?.yearsOfExperience}
          />
        </Field>

        <Field
          label="Bar association number"
          htmlFor="barAssociationNumber"
          error={state?.fieldErrors?.barAssociationNumber}
        >
          <Input
            id="barAssociationNumber"
            name="barAssociationNumber"
            maxLength={80}
            defaultValue={text('barAssociationNumber')}
            error={state?.fieldErrors?.barAssociationNumber}
          />
        </Field>
      </div>

      <p className="text-xs text-slate-500">
        You must also upload the licence itself under Documents. Changing the licence number after
        approval withdraws your verified badge.
      </p>

      <SubmitButton size="lg" pendingLabel="Saving…">
        Save licence details
      </SubmitButton>

      {/* ── Where a client sends a fee ──────────────────────────────────────
          Fee requests are paid by bank transfer, and these are copied onto each
          request when it is raised, so a client always has somewhere to send the
          money. Optional here so the rest of the form can be saved without them;
          a fee cannot be raised until they are filled in. */}
      <fieldset className="space-y-5 border-t border-slate-100 pt-5">
        <legend className="text-sm font-semibold text-slate-900">Bank details for fee requests</legend>
        <p className="text-xs text-slate-500">
          Shown to a client on a fee request, and printed on the receipt. Nothing here is published in
          the directory.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account holder name" htmlFor="bankAccountName" error={state?.fieldErrors?.bankAccountName}>
            <Input
              id="bankAccountName"
              name="bankAccountName"
              maxLength={160}
              defaultValue={state?.values?.bankAccountName ?? credential?.bankAccountName ?? ''}
              error={state?.fieldErrors?.bankAccountName}
            />
          </Field>

          <Field label="Bank" htmlFor="bankName" error={state?.fieldErrors?.bankName}>
            <Input
              id="bankName"
              name="bankName"
              maxLength={160}
              defaultValue={state?.values?.bankName ?? credential?.bankName ?? ''}
              error={state?.fieldErrors?.bankName}
            />
          </Field>

          <Field label="IBAN" htmlFor="bankIban" error={state?.fieldErrors?.bankIban}>
            <Input
              id="bankIban"
              name="bankIban"
              maxLength={40}
              defaultValue={state?.values?.bankIban ?? credential?.bankIban ?? ''}
              error={state?.fieldErrors?.bankIban}
              placeholder="AE07 0331 2345 6789 0123 456"
              className="font-mono"
            />
          </Field>

          <Field
            label="Account number"
            htmlFor="bankAccountNumber"
            error={state?.fieldErrors?.bankAccountNumber}
            hint="Only if the client should use this instead of the IBAN."
          >
            <Input
              id="bankAccountNumber"
              name="bankAccountNumber"
              maxLength={40}
              defaultValue={state?.values?.bankAccountNumber ?? credential?.bankAccountNumber ?? ''}
              error={state?.fieldErrors?.bankAccountNumber}
              className="font-mono"
            />
          </Field>

          <Field label="SWIFT / BIC" htmlFor="bankSwift" error={state?.fieldErrors?.bankSwift}>
            <Input
              id="bankSwift"
              name="bankSwift"
              maxLength={20}
              defaultValue={state?.values?.bankSwift ?? credential?.bankSwift ?? ''}
              error={state?.fieldErrors?.bankSwift}
              className="font-mono uppercase"
            />
          </Field>

          <Field label="Branch" htmlFor="bankBranch" error={state?.fieldErrors?.bankBranch}>
            <Input
              id="bankBranch"
              name="bankBranch"
              maxLength={160}
              defaultValue={state?.values?.bankBranch ?? credential?.bankBranch ?? ''}
              error={state?.fieldErrors?.bankBranch}
            />
          </Field>
        </div>

        <Field
          label="Transfer instructions"
          htmlFor="bankInstructions"
          error={state?.fieldErrors?.bankInstructions}
          hint="Anything the client should quote or know, such as the reference to use."
        >
          <Input
            id="bankInstructions"
            name="bankInstructions"
            maxLength={1000}
            defaultValue={state?.values?.bankInstructions ?? credential?.bankInstructions ?? ''}
            error={state?.fieldErrors?.bankInstructions}
          />
        </Field>
      </fieldset>
    </form>
  );
}

type FirmValues = {
  legalName: string;
  tradeLicenseNumber: string;
  tradeLicenseAuthority: string;
  tradeLicenseIssuedOn: Date | null;
  tradeLicenseExpiresOn: Date | null;
  legalStructure: string | null;
  registeredEmirate: string | null;
  registeredAddress: string | null;
  website: string | null;
  firmSize: number | null;
  authorisedSignatory: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankIban: string | null;
  bankAccountNumber: string | null;
  bankSwift: string | null;
  bankBranch: string | null;
  bankInstructions: string | null;
};

/** The legal information a legal-firm account must supply. */
export function FirmCredentialForm({ credential }: { credential: FirmValues | null }) {
  const [state, formAction] = useActionState(saveFirmCredentialAction, initialFormState);

  const text = (
    key: 'legalName' | 'tradeLicenseNumber' | 'tradeLicenseAuthority' | 'legalStructure' | 'registeredAddress' | 'website' | 'authorisedSignatory',
    fallback = '',
  ) => state?.values?.[key] ?? (credential?.[key] as string | null) ?? fallback;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="Your firm details were not saved">
          {state.message}
        </Alert>
      ) : null}

      <Field
        label="Registered legal name"
        htmlFor="legalName"
        required
        error={state?.fieldErrors?.legalName}
        hint="Exactly as it appears on the trade licence."
      >
        <Input
          id="legalName"
          name="legalName"
          required
          maxLength={200}
          defaultValue={text('legalName')}
          error={state?.fieldErrors?.legalName}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Trade licence number"
          htmlFor="tradeLicenseNumber"
          required
          error={state?.fieldErrors?.tradeLicenseNumber}
        >
          <Input
            id="tradeLicenseNumber"
            name="tradeLicenseNumber"
            required
            maxLength={80}
            defaultValue={text('tradeLicenseNumber')}
            error={state?.fieldErrors?.tradeLicenseNumber}
          />
        </Field>

        <Field
          label="Licensing authority"
          htmlFor="tradeLicenseAuthority"
          required
          error={state?.fieldErrors?.tradeLicenseAuthority}
          hint="For example Dubai Economy and Tourism, or a free-zone authority."
        >
          <Input
            id="tradeLicenseAuthority"
            name="tradeLicenseAuthority"
            required
            maxLength={160}
            defaultValue={text('tradeLicenseAuthority')}
            error={state?.fieldErrors?.tradeLicenseAuthority}
          />
        </Field>

        <Field label="Issued on" htmlFor="tradeLicenseIssuedOn" error={state?.fieldErrors?.tradeLicenseIssuedOn}>
          <Input
            id="tradeLicenseIssuedOn"
            name="tradeLicenseIssuedOn"
            type="date"
            defaultValue={
              state?.values?.tradeLicenseIssuedOn ?? toDateInputValue(credential?.tradeLicenseIssuedOn ?? null)
            }
            error={state?.fieldErrors?.tradeLicenseIssuedOn}
          />
        </Field>

        <Field label="Valid until" htmlFor="tradeLicenseExpiresOn" error={state?.fieldErrors?.tradeLicenseExpiresOn}>
          <Input
            id="tradeLicenseExpiresOn"
            name="tradeLicenseExpiresOn"
            type="date"
            defaultValue={
              state?.values?.tradeLicenseExpiresOn ?? toDateInputValue(credential?.tradeLicenseExpiresOn ?? null)
            }
            error={state?.fieldErrors?.tradeLicenseExpiresOn}
          />
        </Field>

        <Field
          label="Legal structure"
          htmlFor="legalStructure"
          error={state?.fieldErrors?.legalStructure}
          hint="For example LLC, Sole Establishment, Civil Company."
        >
          <Input
            id="legalStructure"
            name="legalStructure"
            maxLength={80}
            defaultValue={text('legalStructure')}
            error={state?.fieldErrors?.legalStructure}
          />
        </Field>

        <Field label="Registered emirate" htmlFor="registeredEmirate" error={state?.fieldErrors?.registeredEmirate}>
          <Select
            id="registeredEmirate"
            name="registeredEmirate"
            defaultValue={state?.values?.registeredEmirate ?? credential?.registeredEmirate ?? ''}
            error={state?.fieldErrors?.registeredEmirate}
          >
            <option value="">Not stated</option>
            {EMIRATES.map((emirate) => (
              <option key={emirate.value} value={emirate.value}>
                {emirate.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Number of lawyers" htmlFor="firmSize" error={state?.fieldErrors?.firmSize}>
          <Input
            id="firmSize"
            name="firmSize"
            type="number"
            min={0}
            max={5000}
            defaultValue={state?.values?.firmSize ?? credential?.firmSize ?? ''}
            error={state?.fieldErrors?.firmSize}
          />
        </Field>

        <Field
          label="Authorised signatory"
          htmlFor="authorisedSignatory"
          error={state?.fieldErrors?.authorisedSignatory}
          hint="The person named on the licence who may act for the firm."
        >
          <Input
            id="authorisedSignatory"
            name="authorisedSignatory"
            maxLength={160}
            defaultValue={text('authorisedSignatory')}
            error={state?.fieldErrors?.authorisedSignatory}
          />
        </Field>
      </div>

      <Field
        label="Registered address"
        htmlFor="registeredAddress"
        error={state?.fieldErrors?.registeredAddress}
      >
        <Input
          id="registeredAddress"
          name="registeredAddress"
          maxLength={300}
          defaultValue={text('registeredAddress')}
          error={state?.fieldErrors?.registeredAddress}
        />
      </Field>

      <Field
        label="Website"
        htmlFor="firmWebsite"
        error={state?.fieldErrors?.website}
        hint="Optional. Shown on your public profile once verified."
      >
        <Input
          id="firmWebsite"
          name="website"
          inputMode="url"
          placeholder="https://example.ae"
          defaultValue={text('website')}
          error={state?.fieldErrors?.website}
        />
      </Field>

      <p className="text-xs text-slate-500">
        You must also upload the trade licence and the licence of the legal professional through
        whom the firm provides representation. Changing the trade licence number after approval
        withdraws your verified badge.
      </p>

      <SubmitButton size="lg" pendingLabel="Saving…">
        Save firm details
      </SubmitButton>

      {/* ── Where a client sends a fee ──────────────────────────────────────
          Fee requests are paid by bank transfer, and these are copied onto each
          request when it is raised, so a client always has somewhere to send the
          money. Optional here so the rest of the form can be saved without them;
          a fee cannot be raised until they are filled in. */}
      <fieldset className="space-y-5 border-t border-slate-100 pt-5">
        <legend className="text-sm font-semibold text-slate-900">Bank details for fee requests</legend>
        <p className="text-xs text-slate-500">
          Shown to a client on a fee request, and printed on the receipt. Nothing here is published in
          the directory.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account holder name" htmlFor="bankAccountName" error={state?.fieldErrors?.bankAccountName}>
            <Input
              id="bankAccountName"
              name="bankAccountName"
              maxLength={160}
              defaultValue={state?.values?.bankAccountName ?? credential?.bankAccountName ?? ''}
              error={state?.fieldErrors?.bankAccountName}
            />
          </Field>

          <Field label="Bank" htmlFor="bankName" error={state?.fieldErrors?.bankName}>
            <Input
              id="bankName"
              name="bankName"
              maxLength={160}
              defaultValue={state?.values?.bankName ?? credential?.bankName ?? ''}
              error={state?.fieldErrors?.bankName}
            />
          </Field>

          <Field label="IBAN" htmlFor="bankIban" error={state?.fieldErrors?.bankIban}>
            <Input
              id="bankIban"
              name="bankIban"
              maxLength={40}
              defaultValue={state?.values?.bankIban ?? credential?.bankIban ?? ''}
              error={state?.fieldErrors?.bankIban}
              placeholder="AE07 0331 2345 6789 0123 456"
              className="font-mono"
            />
          </Field>

          <Field
            label="Account number"
            htmlFor="bankAccountNumber"
            error={state?.fieldErrors?.bankAccountNumber}
            hint="Only if the client should use this instead of the IBAN."
          >
            <Input
              id="bankAccountNumber"
              name="bankAccountNumber"
              maxLength={40}
              defaultValue={state?.values?.bankAccountNumber ?? credential?.bankAccountNumber ?? ''}
              error={state?.fieldErrors?.bankAccountNumber}
              className="font-mono"
            />
          </Field>

          <Field label="SWIFT / BIC" htmlFor="bankSwift" error={state?.fieldErrors?.bankSwift}>
            <Input
              id="bankSwift"
              name="bankSwift"
              maxLength={20}
              defaultValue={state?.values?.bankSwift ?? credential?.bankSwift ?? ''}
              error={state?.fieldErrors?.bankSwift}
              className="font-mono uppercase"
            />
          </Field>

          <Field label="Branch" htmlFor="bankBranch" error={state?.fieldErrors?.bankBranch}>
            <Input
              id="bankBranch"
              name="bankBranch"
              maxLength={160}
              defaultValue={state?.values?.bankBranch ?? credential?.bankBranch ?? ''}
              error={state?.fieldErrors?.bankBranch}
            />
          </Field>
        </div>

        <Field
          label="Transfer instructions"
          htmlFor="bankInstructions"
          error={state?.fieldErrors?.bankInstructions}
          hint="Anything the client should quote or know, such as the reference to use."
        >
          <Input
            id="bankInstructions"
            name="bankInstructions"
            maxLength={1000}
            defaultValue={state?.values?.bankInstructions ?? credential?.bankInstructions ?? ''}
            error={state?.fieldErrors?.bankInstructions}
          />
        </Field>
      </fieldset>
    </form>
  );
}
