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
 * The bank fields, which the two forms below show identically. The field names
 * are the shared bank vocabulary from the dictionary, resolved on the server.
 */
export type BankLabels = {
  title: string;
  intro: string;
  accountHolder: string;
  bankName: string;
  iban: string;
  accountNumber: string;
  accountNumberHint: string;
  swift: string;
  branch: string;
  instructions: string;
  instructionsHint: string;
};

/** The words the lawyer credential form shows, in the reader's language. */
export type LawyerCredentialFormLabels = {
  notSavedTitle: string;
  licenceNumber: string;
  licenceNumberHint: string;
  licensingAuthority: string;
  licensingAuthorityHint: string;
  issuedOn: string;
  validUntil: string;
  validUntilHint: string;
  yearsOfExperience: string;
  barAssociationNumber: string;
  uploadNote: string;
  save: string;
  saving: string;
  bank: BankLabels;
};

/**
 * The legal information a lawyer account must supply. Required before the
 * account can be submitted for verification.
 */
export function LawyerCredentialForm({
  credential,
  labels,
}: {
  credential: LawyerValues | null;
  labels: LawyerCredentialFormLabels;
}) {
  const [state, formAction] = useActionState(saveLawyerCredentialAction, initialFormState);

  const text = (key: 'licenseNumber' | 'licensingAuthority' | 'barAssociationNumber', fallback = '') =>
    state?.values?.[key] ?? (credential?.[key] as string | null) ?? fallback;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.notSavedTitle}>
          {state.message}
        </Alert>
      ) : null}

      <Field
        label={labels.licenceNumber}
        htmlFor="licenseNumber"
        required
        error={state?.fieldErrors?.licenseNumber}
        hint={labels.licenceNumberHint}
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
        label={labels.licensingAuthority}
        htmlFor="licensingAuthority"
        required
        error={state?.fieldErrors?.licensingAuthority}
        hint={labels.licensingAuthorityHint}
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
        <Field label={labels.issuedOn} htmlFor="licenseIssuedOn" error={state?.fieldErrors?.licenseIssuedOn}>
          <Input
            id="licenseIssuedOn"
            name="licenseIssuedOn"
            type="date"
            defaultValue={state?.values?.licenseIssuedOn ?? toDateInputValue(credential?.licenseIssuedOn ?? null)}
            error={state?.fieldErrors?.licenseIssuedOn}
          />
        </Field>

        <Field
          label={labels.validUntil}
          htmlFor="licenseExpiresOn"
          error={state?.fieldErrors?.licenseExpiresOn}
          hint={labels.validUntilHint}
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
            defaultValue={state?.values?.yearsOfExperience ?? credential?.yearsOfExperience ?? ''}
            error={state?.fieldErrors?.yearsOfExperience}
          />
        </Field>

        <Field
          label={labels.barAssociationNumber}
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

      <p className="text-xs text-slate-500">{labels.uploadNote}</p>

      <SubmitButton size="lg" pendingLabel={labels.saving}>
        {labels.save}
      </SubmitButton>

      {/* ── Where a client sends a fee ──────────────────────────────────────
          Fee requests are paid by bank transfer, and these are copied onto each
          request when it is raised, so a client always has somewhere to send the
          money. Optional here so the rest of the form can be saved without them;
          a fee cannot be raised until they are filled in. */}
      <fieldset className="space-y-5 border-t border-slate-100 pt-5">
        <legend className="text-sm font-semibold text-slate-900">{labels.bank.title}</legend>
        <p className="text-xs text-slate-500">{labels.bank.intro}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={labels.bank.accountHolder} htmlFor="bankAccountName" error={state?.fieldErrors?.bankAccountName}>
            <Input
              id="bankAccountName"
              name="bankAccountName"
              maxLength={160}
              defaultValue={state?.values?.bankAccountName ?? credential?.bankAccountName ?? ''}
              error={state?.fieldErrors?.bankAccountName}
            />
          </Field>

          <Field label={labels.bank.bankName} htmlFor="bankName" error={state?.fieldErrors?.bankName}>
            <Input
              id="bankName"
              name="bankName"
              maxLength={160}
              defaultValue={state?.values?.bankName ?? credential?.bankName ?? ''}
              error={state?.fieldErrors?.bankName}
            />
          </Field>

          <Field label={labels.bank.iban} htmlFor="bankIban" error={state?.fieldErrors?.bankIban}>
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
            label={labels.bank.accountNumber}
            htmlFor="bankAccountNumber"
            error={state?.fieldErrors?.bankAccountNumber}
            hint={labels.bank.accountNumberHint}
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

          <Field label={labels.bank.swift} htmlFor="bankSwift" error={state?.fieldErrors?.bankSwift}>
            <Input
              id="bankSwift"
              name="bankSwift"
              maxLength={20}
              defaultValue={state?.values?.bankSwift ?? credential?.bankSwift ?? ''}
              error={state?.fieldErrors?.bankSwift}
              className="font-mono uppercase"
            />
          </Field>

          <Field label={labels.bank.branch} htmlFor="bankBranch" error={state?.fieldErrors?.bankBranch}>
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
          label={labels.bank.instructions}
          htmlFor="bankInstructions"
          error={state?.fieldErrors?.bankInstructions}
          hint={labels.bank.instructionsHint}
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

/** The words the firm credential form shows, in the reader's language. */
export type FirmCredentialFormLabels = {
  notSavedTitle: string;
  legalName: string;
  legalNameHint: string;
  tradeLicenceNumber: string;
  licensingAuthority: string;
  licensingAuthorityHint: string;
  issuedOn: string;
  validUntil: string;
  legalStructure: string;
  legalStructureHint: string;
  registeredEmirate: string;
  notStated: string;
  numberOfLawyers: string;
  authorisedSignatory: string;
  authorisedSignatoryHint: string;
  registeredAddress: string;
  website: string;
  websiteHint: string;
  uploadNote: string;
  save: string;
  saving: string;
  emirateLabels: Record<string, string>;
  bank: BankLabels;
};

