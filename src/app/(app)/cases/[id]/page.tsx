import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { getCaseForViewer, listCaseMessages } from '@/server/services/case-service';
import {
  bankTransferLines,
  bankingDetailsFor,
  listCasePayments,
  missingBankingFields,
} from '@/server/services/payment-service';
import { LEGAL_AREA_LABEL } from '@/lib/constants';
import { formatDateTime, formatFileSize, safeExternalUrl } from '@/lib/format';
import { formatUaeDateTime } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/icons';
import { VerificationStatusPill } from '@/components/VerificationBadge';
import { CaseActionPanel } from '@/components/cases/CaseActionPanel';
import { listCaseOffers } from '@/server/services/case-service';
import { activeUrgentCall } from '@/server/services/appointment-service';
import { RequestUrgentCallButton } from '@/components/forms/UrgentCallButton';
import { PaymentRequestForm } from '@/components/cases/PaymentRequestForm';
import { formatAed } from '@/lib/payment-format';
import { CaseChat } from '@/components/cases/CaseChat';
import { CaseProgressTrack, CaseStatusChip } from '@/components/cases/CaseStatusChip';
import { EncryptionNotice } from '@/components/SecurityNotice';
import { Alert, buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Case' };

/** Nothing banked, for a viewer who cannot raise a fee at all. */
const EMPTY_BANK = {
  bankAccountName: null,
  bankName: null,
  bankIban: null,
  bankAccountNumber: null,
  bankSwift: null,
  bankBranch: null,
  bankInstructions: null,
};

const NOTICES: Record<string, string> = {
  'case-submitted': 'Your case has been sent. It is now Submitted and awaiting review.',
  'case-under-review': 'The lawyer has opened your case. It is now Under review.',
  'case-assigned': 'The case has been accepted and assigned.',
  'case-declined': 'The case was declined. The reason is shown below.',
  'case-in-progress': 'Work on this case has started.',
  'case-completed': 'This case has been marked complete.',
};

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const user = await requireMember();
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);

  const found = await getCaseForViewer(id, user.id);
  if (!found) notFound();

  const { legalCase, access } = found;
  const { messages, hasMore } = await listCaseMessages(id, user.id);
  const isClient = access.role === 'CLIENT';
  const casePayments = await listCasePayments(id);
  const urgentRoom = await activeUrgentCall(id);
  const offers = legalCase.status === 'DISTRIBUTED' ? await listCaseOffers(id) : [];

  // A firm holding a case it has not released yet may send it to its lawyers.
  const canDistribute =
    access.role === 'FIRM_OWNER' &&
    (legalCase.status === 'SUBMITTED' || legalCase.status === 'UNDER_REVIEW');

  // Only the professional side may ask for money, and only once the case is taken.
  const canRequestPayment =
    !isClient && ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(legalCase.status);

  const ownBank = canRequestPayment ? await bankingDetailsFor(user.id) : null;
  const bankReady = ownBank ? missingBankingFields(ownBank).length === 0 : false;

  const professionalUser = legalCase.lawyer
    ? { id: legalCase.lawyer.user.id, email: legalCase.lawyer.user.email, profile: legalCase.lawyer.user.profile }
    : null;
  const professionalName =
    professionalUser?.profile?.fullName?.trim() || legalCase.firm?.legalName || 'Not yet assigned';

  const closed = legalCase.status === 'COMPLETED' || legalCase.status === 'DECLINED';

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label="Breadcrumb">
        <Link href={isClient ? '/cases' : '/dashboard'} className="text-brand-700 hover:underline">
          ← Back to {isClient ? 'my cases' : 'my dashboard'}
        </Link>
      </nav>

      {notice && NOTICES[notice] ? <Alert tone="success">{NOTICES[notice]}</Alert> : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{legalCase.reference}</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{legalCase.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {LEGAL_AREA_LABEL[legalCase.caseType]} · submitted{' '}
              {formatDateTime(legalCase.submittedAt)}
            </p>
          </div>
          <CaseStatusChip status={legalCase.status} />
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <CaseProgressTrack status={legalCase.status} />
        </div>

        {legalCase.status === 'DECLINED' && legalCase.declineReason ? (
          <Alert tone="error" className="mt-4" title="Why this case was declined">
            <p className="whitespace-pre-line">{legalCase.declineReason}</p>
          </Alert>
        ) : null}

        {access.role === 'FIRM_OWNER' && !closed ? (
          <Alert tone="info" className="mt-4" title="One of your lawyers must accept this case">
            This case is addressed to your firm. Only a registered lawyer can review and accept it —
            invite your lawyers from{' '}
            <Link href="/firm/lawyers" className="font-medium underline">
              Lawyers registered
            </Link>
            .
          </Alert>
        ) : null}
      </Card>

      {/* One column: the conversation is what this page is for, so it takes the
          whole width, and the actions and the other party's details sit under it
          rather than squeezing the thread into two thirds of a screen. */}
      <div className="space-y-6">
        <div className="space-y-6">
          {/* ── An urgent call is waiting ─────────────────────────────────── */}
          {urgentRoom?.roomCode ? (
            <Card className="border-domain-emergency/30 bg-domain-emergency/5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                    <Icon name="phoneCall" size={18} className="text-domain-emergency" />
                    {isClient ? 'Your urgent call is open' : 'Your client is asking for a call'}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-slate-700">
                    {isClient
                      ? 'The room is open and the professional has been alerted. Join it and wait a moment — they may take a call before this one.'
                      : 'The client asked for an urgent call about this case and is waiting in the room. Joining answers it.'}
                  </p>
                </div>
                <Link
                  href={`/rooms/${urgentRoom.roomCode}`}
                  className={buttonClasses('primary', 'md')}
                >
                  Join the call now
                </Link>
              </div>
            </Card>
          ) : null}

          {/* ── The case as submitted ───────────────────────────────────── */}
          <Card>
            <h2 className="font-semibold text-slate-900">Case description</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
              {legalCase.description}
            </p>

            <EncryptionNotice subject="Case papers" className="mt-6" />

            <h3 className="mt-6 text-sm font-semibold text-slate-900">
              Attachments ({legalCase.files.length})
            </h3>
            {legalCase.files.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">No files were attached.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {legalCase.files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-slate-800">{file.fileName}</span>
                      <span className="block text-xs text-slate-500">
                        {formatFileSize(file.sizeBytes)} · uploaded {formatDateTime(file.createdAt)}
                      </span>
                    </span>
                    <a
                      href={`/api/case-files/${file.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-medium text-brand-700 hover:underline"
                    >
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ── Conversation ────────────────────────────────────────────── */}
          <Card>
            <h2 className="mb-1 font-semibold text-slate-900">Messages</h2>
            <p className="mb-4 text-sm text-slate-600">
              {access.canMessage
                ? 'Both sides of this case can read and post here.'
                : 'You can read this conversation but not post to it.'}
            </p>
            <CaseChat
              caseId={legalCase.id}
              initialMessages={messages}
              hasMoreInitially={hasMore}
              viewerId={user.id}
              isClient={isClient}
              payments={casePayments.map((payment) => ({
                id: payment.id,
                caseId: payment.caseId,
                amountFils: payment.amountFils,
                purpose: payment.purpose,
                details: payment.details,
                status: payment.status,
                method: payment.method,
                reference: payment.reference,
                cardBrand: payment.cardBrand,
                cardLast4: payment.cardLast4,
                bankLines: bankTransferLines({
                  bankAccountName: payment.bankAccountName,
                  bankName: payment.bankName,
                  bankIban: payment.bankIban,
                  bankAccountNumber: payment.bankAccountNumber,
                  bankSwift: payment.bankSwift,
                  bankBranch: payment.bankBranch,
                  bankInstructions: payment.bankInstructions,
                }),
                bankInstructions: payment.bankInstructions,
                receiptNumber: payment.receiptNumber,
                hasProof: Boolean(payment.proofDocumentId),
                proofNote: payment.proofNote,
                createdAt: payment.createdAt,
                paidAt: payment.paidAt,
                requestedByName:
                  payment.requestedBy.profile?.fullName?.trim() || payment.requestedBy.email,
              }))}
              disabled={!access.canMessage || legalCase.status === 'DECLINED'}
              disabledReason={
                legalCase.status === 'DECLINED'
                  ? 'This case was declined, so the conversation is closed.'
                  : 'You cannot post in this case.'
              }
            />
          </Card>

          {offers.length > 0 ? (
            <Card>
              <h2 className="font-semibold text-slate-900">
                Offered to the firm&rsquo;s lawyers ({offers.length})
              </h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {offers.map((offer) => (
                  <li key={offer.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="text-sm text-slate-800">
                      {offer.lawyer.user.profile?.fullName?.trim() || offer.lawyer.user.email}
                      {offer.note ? (
                        <span className="ml-2 text-xs text-slate-500">“{offer.note}”</span>
                      ) : null}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        offer.status === 'ACCEPTED'
                          ? 'bg-green-50 text-green-800 ring-green-200'
                          : offer.status === 'PASSED'
                            ? 'bg-amber-50 text-amber-900 ring-amber-200'
                            : offer.status === 'WITHDRAWN'
                              ? 'bg-slate-100 text-slate-600 ring-slate-200'
                              : 'bg-brand-50 text-brand-800 ring-brand-200'
                      }`}
                    >
                      {offer.status === 'PENDING'
                        ? 'Not answered yet'
                        : offer.status.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {canRequestPayment ? (
            <Card>
              <h2 className="mb-3 font-semibold text-slate-900">Fees on this case</h2>
              {casePayments.length > 0 ? (
                <ul className="mb-4 divide-y divide-slate-100">
                  {casePayments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="text-sm text-slate-800">
                        {formatAed(payment.amountFils)} · {payment.purpose.toLowerCase().replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-500">
                        {payment.status === 'PAID'
                          ? `paid${payment.method ? ` by ${payment.method === 'CARD' ? 'card' : 'transfer'}` : ''}`
                          : payment.status === 'CANCELLED'
                            ? 'withdrawn'
                            : 'awaiting payment'}
                      </span>
                      {payment.status === 'PAID' ? (
                        <Link
                          href={`/payments/${payment.id}/receipt`}
                          className="text-xs font-medium text-brand-700 hover:underline"
                        >
                          Receipt
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-4 text-sm text-slate-600">No fees have been requested on this case.</p>
              )}
              <PaymentRequestForm
                caseId={legalCase.id}
                bankLines={bankTransferLines(ownBank ?? EMPTY_BANK)}
                bankReady={bankReady}
              />
            </Card>
          ) : null}

          {/* ── History ─────────────────────────────────────────────────── */}
          <Card>
            <h2 className="font-semibold text-slate-900">History</h2>
            <ol className="mt-3 divide-y divide-slate-100">
              {legalCase.events.map((event) => (
                <li key={event.id} className="py-2.5">
                  <p className="text-sm text-slate-800">
                    {event.fromStatus ? `${event.fromStatus} → ` : ''}
                    {event.toStatus}
                  </p>
                  <p className="text-xs text-slate-500">
                    {event.actor?.email ?? 'System'} · {formatDateTime(event.createdAt)}
                    {event.note ? ` · ${event.note}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* ── Actions and the other party, below the conversation ──────── */}
        <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!isClient ? (
            <Card>
              <h2 className="font-semibold text-slate-900">Your actions</h2>
              <div className="mt-4">
                <CaseActionPanel
                  caseId={legalCase.id}
                  status={legalCase.status}
                  canReview={access.canReview}
                  canAccept={access.canAccept}
                  canProgress={access.canProgress}
                  canDecline={(access.canReview || access.canAccept) && !closed}
                  canDistribute={canDistribute}
                />
              </div>
            </Card>
          ) : null}

          <Card>
            <h2 className="font-semibold text-slate-900">
              {isClient ? 'Your professional' : 'Client'}
            </h2>

            {isClient ? (
              professionalUser ? (
                <div className="mt-3 flex items-start gap-3">
                  <Avatar
                    userId={professionalUser.id}
                    name={professionalName}
                    hasPhoto={Boolean(professionalUser.profile?.avatarDocumentId)}
                    size={40}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{professionalName}</p>
                    <p className="text-xs text-slate-500">{professionalUser.email}</p>
                    {legalCase.firm ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Registered with {legalCase.firm.legalName}
                      </p>
                    ) : null}
                    {legalCase.lawyer ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Licence {legalCase.lawyer.licenseNumber} ·{' '}
                        {legalCase.lawyer.licensingAuthority}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  {legalCase.firm
                    ? `Sent to ${legalCase.firm.legalName}. A lawyer from the firm will review and accept it.`
                    : 'No professional is assigned yet.'}
                </p>
              )
            ) : (
              <div className="mt-3 flex items-start gap-3">
                <Avatar
                  userId={legalCase.client.id}
                  name={legalCase.client.profile?.fullName?.trim() || legalCase.client.email}
                  hasPhoto={Boolean(legalCase.client.profile?.avatarDocumentId)}
                  size={40}
                />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {legalCase.client.profile?.fullName?.trim() || legalCase.client.email}
                  </p>
                  <p className="text-xs text-slate-500">{legalCase.client.email}</p>
                  {legalCase.client.profile?.countryOfResidence ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Resident in {legalCase.client.profile.countryOfResidence}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            <div className="mt-4">
              <DescriptionList
                items={[
                  {
                    term: 'Assigned lawyer',
                    detail: legalCase.lawyer
                      ? `${legalCase.lawyer.user.profile?.fullName?.trim() || legalCase.lawyer.user.email}`
                      : 'Not yet assigned',
                  },
                  {
                    term: 'Firm',
                    detail: legalCase.firm?.legalName ?? 'None — sent to a named lawyer',
                  },
                  {
                    term: 'Reviewed',
                    detail: legalCase.reviewedAt ? formatUaeDateTime(legalCase.reviewedAt) : 'Not yet',
                  },
                  {
                    term: 'Assigned',
                    detail: legalCase.assignedAt ? formatUaeDateTime(legalCase.assignedAt) : 'Not yet',
                  },
                ]}
              />
            </div>
          </Card>

          {isClient && legalCase.lawyer && !urgentRoom ? (
            <Card>
              <h2 className="font-semibold text-slate-900">Talk to your lawyer now</h2>
              <p className="mt-1 mb-3 text-sm text-slate-600">
                Ask for an urgent call and you go straight into a conference room while{' '}
                {professionalName} is alerted. Meetings they schedule are booked from their diary.
              </p>
              <RequestUrgentCallButton caseId={legalCase.id} professionalName={professionalName} />
              <Link href="/rooms" className={buttonClasses('secondary', 'md', 'mt-3 w-full')}>
                All my conference rooms
              </Link>
            </Card>
          ) : null}

          {isClient && legalCase.lawyer && urgentRoom ? (
            <Card>
              <h2 className="font-semibold text-slate-900">Book a meeting</h2>
              <p className="mt-1 text-sm text-slate-600">
                Your lawyer schedules meetings from their diary. You are alerted here as soon as one is
                booked with you.
              </p>
              <Link href="/rooms" className={buttonClasses('secondary', 'md', 'mt-3 w-full')}>
                See my meetings and rooms
              </Link>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
