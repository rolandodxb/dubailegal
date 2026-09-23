import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { getReceiptTemplate } from '@/server/services/receipt-template-service';
import { prisma } from '@/lib/db';
import { ReceiptLayoutForm } from '@/components/forms/ReceiptLayoutForm';
import { LogoMark } from '@/components/layout/Logo';
import { BrandLockup } from '@/components/layout/BrandLockup';
import { Alert, buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.memberCases.receiptTemplate.title };
}

/**
 * The billing letterhead, for a lawyer or a firm.
 *
 * Two choices, and the default is the one that needs no configuration. The
 * platform mark is always on the receipt, whichever layout is chosen: a receipt
 * is issued through Legal Dash, and the person holding it should be able to see
 * where it came from.
 */
export default async function ReceiptTemplatePage() {
  const [{ t }, user] = await Promise.all([getI18n(), requireProfessional()]);
  const labels = t.memberCases.receiptTemplate;

  const [template, account] = await Promise.all([
    getReceiptTemplate(user.id),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        profile: { select: { fullName: true } },
        lawyerProfile: { select: { licenseNumber: true, licensingAuthority: true } },
        firmProfile: { select: { legalName: true, tradeLicenseNumber: true } },
      },
    }),
  ]);

  const professionalName =
    account?.firmProfile?.legalName ||
    account?.profile?.fullName?.trim() ||
    account?.email ||
    labels.myPractice;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <h1 className="text-2xl font-semibold text-slate-900">{labels.title}</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{labels.intro}</p>
      </header>

      <Card>
        <h2 className="font-semibold text-slate-900">{labels.whatIsOn}</h2>
        <p className="mt-1 mb-3 text-sm text-slate-600">{labels.whatIsOnBody}</p>
        <DescriptionList
          items={[
            { term: labels.amount, detail: labels.amountDetail },
            { term: labels.reason, detail: labels.reasonDetail },
            { term: labels.paidBy, detail: labels.paidByDetail },
            { term: labels.receiptNumber, detail: labels.receiptNumberDetail },
            { term: labels.case, detail: labels.caseDetail },
            { term: labels.mark, detail: labels.markDetail },
          ]}
        />
      </Card>

      <ReceiptLayoutForm
        layout={template?.layout === 'CUSTOM' ? 'CUSTOM' : 'STANDARD'}
        brandName={template?.brandName ?? ''}
        headerLine={template?.headerLine ?? ''}
        footerNote={template?.footerNote ?? ''}
        accentColor={template?.accentColor ?? ''}
        logoUrl={template?.logoDocumentId ? `/api/documents/${template.logoDocumentId}` : null}
        showLicence={template?.showLicence ?? true}
        showFirm={template?.showFirm ?? true}
        showContact={template?.showContact ?? false}
        professionalName={professionalName}
        labels={t.memberCases.receiptLayout}
      />

      <Card>
        <h2 className="font-semibold text-slate-900">{labels.whereAppears}</h2>
        <p className="mt-1 text-sm text-slate-600">{labels.whereAppearsBody}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/payments" className={buttonClasses('secondary', 'md')}>
            {labels.issuedReceipts}
          </Link>
          <Link href="/account" className={buttonClasses('ghost', 'md')}>
            {labels.accountSecurity}
          </Link>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <BrandLockup markSize={40} />
        </div>
      </Card>

      {!template || template.layout !== 'CUSTOM' ? (
        <Alert tone="info" title={labels.onStandard}>
          {labels.onStandardBody}
        </Alert>
      ) : null}
    </div>
  );
}
