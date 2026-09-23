import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { requireActiveUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { paymentPurposeLabel } from '@/lib/i18n/labels';
import { getReceiptForViewer } from '@/server/services/payment-service';
import { receiptPresentationForPayment } from '@/server/services/receipt-template-service';
import { formatMoney, maskCard } from '@/lib/payment-format';
import { formatUaeDateTime } from '@/lib/time';
import { ReceiptActions } from '@/components/forms/ReceiptActions';
import { LogoMark } from '@/components/layout/Logo';
import { BrandLockup } from '@/components/layout/BrandLockup';
import { Alert, Card, DescriptionList } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.memberCases.receipt.receipt };
}

/**
 * The receipt for a paid fee.
 *
 * It carries exactly what a receipt should: what was paid, for what, to whom,
 * when, with what card, and the case it belongs to. The letterhead is the
 * professional's choice — the standard Legal Dash layout, or their own — and the
 * Legal Dash mark is on the document either way, because a receipt issued
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
  const [{ t, effectiveLocale }, user] = await Promise.all([getI18n(), requireActiveUser()]);
  const labels = t.memberCases.receipt;
  const [{ id }, { paid }] = await Promise.all([params, searchParams]);

  const payment = await getReceiptForViewer(id, user.id);
  if (!payment) notFound();

  const legalCase = payment.case;
  const presentation = await receiptPresentationForPayment(payment);
  const custom = presentation.mode === 'CUSTOM';

  const receiptNumber = payment.receiptNumber ?? labels.notIssued;
  const isClient = legalCase.clientId === user.id;
  const accent = presentation.accentColor ?? '#132E4C';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm print:hidden" aria-label={t.memberCases.breadcrumb}>
        <Link href={`/cases/${legalCase.id}`} className="text-brand-700 hover:underline">
          {labels.backToCase.replace('{reference}', legalCase.reference)}
        </Link>
      </nav>

      {paid === '1' && payment.status === 'PAID' ? (
        <Alert tone="success" title={labels.paymentComplete} className="print:hidden">
          {isClient ? labels.paymentCompleteClient : labels.paymentCompleteProfessional}
        </Alert>
      ) : null}

      {payment.status !== 'PAID' ? (
        <Alert tone="warning" title={labels.notPaid} className="print:hidden">
          {payment.status === 'CANCELLED' ? labels.notPaidBodyWithdrawn : labels.notPaidBodyPending}
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
              {labels.receipt}
            </p>
            <p className="font-mono text-sm text-slate-900">{receiptNumber}</p>
          </div>
        </header>

        <div className="flex flex-wrap items-end justify-between gap-4 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {labels.amountPaid}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
              {formatMoney(payment.amountFils, payment.currency, effectiveLocale)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {labels.status}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {payment.status === 'PAID'
                ? labels.paid
                : payment.status === 'CANCELLED'
                  ? labels.withdrawn
                  : labels.awaitingPayment}
            </p>
          </div>
        </div>

        <DescriptionList
          items={[
            { term: labels.reason, detail: paymentPurposeLabel(t, payment.purpose) },
            ...(payment.details ? [{ term: labels.details, detail: payment.details }] : []),
            ...(custom
              ? [{ term: labels.paidTo, detail: presentation.brandName }]
              : [{ term: labels.paidTo, detail: presentation.professionalName }]),
            ...(presentation.showLicence && legalCase.lawyer
              ? [
                  {
                    term: labels.lawyer,
                    detail: labels.licenceDetail
                      .replace(
                        '{name}',
                        legalCase.lawyer.user.profile?.fullName?.trim() ||
                          legalCase.lawyer.user.email,
                      )
                      .replace('{number}', legalCase.lawyer.licenseNumber)
                      .replace('{authority}', legalCase.lawyer.licensingAuthority),
                  },
                ]
              : []),
            ...(presentation.showFirm && legalCase.firm
              ? [
                  {
                    term: labels.firm,
                    detail: labels.firmDetail
                      .replace('{name}', legalCase.firm.legalName)
                      .replace('{number}', legalCase.firm.tradeLicenseNumber),
                  },
                ]
              : []),
            ...(presentation.showContact
              ? [
                  {
                    term: labels.contact,
                    detail: [payment.requestedBy.email, payment.requestedBy.profile?.phone]
                      .filter(Boolean)
                      .join(' · '),
                  },
                ]
              : []),
            {
              term: labels.paidBy,
              detail: payment.paidBy?.profile?.fullName?.trim() || payment.paidBy?.email || '—',
            },
            {
              term: labels.method,
              detail:
                payment.method === 'CARD'
                  ? maskCard(payment.cardBrand, payment.cardLast4)
                  : payment.method === 'BANK_TRANSFER'
                    ? labels.bankTransfer
                    : labels.notRecorded,
            },
            {
              term: labels.paidOn,
              detail: payment.paidAt
                ? formatUaeDateTime(payment.paidAt, effectiveLocale)
                : labels.notPaidDetail,
            },
            { term: labels.case, detail: `${legalCase.reference} — ${legalCase.title}` },
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
              <LogoMark size={30} title="Legal Dash" />
              <p className="text-xs text-slate-500">
                {labels.issuedThrough.replace('{number}', receiptNumber)}
              </p>
            </div>
          ) : null}

          <p className={`text-xs leading-relaxed text-slate-500 ${custom ? 'mt-3' : ''}`}>
            <strong className="font-medium text-slate-700">{labels.simulatedTitle}</strong>
            {labels.simulatedBody}
          </p>
        </div>
      </Card>

      <ReceiptActions
        caseId={legalCase.id}
        receiptNumber={receiptNumber}
        labels={t.memberCases.receiptActions}
      />
    </div>
  );
}
