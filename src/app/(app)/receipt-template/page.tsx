import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import { getReceiptTemplate } from '@/server/services/receipt-template-service';
import { prisma } from '@/lib/db';
import { ReceiptLayoutForm } from '@/components/forms/ReceiptLayoutForm';
import { BrandLockup, LogoMark } from '@/components/layout/Logo';
import { Alert, buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Receipt layout' };

/**
 * The billing letterhead, for a lawyer or a firm.
 *
 * Two choices, and the default is the one that needs no configuration. The
 * platform mark is always on the receipt, whichever layout is chosen: a receipt
 * is issued through Dubai Legal, and the person holding it should be able to see
 * where it came from.
 */
export default async function ReceiptTemplatePage() {
  const user = await requireProfessional();

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
    'My practice';

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <h1 className="text-2xl font-semibold text-slate-900">Receipt layout</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Every fee you raise produces a receipt the client can print. Choose whether it carries the
          standard Dubai Legal layout or a letterhead of your own. Your account starts on the standard
          layout, and you can change your mind at any time.
        </p>
      </header>

      <Card>
        <h2 className="font-semibold text-slate-900">What is on every receipt</h2>
        <p className="mt-1 mb-3 text-sm text-slate-600">
          Whichever layout you choose, a receipt always carries these. They are facts about a payment,
          not decoration.
        </p>
        <DescriptionList
          items={[
            { term: 'Amount', detail: 'In dirhams, from the fee you raised' },
            { term: 'Reason', detail: 'What the fee was for, and your description of it' },
            { term: 'Paid by', detail: 'The client, and the card used — never the full number' },
            { term: 'Receipt number', detail: 'Unique, and quoted if the payment is ever queried' },
            { term: 'Case', detail: 'The reference and title the fee belongs to' },
            { term: 'Dubai Legal mark', detail: 'Always present, on either layout' },
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
      />

      <Card>
        <h2 className="font-semibold text-slate-900">Where this appears</h2>
        <p className="mt-1 text-sm text-slate-600">
          The receipt a client sees after paying a fee, and the copy they print or save as a PDF.
          Administrators use the standard layout and cannot change it — the platform mark is theirs by
          definition.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/payments" className={buttonClasses('secondary', 'md')}>
            Receipts I have issued
          </Link>
          <Link href="/account" className={buttonClasses('ghost', 'md')}>
            Account and security
          </Link>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <BrandLockup markSize={40} />
        </div>
      </Card>

      {!template || template.layout !== 'CUSTOM' ? (
        <Alert tone="info" title="You are on the standard layout">
          That is a complete, correct receipt and nothing is missing from it. A custom letterhead is
          for practices that already have their own branding.
        </Alert>
      ) : null}
    </div>
  );
}
