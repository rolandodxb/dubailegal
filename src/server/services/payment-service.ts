import { z } from 'zod';
import { currencyForCountry, bankFieldsFor } from '@/lib/countries';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { deleteUpload, storeUpload, UploadRejected } from '@/lib/storage';
import { notify } from './notification-service';
import {
  cardBrandOf,
  cardLast4,
  digitsOnly,
  formatAed,
  luhnOk,
} from '@/lib/payment-format';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * Fees, simulated.
 *
 * **No money moves through this application.** There is no card processor and no
 * bank integration. What happens instead, in order:
 *
 *   1. A professional raises a fee request against a case they hold.
 *   2. The client pays at a simulated card form. The only thing kept from the
 *      card is its brand and its last four digits, exactly as a real processor
 *      would do — the number itself is never stored, logged or transmitted.
 *   3. A receipt is issued, which the client can print or save as a PDF.
 *   4. Only once the payment is complete is the client asked for proof of
 *      payment, which goes into the case conversation.
 *
 * Amounts are held in fils (1/100 of a dirham) as integers, so no rounding error
 * can ever touch money.
 */

export { PAYMENT_PURPOSES } from '@/lib/payment-purposes';

const createSchema = z.object({
  caseId: z.string().min(1),
  amountAed: z.coerce
    .number()
    .positive('Enter an amount greater than zero.')
    .max(1_000_000, 'That amount is too large.'),
  purpose: z.string().trim().min(2).max(40),
  details: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

/** The card form the client fills in. Validated field by field, as a real one is. */
const transferSchema = z.object({
  paymentId: z.string().min(1),
  // The reference the client's bank gave them. Required, because it is the one
  // thing the professional can match a transfer against.
  reference: z
    .string()
    .trim()
    .min(3, 'Enter the reference your bank gave you for the transfer.')
    .max(120, 'That reference is too long.'),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

const proofSchema = z.object({
  paymentId: z.string().min(1),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

const CANCELLABLE: string[] = ['REQUESTED'];

export { formatAed } from '@/lib/payment-format';

export async function listCasePayments(caseId: string) {
  return prisma.paymentRequest.findMany({
    where: { caseId },
    orderBy: { createdAt: 'asc' },
    include: {
      requestedBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      paidBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
    },
  });
}

/** Both cases this member is involved in, for the payments overview. */
export async function listPaymentsForUser(userId: string) {
  return prisma.paymentRequest.findMany({
    where: {
      OR: [
        { requestedById: userId },
        { case: { clientId: userId } },
        { case: { lawyer: { userId } } },
        { case: { firm: { userId } } },
        { case: { firm: { lawyers: { some: { userId } } } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      case: { select: { id: true, reference: true, title: true, clientId: true } },
      requestedBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      paidBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
    },
  });
}

/**
 * Raises a fee request.
 *
 * Only the professional side of an accepted case may ask for money, and only
 * once the case is assigned — never while it is still being reviewed, so a client
 * is never charged for a case nobody has taken.
 */
export async function requestPayment(
  requestedById: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ paymentId: string }>> {
  const parsed = createSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const legalCase = await prisma.legalCase.findUnique({
    where: { id: parsed.data.caseId },
    select: {
      id: true,
      reference: true,
      status: true,
      clientId: true,
      client: { select: { profile: { select: { countryOfResidenceCode: true } } } },
      lawyerId: true,
      firmId: true,
      /// The professional's country decides the currency: the fee is paid into
      /// their bank, in their money, on their terms.
      lawyer: {
        select: {
          userId: true,
          user: { select: { profile: { select: { countryOfResidenceCode: true } } } },
        },
      },
      firm: { select: { userId: true, lawyers: { select: { userId: true } } } },
    },
  });
  if (!legalCase) return failure('That case no longer exists.', { status: 404 });

  const isAssignedLawyer = legalCase.lawyer?.userId === requestedById;
  const isFirmMember =
    legalCase.firm !== null &&
    (legalCase.firm.userId === requestedById ||
      legalCase.firm.lawyers.some((row) => row.userId === requestedById));
  if (!isAssignedLawyer && !isFirmMember) {
    return failure('Only the professional handling this case can request a fee.', { status: 403 });
  }

  if (!['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(legalCase.status)) {
    return failure('A fee can be requested once the case has been accepted.');
  }

  // A fee is paid by bank transfer, so the professional's bank details have to be
  // on the request. They are copied rather than referenced: the request says what
  // the client was told at the time, and it does not change under them later.
  const bank = await bankingDetailsFor(requestedById);
  const missing = missingBankingFields(bank);
  if (missing.length > 0) {
    return failure(
      `Add your bank details before asking for a fee — a client has nowhere to send it otherwise. Still needed: ${missing.join(', ')}.`,
      { fieldErrors: { amountAed: 'Your bank details are incomplete.' } },
    );
  }

  const payment = await prisma.paymentRequest.create({
    data: {
      caseId: legalCase.id,
      requestedById,
      amountFils: Math.round(parsed.data.amountAed * 100),
      /**
       * The professional's money, not the client's.
       *
       * A fee is paid into the professional's bank account, so it is quoted in the
       * currency of the country they work in — and where the client is somewhere
       * else entirely, the professional's terms are the ones that apply. That is
       * the rule for instructing somebody abroad: you pay them the way their
       * country is paid. The client's own country is the fallback only when the
       * professional's has never been recorded, and the platform's own last.
       */
      currency: currencyForCountry(
        legalCase.lawyer?.user?.profile?.countryOfResidenceCode ??
          legalCase.client?.profile?.countryOfResidenceCode,
      ),
      purpose: parsed.data.purpose,
      details: parsed.data.details,
      status: 'REQUESTED',
      bankAccountName: bank.bankAccountName,
      bankName: bank.bankName,
      bankIban: bank.bankIban,
      bankAccountNumber: bank.bankAccountNumber,
      bankSwift: bank.bankSwift,
      bankBranch: bank.bankBranch,
      bankInstructions: bank.bankInstructions,
    },
    select: { id: true },
  });

  await notify({
    userId: legalCase.clientId,
    kind: 'payment.requested',
    title: `A fee of ${formatAed(Math.round(parsed.data.amountAed * 100))} was requested`,
    body: `On case ${legalCase.reference}. Open the case to see the details and pay.`,
    link: `/cases/${legalCase.id}`,
  });

  await recordAudit({
    actorUserId: requestedById,
    action: 'payment.requested',
    entityType: 'payment_request',
    entityId: payment.id,
    metadata: { caseId: legalCase.id, amountFils: Math.round(parsed.data.amountAed * 100) },
    ip: meta.ip ?? null,
  });

  return success({ paymentId: payment.id });
}

/**
 * A receipt number.
 *
 * Derived from the payment's own id rather than from a counter, so two payments
 * completing at the same moment can never be handed the same number.
 */
function receiptNumberFor(paymentId: string, attempt = 0): string {
  const year = new Date().getUTCFullYear();
  const stem = paymentId.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
  const suffix = attempt === 0 ? '' : `-${attempt}`;
  return `DL-${year}-${stem}${suffix}`;
}

/**
 * Whether a professional can be paid, and by whom.
 *
 * A fee request is a bank transfer, so these are required before one can be
 * raised. Kept here rather than in the form so the rule holds wherever a request
 * is created from.
 */
export type BankingDetails = {
  /// The country the account is held in, which decides what is required.
  bankCountryCode?: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankIban: string | null;
  bankAccountNumber: string | null;
  bankSwift: string | null;
  bankBranch: string | null;
  bankInstructions: string | null;
};

const BANK_FIELD_LABELS: Record<keyof BankingDetails, string> = {
  bankCountryCode: 'the country the account is held in',
  bankAccountName: 'account holder name',
  bankName: 'bank name',
  bankIban: 'IBAN',
  bankAccountNumber: 'account number',
  bankSwift: 'SWIFT / BIC',
  bankBranch: 'branch',
  bankInstructions: 'instructions',
};

/**
 * The bank details to put on a fee request.
 *
 * A firm's own account is used when the firm is the one being paid, and the
 * lawyer's when it is the lawyer. A lawyer with no details of their own falls
 * back to their firm's, because that is where the firm's fees are banked.
 */
export async function bankingDetailsFor(userId: string): Promise<BankingDetails> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lawyerProfile: {
        select: {
          bankAccountName: true,
          bankName: true,
          bankIban: true,
          bankAccountNumber: true,
          bankSwift: true,
          bankBranch: true,
          bankInstructions: true,
          affiliatedFirm: {
            select: {
              bankAccountName: true,
              bankName: true,
              bankIban: true,
              bankAccountNumber: true,
              bankSwift: true,
              bankBranch: true,
              bankInstructions: true,
            },
          },
        },
      },
      firmProfile: {
        select: {
          bankAccountName: true,
          bankName: true,
          bankIban: true,
          bankAccountNumber: true,
          bankSwift: true,
          bankBranch: true,
          bankInstructions: true,
        },
      },
    },
  });

  const own = user?.firmProfile ?? user?.lawyerProfile ?? null;
  const firm = user?.lawyerProfile?.affiliatedFirm ?? null;
  const chosen = hasEnough(own) ? own : hasEnough(firm) ? firm : (own ?? firm);

  return {
    bankAccountName: chosen?.bankAccountName ?? null,
    bankName: chosen?.bankName ?? null,
    bankIban: chosen?.bankIban ?? null,
    bankAccountNumber: chosen?.bankAccountNumber ?? null,
    bankSwift: chosen?.bankSwift ?? null,
    bankBranch: chosen?.bankBranch ?? null,
    bankInstructions: chosen?.bankInstructions ?? null,
  };
}

/** Enough to send money to: a name to pay, a bank, and an account or IBAN. */
function hasEnough(details: BankingDetails | null): boolean {
  if (!details) return false;
  return Boolean(
    details.bankAccountName?.trim() &&
      details.bankName?.trim() &&
      (details.bankIban?.trim() || details.bankAccountNumber?.trim()),
  );
}

/**
 * What is still missing, in words a person can act on.
 *
 * The list follows the banking conventions of the country the account is held
 * in: an IBAN country is asked for an IBAN or an account number, the United
 * States for a routing number, Argentina for a CBU, India for an IFSC. Asking
 * everybody for every field is how a form becomes impossible to complete, and
 * asking for the wrong ones is how a payment fails after it is sent.
 */
export function missingBankingFields(details: BankingDetails): string[] {
  const rules = bankFieldsFor(details.bankCountryCode);
  const missing: string[] = [];

  if (!details.bankAccountName?.trim()) missing.push(BANK_FIELD_LABELS.bankAccountName);
  if (!details.bankName?.trim()) missing.push(BANK_FIELD_LABELS.bankName);

  const identifiers: Record<string, string | null | undefined> = {
    iban: details.bankIban,
    accountNumber: details.bankAccountNumber,
    cbu: (details as { bankCbu?: string | null }).bankCbu,
    routingNumber: (details as { bankRoutingNumber?: string | null }).bankRoutingNumber,
    sortCode: (details as { bankSortCode?: string | null }).bankSortCode,
    ifsc: (details as { bankIfsc?: string | null }).bankIfsc,
    bsb: (details as { bankBsb?: string | null }).bankBsb,
  };

  const hasIdentifier = rules.identifiers.some((field) => identifiers[field]?.trim());
  if (!hasIdentifier) {
    missing.push(
      rules.identifiers
        .map((field) => BANK_FIELD_LABELS[field as keyof typeof BANK_FIELD_LABELS] ?? field)
        .join(' or '),
    );
  }

  return missing;
}

/** The bank details as they will be shown to a client. */
export function bankTransferLines(details: BankingDetails): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [];
  if (details.bankAccountName?.trim()) lines.push({ label: 'Account name', value: details.bankAccountName.trim() });
  if (details.bankName?.trim()) lines.push({ label: 'Bank', value: details.bankName.trim() });
  if (details.bankIban?.trim()) lines.push({ label: 'IBAN', value: details.bankIban.trim() });
  if (details.bankAccountNumber?.trim()) {
    lines.push({ label: 'Account number', value: details.bankAccountNumber.trim() });
  }
  if (details.bankSwift?.trim()) lines.push({ label: 'SWIFT / BIC', value: details.bankSwift.trim() });
  if (details.bankBranch?.trim()) lines.push({ label: 'Branch', value: details.bankBranch.trim() });
  return lines;
}

/** Card payments are not built. Saying so is the whole of this function. */
export const CARD_PAYMENTS_NOTICE =
  'Card payment is being developed and will be ready soon. For now, a fee is paid by bank transfer — the details are on the request.';

/**
 * The client records that they have sent the transfer.
 *
 * **No money moves through this application.** Nothing here contacts a bank: the
 * client tells us they transferred, quotes the reference their bank gave them,
 * and a receipt is issued. The professional sees the same thing, and the proof
 * of payment is asked for next.
 */
export async function recordBankTransfer(
  clientId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ paymentId: string; receiptNumber: string }>> {
  const parsed = transferSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const payment = await prisma.paymentRequest.findUnique({
    where: { id: parsed.data.paymentId },
    select: {
      id: true,
      status: true,
      amountFils: true,
      caseId: true,
      requestedById: true,
      bankIban: true,
      bankAccountNumber: true,
      case: { select: { clientId: true, reference: true } },
    },
  });
  if (!payment) return failure('That payment request no longer exists.', { status: 404 });
  if (payment.case.clientId !== clientId) {
    return failure('Only the client on this case can record this payment.', { status: 403 });
  }
  if (payment.status !== 'REQUESTED') return failure('That request is no longer awaiting payment.');
  if (!payment.bankIban && !payment.bankAccountNumber) {
    return failure('That request has no bank details on it. Ask the professional to add them.');
  }

  const now = new Date();

  // The unique index on receiptNumber is the guard; a collision retries with a
  // suffix rather than handing two payments the same receipt.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await prisma.paymentRequest.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          method: 'BANK_TRANSFER',
          reference: parsed.data.reference,
          receiptNumber: receiptNumberFor(payment.id, attempt),
          receiptIssuedAt: now,
          paidById: clientId,
          paidAt: now,
          // Asked for now, not before: proof is evidence of a transfer that has
          // already been sent.
          proofRequestedAt: now,
        },
      });
      break;
    } catch (error) {
      const isDuplicate =
        typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
      if (!isDuplicate || attempt === 3) {
        console.error('[payments] recording a transfer failed', error);
        return failure('The payment could not be recorded. Please try again.', { status: 500 });
      }
    }
  }

  const settled = await prisma.paymentRequest.findUnique({
    where: { id: payment.id },
    select: { receiptNumber: true },
  });
  const receiptNumber = settled?.receiptNumber ?? receiptNumberFor(payment.id);

  await notify({
    userId: payment.requestedById,
    kind: 'payment.paid',
    title: `A fee of ${formatAed(payment.amountFils)} was paid by transfer`,
    body: `On case ${payment.case.reference}, quoting reference ${parsed.data.reference}. Receipt ${receiptNumber}. The client has been asked for proof of payment. This is a simulated payment: the application did not move any money.`,
    link: `/cases/${payment.caseId}`,
  });

  await recordAudit({
    actorUserId: clientId,
    action: 'payment.transfer_recorded',
    entityType: 'payment_request',
    entityId: payment.id,
    metadata: {
      amountFils: payment.amountFils,
      reference: parsed.data.reference,
      receiptNumber,
      note: parsed.data.note,
    },
    ip: meta.ip ?? null,
  });

  return success({ paymentId: payment.id, receiptNumber });
}

