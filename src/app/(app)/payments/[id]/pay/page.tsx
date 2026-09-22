import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireMember } from '@/lib/auth';
import { BankTransferForm } from '@/components/forms/BankTransferForm';
import { bankTransferLines } from '@/server/services/payment-service';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';
import { PAYMENT_PURPOSES } from '@/lib/payment-purposes';

export const metadata: Metadata = { title: 'Pay a fee' };

const PURPOSE_LABEL: Map<string, string> = new Map(
  PAYMENT_PURPOSES.map((entry) => [entry.value, entry.label]),
);

/**
 * The page a client reaches from the pay button on a fee card.
 *
 * A fee is paid by bank transfer: the account details the professional attached
 * to the request are here, and the client records the transfer once they have
 * made it. Card payment is offered as a choice and says plainly that it is still
 * being built, rather than showing a form that cannot work. Only the client on
 * the case can open this, and only while the request is still awaiting payment.
 */
export default async function PayFeePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ method?: string }>;
}) {
  const user = await requireMember();
  const [{ id }, { method }] = await Promise.all([params, searchParams]);
  const chosen = method === 'card' ? ('CARD' as const) : ('TRANSFER' as const);

  const payment = await prisma.paymentRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      amountFils: true,
      purpose: true,
      details: true,
      caseId: true,
      case: {
        select: {
          clientId: true,
          reference: true,
          title: true,
          lawyer: { select: { user: { select: { profile: { select: { fullName: true } } } } } },
          firm: { select: { legalName: true } },
        },
      },
      requestedBy: { select: { email: true, profile: { select: { fullName: true } } } },
      bankAccountName: true,
      bankName: true,
      bankIban: true,
      bankAccountNumber: true,
      bankSwift: true,
      bankBranch: true,
      bankInstructions: true,
    },
  });

  if (!payment) notFound();
  if (payment.case.clientId !== user.id) notFound();

  // Already settled: the receipt is the page they want, not the card form.
  if (payment.status === 'PAID') redirect(`/payments/${payment.id}/receipt`);
  if (payment.status === 'CANCELLED') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">This fee was withdrawn</h1>
          <p className="mt-2 text-sm text-slate-600">
            The professional withdrew this request on case {payment.case.reference}, so there is
            nothing to pay.
          </p>
          <Link href={`/cases/${payment.caseId}`} className={buttonClasses('secondary', 'md', 'mt-4')}>
            Back to the case
          </Link>
        </Card>
      </div>
    );
  }

  const professionalName =
    payment.requestedBy.profile?.fullName?.trim() ||
    payment.case.firm?.legalName ||
    payment.case.lawyer?.user.profile?.fullName?.trim() ||
    payment.requestedBy.email;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm print:hidden" aria-label="Breadcrumb">
        <Link href={`/cases/${payment.caseId}`} className="text-brand-700 hover:underline">
          ← Back to case {payment.case.reference}
        </Link>
      </nav>

      <header className="print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900">Pay a fee</h1>
        <p className="mt-1 text-sm text-slate-600">
          For case {payment.case.reference} — {payment.case.title}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Payable to {professionalName}. Fees on this installation are settled by bank transfer.
        </p>
      </header>

      {payment.details ? (
        <Alert tone="neutral" title={PURPOSE_LABEL.get(payment.purpose) ?? 'Fee'}>
          <p className="whitespace-pre-line">{payment.details}</p>
        </Alert>
      ) : null}

      <Card>
        <BankTransferForm
          paymentId={payment.id}
          caseId={payment.caseId}
          amountFils={payment.amountFils}
          purposeLabel={PURPOSE_LABEL.get(payment.purpose) ?? 'Fee'}
          reference={payment.case.reference}
          lines={bankTransferLines({
            bankAccountName: payment.bankAccountName,
            bankName: payment.bankName,
            bankIban: payment.bankIban,
            bankAccountNumber: payment.bankAccountNumber,
            bankSwift: payment.bankSwift,
            bankBranch: payment.bankBranch,
            bankInstructions: payment.bankInstructions,
          })}
          instructions={payment.bankInstructions}
          method={chosen}
        />
      </Card>
    </div>
  );
}
