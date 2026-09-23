import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { bankFieldLabel, emirateLabel } from '@/lib/i18n/labels';
import { EMIRATES } from '@/lib/constants';
import { getCredentials } from '@/server/services/credential-service';
import {
  FirmCredentialForm,
  LawyerCredentialForm,
  type BankLabels,
} from '@/components/forms/CredentialForms';
import { Alert, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Legal details' };

export default async function CredentialsPage() {
  const user = await requireMember();

  if (user.accountType === 'USER') redirect('/dashboard');

  const [{ t }, { lawyer, firm }] = await Promise.all([
    getI18n(),
    getCredentials(user.id, user.accountType),
  ]);
  const isFirm = user.accountType === 'FIRM';

  const emirateLabels = Object.fromEntries(
    EMIRATES.map((emirate) => [emirate.value, emirateLabel(t, emirate.value)]),
  );

  const bank: BankLabels = {
    title: t.memberPro.credentials.bankTitle,
    intro: t.memberPro.credentials.bankIntro,
    accountHolder: bankFieldLabel(t, 'accountHolder'),
    bankName: bankFieldLabel(t, 'bankName'),
    iban: bankFieldLabel(t, 'iban'),
    accountNumber: bankFieldLabel(t, 'accountNumber'),
    accountNumberHint: t.memberPro.credentials.bankAccountNumberHint,
    swift: bankFieldLabel(t, 'swift'),
    branch: bankFieldLabel(t, 'branch'),
    instructions: bankFieldLabel(t, 'instructions'),
    instructionsHint: t.memberPro.credentials.bankInstructionsHint,
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          {isFirm ? t.memberPro.credentials.firmTitle : t.memberPro.credentials.lawyerTitle}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {isFirm ? t.memberPro.credentials.firmIntro : t.memberPro.credentials.lawyerIntro}
        </p>
      </header>

      <Alert tone="info" title={t.memberPro.credentials.checkedTitle}>
        {t.memberPro.credentials.checkedBody}
      </Alert>

      <Card>
        {isFirm ? (
          <FirmCredentialForm
            credential={
              firm
                ? {
                    legalName: firm.legalName,
                    tradeLicenseNumber: firm.tradeLicenseNumber,
                    tradeLicenseAuthority: firm.tradeLicenseAuthority,
                    tradeLicenseIssuedOn: firm.tradeLicenseIssuedOn,
                    tradeLicenseExpiresOn: firm.tradeLicenseExpiresOn,
                    legalStructure: firm.legalStructure,
                    registeredEmirate: firm.registeredEmirate,
                    registeredAddress: firm.registeredAddress,
                    website: firm.website,
                    firmSize: firm.firmSize,
                    authorisedSignatory: firm.authorisedSignatory,
                    bankAccountName: firm.bankAccountName,
                    bankName: firm.bankName,
                    bankIban: firm.bankIban,
                    bankAccountNumber: firm.bankAccountNumber,
                    bankSwift: firm.bankSwift,
                    bankBranch: firm.bankBranch,
                    bankInstructions: firm.bankInstructions,
                  }
                : null
            }
            labels={{
              notSavedTitle: t.memberPro.credentials.firmNotSavedTitle,
              legalName: t.memberPro.credentials.legalName,
              legalNameHint: t.memberPro.credentials.legalNameHint,
              tradeLicenceNumber: t.memberPro.credentials.tradeLicenceNumber,
              licensingAuthority: t.memberPro.credentials.licensingAuthority,
              licensingAuthorityHint: t.memberPro.credentials.licensingAuthorityHintFirm,
              issuedOn: t.memberPro.credentials.issuedOn,
              validUntil: t.memberPro.credentials.validUntil,
              legalStructure: t.memberPro.credentials.legalStructure,
              legalStructureHint: t.memberPro.credentials.legalStructureHint,
              registeredEmirate: t.memberPro.credentials.registeredEmirate,
              notStated: t.memberPro.credentials.notStated,
              numberOfLawyers: t.memberPro.credentials.numberOfLawyers,
              authorisedSignatory: t.memberPro.credentials.authorisedSignatory,
              authorisedSignatoryHint: t.memberPro.credentials.authorisedSignatoryHint,
              registeredAddress: t.memberPro.credentials.registeredAddress,
              website: t.memberPro.credentials.website,
              websiteHint: t.memberPro.credentials.websiteHint,
              uploadNote: t.memberPro.credentials.firmUploadNote,
              save: t.memberPro.credentials.saveFirm,
              saving: t.memberPro.credentials.saving,
              emirateLabels,
              bank,
            }}
          />
        ) : (
          <LawyerCredentialForm
            credential={
              lawyer
                ? {
                    licenseNumber: lawyer.licenseNumber,
                    licensingAuthority: lawyer.licensingAuthority,
                    licenseIssuedOn: lawyer.licenseIssuedOn,
                    licenseExpiresOn: lawyer.licenseExpiresOn,
                    yearsOfExperience: lawyer.yearsOfExperience,
                    barAssociationNumber: lawyer.barAssociationNumber,
                    bankAccountName: lawyer.bankAccountName,
                    bankName: lawyer.bankName,
                    bankIban: lawyer.bankIban,
                    bankAccountNumber: lawyer.bankAccountNumber,
                    bankSwift: lawyer.bankSwift,
                    bankBranch: lawyer.bankBranch,
                    bankInstructions: lawyer.bankInstructions,
                  }
                : null
            }
            labels={{
              notSavedTitle: t.memberPro.credentials.licenceNotSavedTitle,
              licenceNumber: t.memberPro.credentials.licenceNumber,
              licenceNumberHint: t.memberPro.credentials.licenceNumberHint,
              licensingAuthority: t.memberPro.credentials.licensingAuthority,
              licensingAuthorityHint: t.memberPro.credentials.licensingAuthorityHintLawyer,
              issuedOn: t.memberPro.credentials.issuedOn,
              validUntil: t.memberPro.credentials.validUntil,
              validUntilHint: t.memberPro.credentials.validUntilHint,
              yearsOfExperience: t.memberPro.credentials.yearsOfExperience,
              barAssociationNumber: t.memberPro.credentials.barAssociationNumber,
              uploadNote: t.memberPro.credentials.licenceUploadNote,
              save: t.memberPro.credentials.saveLicence,
              saving: t.memberPro.credentials.saving,
              bank,
            }}
          />
        )}
      </Card>
    </div>
  );
}
