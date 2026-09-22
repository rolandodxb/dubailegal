import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { requireActiveUser } from '@/lib/auth';
import { getReceiptForViewer } from '@/server/services/payment-service';
import { receiptPresentationForPayment } from '@/server/services/receipt-template-service';
import { PAYMENT_PURPOSES } from '@/lib/payment-purposes';
import { formatMoney, formatAed, maskCard } from '@/lib/payment-format';
import { formatUaeDateTime } from '@/lib/time';
import { ReceiptActions } from '@/components/forms/ReceiptActions';
import { BrandLockup, LogoMark } from '@/components/layout/Logo';
import { Alert, Card, DescriptionList } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Receipt' };

const PURPOSE_LABEL: Map<string, string> = new Map(
  PAYMENT_PURPOSES.map((entry) => [entry.value, entry.label]),
);

/**
 * The receipt for a paid fee.
 *
 * It carries exactly what a receipt should: what was paid, for what, to whom,
 * when, with what card, and the case it belongs to. The letterhead is the
 * professional's choice — the standard Dubai Legal layout, or their own — and the
 * Dubai Legal mark is on the document either way, because a receipt issued
 * through this platform should say so.
 *
 * It is printable, so the browser's "Save as PDF" turns it into a file, after
 * which the page returns to the conversation. Both sides of the case can open it.
 */
export default async function PaymentReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const user = await requireActiveUser();
  const [{ id }, { paid }] = await Promise.all([params, searchParams]);

  const payment = await getReceiptForViewer(id, user.id);
  if (!payment) notFound();

  const legalCase = payment.case;
  const presentation = await receiptPresentationForPayment(payment);
  const custom = presentation.mode === 'CUSTOM';

  const receiptNumber = payment.receiptNumber ?? 'Not issued';
  const isClient = legalCase.clientId === user.id;
  const accent = presentation.accentColor ?? '#132E4C';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm print:hidden" aria-label="Breadcrumb">
        <Link href={`/cases/${legalCase.id}`} className="text-brand-700 hover:underline">
          ← Back to case {legalCase.reference}
        </Link>
      </nav>

      {paid === '1' && payment.status === 'PAID' ? (
        <Alert tone="success" title="Payment complete" className="print:hidden">
          {isClient
            ? 'The payment is recorded and the professional has been told. Download or print the receipt below, then send your proof of payment so it is in the case file too.'
            : 'The client has completed the payment for this fee.'}
        </Alert>
      ) : null}

      {payment.status !== 'PAID' ? (
        <Alert tone="warning" title="This fee has not been paid" className="print:hidden">
          There is no receipt to print, because this request is{' '}
          {payment.status === 'CANCELLED' ? 'withdrawn' : 'still awaiting payment'}.
        </Alert>
      ) : null}

      {/* ── The receipt itself ─────────────────────────────────────────── */}
      <Card className="dl-print-plain">
        <header
          className="flex flex-wrap items-start justify-between gap-4 border-b pb-5"
          style={{ borderColor: custom ? `${accent}33` : '#E2E8F0' }}
        >
          {/* The professional's letterhead, or ours. The mark is the artwork as
              supplied, with no plate behind it. */}
          {custom && presentation.logoUrl ? (
            <div className="flex items-center gap-3">
              <Image
                src={presentation.logoUrl}
                alt=""
                aria-hidden="true"
                width={56}
                height={56}
                unoptimized
                style={{ height: 56, width: 'auto', objectFit: 'contain' }}
              />
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight" style={{ color: accent }}>
                  {presentation.brandName}
                </p>
                {presentation.tagline ? (
                  <p className="mt-0.5 text-xs text-slate-500">{presentation.tagline}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <BrandLockup markSize={48} />
          )}

          <div className="text-right">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: custom ? accent : '#64748B' }}
            >
              Receipt
            </p>
            <p className="font-mono text-sm text-slate-900">{receiptNumber}</p>
          </div>
        </header>

        <div className="flex flex-wrap items-end justify-between gap-4 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Amount paid</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
              {formatMoney(payment.amountFils, payment.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {payment.status === 'PAID'
                ? 'Paid'
                : payment.status === 'CANCELLED'
                  ? 'Withdrawn'
                  : 'Awaiting payment'}
            </p>
          </div>
        </div>

        <DescriptionList
          items={[
            { term: 'Reason', detail: PURPOSE_LABEL.get(payment.purpose) ?? payment.purpose },
            ...(payment.details ? [{ term: 'Details', detail: payment.details }] : []),
            ...(custom
              ? [{ term: 'Paid to', detail: presentation.brandName }]
              : [{ term: 'Paid to', detail: presentation.professionalName }]),
            ...(presentation.showLicence && legalCase.lawyer
              ? [
                  {
                    term: 'Lawyer',
                    detail: `${legalCase.lawyer.user.profile?.fullName?.trim() || legalCase.lawyer.user.email} · licence ${legalCase.lawyer.licenseNumber} (${legalCase.lawyer.licensingAuthority})`,
                  },
                ]
              : []),
            ...(presentation.showFirm && legalCase.firm
              ? [
                  {
                    term: 'Firm',
                    detail: `${legalCase.firm.legalName} · trade licence ${legalCase.firm.tradeLicenseNumber}`,
                  },
                ]
              : []),
            ...(presentation.showContact
              ? [
                  {
                    term: 'Contact',
                    detail: [payment.requestedBy.email, payment.requestedBy.profile?.phone]
                      .filter(Boolean)
                      .join(' · '),
                  },
                ]
              : []),
            {
              term: 'Paid by',
              detail: payment.paidBy?.profile?.fullName?.trim() || payment.paidBy?.email || '—',
            },
            {
              term: 'Method',
              detail:
                payment.method === 'CARD'
                  ? maskCard(payment.cardBrand, payment.cardLast4)
                  : payment.method === 'BANK_TRANSFER'
                    ? 'Bank transfer'
                    : 'Not recorded',
            },
            { term: 'Paid on', detail: payment.paidAt ? formatUaeDateTime(payment.paidAt) : 'Not paid' },
            { term: 'Case', detail: `${legalCase.reference} — ${legalCase.title}` },
          ]}
        />

        {presentation.footerNote ? (
          <p
            className="mt-6 whitespace-pre-line border-t pt-4 text-xs leading-relaxed text-slate-600"
            style={{ borderColor: `${accent}33` }}
          >
            {presentation.footerNote}
          </p>
        ) : null}

        {/* On a custom letterhead the platform mark sits at the foot instead, so
            the receipt still says where it was issued. */}
        <div className="mt-6 border-t border-slate-200 pt-4">
          {custom ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <LogoMark size={30} title="Dubai Legal" />
              <p className="text-xs text-slate-500">
                Issued through Dubai Legal · receipt {receiptNumber}
              </p>
            </div>
          ) : null}

          <p className={`text-xs leading-relaxed text-slate-500 ${custom ? 'mt-3' : ''}`}>
            <strong className="font-medium text-slate-700">Simulated payment.</strong> Dubai Legal has
            no payment provider connected. No card was charged and no money moved between these
            parties; this receipt records what the client and the professional agreed and confirmed
            inside the application. It is not a tax invoice.
          </p>
        </div>
      </Card>

      <ReceiptActions caseId={legalCase.id} receiptNumber={receiptNumber} />
    </div>
  );
}