/** The legal information a legal-firm account must supply. */
export function FirmCredentialForm({
  credential,
  labels,
}: {
  credential: FirmValues | null;
  labels: FirmCredentialFormLabels;
}) {
  const [state, formAction] = useActionState(saveFirmCredentialAction, initialFormState);

  const text = (
    key: 'legalName' | 'tradeLicenseNumber' | 'tradeLicenseAuthority' | 'legalStructure' | 'registeredAddress' | 'website' | 'authorisedSignatory',
    fallback = '',
  ) => state?.values?.[key] ?? (credential?.[key] as string | null) ?? fallback;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.notSavedTitle}>
          {state.message}
        </Alert>
      ) : null}

      <Field
        label={labels.legalName}
        htmlFor="legalName"
        required
        error={state?.fieldErrors?.legalName}
        hint={labels.legalNameHint}
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
          label={labels.tradeLicenceNumber}
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
          label={labels.licensingAuthority}
          htmlFor="tradeLicenseAuthority"
          required
          error={state?.fieldErrors?.tradeLicenseAuthority}
          hint={labels.licensingAuthorityHint}
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

        <Field label={labels.issuedOn} htmlFor="tradeLicenseIssuedOn" error={state?.fieldErrors?.tradeLicenseIssuedOn}>
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

        <Field label={labels.validUntil} htmlFor="tradeLicenseExpiresOn" error={state?.fieldErrors?.tradeLicenseExpiresOn}>
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
          label={labels.legalStructure}
          htmlFor="legalStructure"
          error={state?.fieldErrors?.legalStructure}
          hint={labels.legalStructureHint}
        >
          <Input
            id="legalStructure"
            name="legalStructure"
            maxLength={80}
            defaultValue={text('legalStructure')}
            error={state?.fieldErrors?.legalStructure}
          />
        </Field>

        <Field label={labels.registeredEmirate} htmlFor="registeredEmirate" error={state?.fieldErrors?.registeredEmirate}>
          <Select
            id="registeredEmirate"
            name="registeredEmirate"
            defaultValue={state?.values?.registeredEmirate ?? credential?.registeredEmirate ?? ''}
            error={state?.fieldErrors?.registeredEmirate}
          >
            <option value="">{labels.notStated}</option>
            {EMIRATES.map((emirate) => (
              <option key={emirate.value} value={emirate.value}>
                {labels.emirateLabels[emirate.value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={labels.numberOfLawyers} htmlFor="firmSize" error={state?.fieldErrors?.firmSize}>
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
          label={labels.authorisedSignatory}
          htmlFor="authorisedSignatory"
          error={state?.fieldErrors?.authorisedSignatory}
          hint={labels.authorisedSignatoryHint}
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
        label={labels.registeredAddress}
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
        label={labels.website}
        htmlFor="firmWebsite"
        error={state?.fieldErrors?.website}
        hint={labels.websiteHint}
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

      <p className="text-xs text-slate-500">{labels.uploadNote}</p>

      <SubmitButton size="lg" pendingLabel={labels.saving}>
        {labels.save}
      </SubmitButton>

      {/* ── Where a client sends a fee ──────────────────────────────────────
          Fee requests are paid by bank transfer, and these are copied onto each
          request when it is raised, so a client always has somewhere to send the
          money. Optional here so the rest of the form can be saved without them;
          a fee cannot be raised until they are filled in. */}
      <fieldset className="space-y-5 border-t border-slate-100 pt-5">
        <legend className="text-sm font-semibold text-slate-900">{labels.bank.title}</legend>
        <p className="text-xs text-slate-500">{labels.bank.intro}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={labels.bank.accountHolder} htmlFor="bankAccountName" error={state?.fieldErrors?.bankAccountName}>
            <Input
              id="bankAccountName"
              name="bankAccountName"
              maxLength={160}
              defaultValue={state?.values?.bankAccountName ?? credential?.bankAccountName ?? ''}
              error={state?.fieldErrors?.bankAccountName}
            />
          </Field>

          <Field label={labels.bank.bankName} htmlFor="bankName" error={state?.fieldErrors?.bankName}>
            <Input
              id="bankName"
              name="bankName"
              maxLength={160}
              defaultValue={state?.values?.bankName ?? credential?.bankName ?? ''}
              error={state?.fieldErrors?.bankName}
            />
          </Field>

          <Field label={labels.bank.iban} htmlFor="bankIban" error={state?.fieldErrors?.bankIban}>
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
            label={labels.bank.accountNumber}
            htmlFor="bankAccountNumber"
            error={state?.fieldErrors?.bankAccountNumber}
            hint={labels.bank.accountNumberHint}
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

          <Field label={labels.bank.swift} htmlFor="bankSwift" error={state?.fieldErrors?.bankSwift}>
            <Input
              id="bankSwift"
              name="bankSwift"
              maxLength={20}
              defaultValue={state?.values?.bankSwift ?? credential?.bankSwift ?? ''}
              error={state?.fieldErrors?.bankSwift}
              className="font-mono uppercase"
            />
          </Field>

          <Field label={labels.bank.branch} htmlFor="bankBranch" error={state?.fieldErrors?.bankBranch}>
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
          label={labels.bank.instructions}
          htmlFor="bankInstructions"
          error={state?.fieldErrors?.bankInstructions}
          hint={labels.bank.instructionsHint}
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