/**
 * The client sends proof of payment, which is asked for only after the payment
 * itself is complete.
 */
export async function submitPaymentProof(
  clientId: string,
  rawInput: unknown,
  proof: File | null,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ paymentId: string }>> {
  const parsed = proofSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  if (!proof || proof.size === 0) {
    return failure('Attach the proof of payment — a receipt, a screenshot or a transfer advice.', {
      fieldErrors: { proof: 'Choose a file to attach.' },
    });
  }

  const payment = await prisma.paymentRequest.findUnique({
    where: { id: parsed.data.paymentId },
    select: {
      id: true,
      status: true,
      amountFils: true,
      proofDocumentId: true,
      proofSubmittedAt: true,
      caseId: true,
      requestedById: true,
      receiptNumber: true,
      case: { select: { clientId: true, reference: true } },
    },
  });
  if (!payment) return failure('That payment request no longer exists.', { status: 404 });
  if (payment.case.clientId !== clientId) {
    return failure('Only the client on this case can send proof for it.', { status: 403 });
  }
  if (payment.status !== 'PAID') {
    return failure('Proof of payment is asked for once the payment itself is complete.');
  }
  if (payment.proofSubmittedAt) return failure('Proof of payment has already been sent for this fee.');

  let proofDocumentId: string;
  try {
    const stored = await storeUpload(proof, clientId);
    const document = await prisma.document.create({
      data: {
        userId: clientId,
        kind: 'OTHER',
        status: 'AWAITING_REVIEW',
        storageKey: stored.storageKey,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        documentNumber: `Proof of payment for ${payment.case.reference}${
          payment.receiptNumber ? ` (receipt ${payment.receiptNumber})` : ''
        }`,
      },
      select: { id: true },
    });
    proofDocumentId = document.id;
  } catch (error) {
    if (error instanceof UploadRejected) {
      return failure(error.message, { fieldErrors: { proof: error.message } });
    }
    console.error('[payments] proof storage failed', error);
    return failure('The proof of payment could not be stored. Please try again.', { status: 500 });
  }

  await prisma.paymentRequest.update({
    where: { id: payment.id },
    data: {
      proofDocumentId,
      proofSubmittedAt: new Date(),
      proofNote: parsed.data.note,
    },
  });

  await notify({
    userId: payment.requestedById,
    kind: 'payment.proof_received',
    title: 'Proof of payment was sent',
    body: `On case ${payment.case.reference}, for ${formatAed(payment.amountFils)}${payment.receiptNumber ? ` (receipt ${payment.receiptNumber})` : ''}.`,
    link: `/cases/${payment.caseId}`,
  });

  await recordAudit({
    actorUserId: clientId,
    action: 'payment.proof_submitted',
    entityType: 'payment_request',
    entityId: payment.id,
    metadata: { amountFils: payment.amountFils },
    ip: meta.ip ?? null,
  });

  return success({ paymentId: payment.id });
}

