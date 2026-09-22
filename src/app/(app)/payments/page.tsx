import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { listPaymentsForUser } from '@/server/services/payment-service';
import { getReceiptTemplate } from '@/server/services/receipt-template-service';
import { PAYMENT_PURPOSES } from '@/lib/payment-purposes';
import { formatMoney, formatAed } from '@/lib/payment-format';
import { formatUaeDateTime } from '@/lib/time';
import { LogoMark } from '@/components/layout/Logo';
import { Alert, buttonClasses, Card, cx, EmptyState } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Fees and receipts' };

const PURPOSE_LABEL: Map<string, string> = new Map(
  PAYMENT_PURPOSES.map((entry) => [entry.value, entry.label]),
);

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: 'bg-amber-50 text-amber-900 ring-amber-200',
  PAID: 'bg-green-50 text-green-800 ring-green-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Payment pending',
  PAID: 'Payment completed',
  CANCELLED: 'Withdrawn',
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
  const user = await requireMember();
  const isProfessional = user.accountType === 'LAWYER' || user.accountType === 'FIRM';

  const [payments, template] = await Promise.all([
    listPaymentsForUser(user.id),
    isProfessional ? getReceiptTemplate(user.id) : Promise.resolve(null),
  ]);

  const awaiting = payments.filter(
    (payment) => payment.status === 'REQUESTED' && payment.case.clientId === user.id,
  );
  const paid = payments.filter((payment) => payment.status === 'PAID');

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <LogoMark size={38} />
          <h1 className="text-2xl font-semibold text-slate-900">Fees and receipts</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Every fee raised on a case you are part of. Paying one issues a receipt you can print or
          save; the receipt carries the professional&rsquo;s letterhead, with the Dubai Legal mark on
          it either way.
        </p>
      </header>

      {isProfessional ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">Your receipt layout</h2>
              <p className="mt-1 text-sm text-slate-600">
                {template?.layout === 'CUSTOM'
                  ? 'Your own letterhead is used on the receipts you raise.'
                  : 'The standard Dubai Legal layout is used on the receipts you raise.'}
              </p>
            </div>
            <Link href="/receipt-template" className={buttonClasses('secondary', 'md')}>
              Change the layout
            </Link>
          </div>
        </Card>
      ) : null}

      {awaiting.length > 0 ? (
        <Alert tone="warning" title={`${awaiting.length} fee${awaiting.length === 1 ? '' : 's'} waiting for you`}>
          Open the case to pay by card. A receipt is issued as soon as the payment is confirmed.
        </Alert>
      ) : null}

      {payments.length === 0 ? (
        <EmptyState
          title="No fees yet"
          description={
            isProfessional
              ? 'Raise a fee from inside a case you have accepted; it appears here with its receipt.'
              : 'When a professional asks you for a fee, it appears here and inside the case conversation.'
          }
          action={
            <Link href={isProfessional ? '/portfolio' : '/cases'} className={buttonClasses('primary', 'md')}>
              {isProfessional ? 'Open my portfolio' : 'Open my cases'}
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
                        {formatMoney(payment.amountFils, payment.currency)}
                      </p>
                      <span
                        className={cx(
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                          STATUS_STYLE[payment.status] ?? 'bg-slate-100 text-slate-600 ring-slate-200',
                        )}
                      >
                        {STATUS_LABEL[payment.status] ?? payment.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      {PURPOSE_LABEL.get(payment.purpose) ?? payment.purpose} ·{' '}
                      {payment.case.reference} — {payment.case.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Raised {formatUaeDateTime(payment.createdAt)}
                      {payment.receiptNumber ? ` · receipt ${payment.receiptNumber}` : ''}
                      {payer ? ` · paid by ${payer}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {payment.status === 'PAID' ? (
                      <Link
                        href={`/payments/${payment.id}/receipt`}
                        className={buttonClasses('secondary', 'sm')}
                      >
                        Receipt
                      </Link>
                    ) : null}
                    {payment.status === 'REQUESTED' && isClient ? (
                      <Link
                        href={`/payments/${payment.id}/pay`}
                        className={buttonClasses('primary', 'sm')}
                      >
                        Pay {formatMoney(payment.amountFils, payment.currency)}
                      </Link>
                    ) : null}
                    <Link href={`/cases/${payment.case.id}`} className={buttonClasses('ghost', 'sm')}>
                      Open the case
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
          {paid.length} receipt{paid.length === 1 ? '' : 's'} issued. Payments on this installation are
          simulated: no card is charged and no money moves.
        </p>
      ) : null}
    </div>
  );
}
