import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { paymentPurposeLabel } from '@/lib/i18n/labels';
import { listPaymentsForUser } from '@/server/services/payment-service';
import { getReceiptTemplate } from '@/server/services/receipt-template-service';
import { formatMoney } from '@/lib/payment-format';
import { formatUaeDateTime } from '@/lib/time';
import { LogoMark } from '@/components/layout/Logo';
import { Alert, buttonClasses, Card, cx, EmptyState } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.memberCases.fees.title };
}

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: 'bg-amber-50 text-amber-900 ring-amber-200',
  PAID: 'bg-green-50 text-green-800 ring-green-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/**
 * Every fee this account is part of, from either side.
 *
 * A client sees what they have been asked for and can pay; a professional sees
 * what they have raised and can reopen the receipt. This is also where the
 * receipt layout is reached from, because it is the page that shows what the
 * layout produces.
 */
export default async function PaymentsPage() {
  const [{ t, effectiveLocale }, user] = await Promise.all([getI18n(), requireMember()]);
  const labels = t.memberCases.fees;
  const isProfessional = user.accountType === 'LAWYER' || user.accountType === 'FIRM';

  const [payments, template] = await Promise.all([
    listPaymentsForUser(user.id),
    isProfessional ? getReceiptTemplate(user.id) : Promise.resolve(null),
  ]);

  const awaiting = payments.filter(
    (payment) => payment.status === 'REQUESTED' && payment.case.clientId === user.id,
  );
  const paid = payments.filter((payment) => payment.status === 'PAID');

  const statusLabel = (status: string) =>
    status === 'PAID'
      ? labels.statusPaid
      : status === 'CANCELLED'
        ? labels.statusCancelled
        : labels.statusRequested;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <LogoMark size={38} />
          <h1 className="text-2xl font-semibold text-slate-900">{labels.title}</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{labels.intro}</p>
      </header>

      {isProfessional ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">{labels.yourReceiptLayout}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {template?.layout === 'CUSTOM' ? labels.customLayout : labels.standardLayout}
              </p>
            </div>
            <Link href="/receipt-template" className={buttonClasses('secondary', 'md')}>
              {labels.changeLayout}
            </Link>
          </div>
        </Card>
      ) : null}

      {awaiting.length > 0 ? (
        <Alert
          tone="warning"
          title={(awaiting.length === 1 ? labels.waitingOne : labels.waitingMany).replace(
            '{count}',
            String(awaiting.length),
          )}
        >
          {labels.waitingBody}
        </Alert>
      ) : null}

      {payments.length === 0 ? (
        <EmptyState
          title={labels.noFees}
          description={isProfessional ? labels.noFeesProfessional : labels.noFeesClient}
          action={
            <Link href={isProfessional ? '/portfolio' : '/cases'} className={buttonClasses('primary', 'md')}>
              {isProfessional ? labels.openMyPortfolio : labels.openMyCases}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {payments.map((payment) => {
            const isClient = payment.case.clientId === user.id;
            const payer = payment.paidBy?.profile?.fullName?.trim() || payment.paidBy?.email;
            return (
              <Card as="li" key={payment.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold tabular-nums text-slate-900">
                        {formatMoney(payment.amountFils, payment.currency, effectiveLocale)}
                      </p>
                      <span
                        className={cx(
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                          STATUS_STYLE[payment.status] ?? 'bg-slate-100 text-slate-600 ring-slate-200',
                        )}
                      >
                        {statusLabel(payment.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      {paymentPurposeLabel(t, payment.purpose)} ·{' '}
                      {payment.case.reference} — {payment.case.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {labels.raised.replace('{date}', formatUaeDateTime(payment.createdAt, effectiveLocale))}
                      {payment.receiptNumber
                        ? labels.receiptRef.replace('{number}', payment.receiptNumber)
                        : ''}
                      {payer ? labels.paidBy.replace('{name}', payer) : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {payment.status === 'PAID' ? (
                      <Link
                        href={`/payments/${payment.id}/receipt`}
                        className={buttonClasses('secondary', 'sm')}
                      >
                        {labels.receipt}
                      </Link>
                    ) : null}
                    {payment.status === 'REQUESTED' && isClient ? (
                      <Link
                        href={`/payments/${payment.id}/pay`}
                        className={buttonClasses('primary', 'sm')}
                      >
                        {labels.payAmount.replace(
                          '{amount}',
                          formatMoney(payment.amountFils, payment.currency),
                        )}
                      </Link>
                    ) : null}
                    <Link href={`/cases/${payment.case.id}`} className={buttonClasses('ghost', 'sm')}>
                      {labels.openCase}
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      {paid.length > 0 ? (
        <p className="text-xs text-slate-500">
          {(paid.length === 1 ? labels.issuedOne : labels.issuedMany).replace(
            '{count}',
            String(paid.length),
          )}
        </p>
      ) : null}
    </div>
  );
}
