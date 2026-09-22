import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { getCredentials } from '@/server/services/credential-service';
import { FirmCredentialForm, LawyerCredentialForm } from '@/components/forms/CredentialForms';
import { Alert, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Legal details' };

export default async function CredentialsPage() {
  const user = await requireMember();

  if (user.accountType === 'USER') redirect('/dashboard');

  const { lawyer, firm } = await getCredentials(user.id, user.accountType);
  const isFirm = user.accountType === 'FIRM';

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          {isFirm ? 'Firm legal registration' : 'Your legal licence'}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {isFirm
            ? 'A legal firm must be able to show both its own registration and the licence of the legal professional through whom it provides representation.'
            : 'Your permission to provide legal representation in the United Arab Emirates.'}
        </p>
      </header>

      <Alert tone="info" title="These details are checked against your documents">
        A reviewer compares what you enter here with the documents you upload. If the number
        changes after your account is approved, the badge is withdrawn and the account is reviewed
        again.
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
          />
        )}
      </Card>
    </div>
  );
}