/**
 * Everything printed on a receipt, for whoever is allowed to see it: the client
 * who paid, the professional who asked, and the firm they belong to. Nobody else
 * — a receipt carries an amount and a case reference.
 */
export async function getReceiptForViewer(paymentId: string, viewerId: string) {
  const payment = await prisma.paymentRequest.findUnique({
    where: { id: paymentId },
    include: {
      case: {
        select: {
          id: true,
          reference: true,
          title: true,
          clientId: true,
          lawyer: {
            select: {
              id: true,
              licenseNumber: true,
              licensingAuthority: true,
              user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
            },
          },
          firm: {
            select: {
              id: true,
              legalName: true,
              userId: true,
              tradeLicenseNumber: true,
              registeredAddress: true,
              lawyers: { select: { userId: true } },
            },
          },
        },
      },
      requestedBy: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, phone: true } },
        },
      },
      paidBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
    },
  });
  if (!payment) return null;

  const legalCase = payment.case;
  const mayView =
    legalCase.clientId === viewerId ||
    payment.requestedById === viewerId ||
    legalCase.lawyer?.user.id === viewerId ||
    legalCase.firm?.userId === viewerId ||
    (legalCase.firm?.lawyers.some((row) => row.userId === viewerId) ?? false);
  if (!mayView) return null;

  return payment;
}

/** The professional withdraws a request they no longer want. */
export async function cancelPayment(
  actorUserId: string,
  paymentId: string,
): Promise<ServiceResult> {
  const payment = await prisma.paymentRequest.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      requestedById: true,
      caseId: true,
      case: { select: { clientId: true, reference: true } },
    },
  });
  if (!payment) return failure('That payment request no longer exists.', { status: 404 });
  if (payment.requestedById !== actorUserId) {
    return failure('Only the professional who raised it can cancel it.', { status: 403 });
  }
  if (!CANCELLABLE.includes(payment.status)) return failure('That request can no longer be cancelled.');

  await prisma.paymentRequest.update({
    where: { id: payment.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });

  await notify({
    userId: payment.case.clientId,
    kind: 'payment.cancelled',
    title: 'A fee request was withdrawn',
    body: `On case ${payment.case.reference}. Nothing is owed for it.`,
    link: `/cases/${payment.caseId}`,
  });

  await recordAudit({
    actorUserId,
    action: 'payment.cancelled',
    entityType: 'payment_request',
    entityId: payment.id,
  });

  return success();
}


/** Totals for the admin console. Simulated, and labelled as such. */
export async function paymentOverview() {
  const [rows, counts] = await Promise.all([
    prisma.paymentRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        case: { select: { id: true, reference: true, title: true } },
        requestedBy: { select: { id: true, email: true, accountType: true, profile: { select: { fullName: true } } } },
        paidBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      },
    }),
    prisma.paymentRequest.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amountFils: true } }),
  ]);

  const byStatus = new Map(counts.map((row) => [row.status, row]));

  return {
    rows,
    requested: byStatus.get('REQUESTED')?._count._all ?? 0,
    paid: byStatus.get('PAID')?._count._all ?? 0,
    cancelled: byStatus.get('CANCELLED')?._count._all ?? 0,
    requestedValueFils: byStatus.get('REQUESTED')?._sum.amountFils ?? 0,
    paidValueFils: byStatus.get('PAID')?._sum.amountFils ?? 0,
  };
}

/** Removes a payment's stored proof when the request is deleted with its case. */
export async function detachProof(paymentId: string): Promise<void> {
  const payment = await prisma.paymentRequest.findUnique({
    where: { id: paymentId },
    select: { proofDocumentId: true },
  });
  if (!payment?.proofDocumentId) return;

  const document = await prisma.document.findUnique({
    where: { id: payment.proofDocumentId },
    select: { storageKey: true },
  });
  if (document) await deleteUpload(document.storageKey).catch(() => undefined);
}
