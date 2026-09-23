import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { legalAreaLabel, paymentPurposeLabel } from '@/lib/i18n/labels';
import { getCaseForViewer, listCaseMessages } from '@/server/services/case-service';
import {
  bankTransferLines,
  bankingDetailsFor,
  listCasePayments,
  missingBankingFields,
} from '@/server/services/payment-service';
import { formatDateTime, formatFileSize, safeExternalUrl } from '@/lib/format';
import { formatUaeDateTime } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/icons';
import { CaseActionPanel } from '@/components/cases/CaseActionPanel';
import { listCaseOffers } from '@/server/services/case-service';
import { activeUrgentCall } from '@/server/services/appointment-service';
import { RequestUrgentCallButton } from '@/components/forms/UrgentCallButton';
import { PaymentRequestForm } from '@/components/cases/PaymentRequestForm';
import { formatMoney } from '@/lib/payment-format';
import { CaseChat } from '@/components/cases/CaseChat';
import { CaseProgressTrack, CaseStatusChip } from '@/components/cases/CaseStatusChip';
import { EncryptionNotice } from '@/components/SecurityNotice';
import { Alert, buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';
import { localiseBankLines } from '@/lib/i18n/format';

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

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ t }, user] = await Promise.all([getI18n(), requireMember()]);
  const labels = t.memberCases.caseDetail;
  const purposeLower = labels.purposeLower as Record<string, string>;
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);

  const found = await getCaseForViewer(id, user.id);
  if (!found) notFound();

  const { legalCase, access } = found;
  const { messages, hasMore } = await listCaseMessages(id, user.id);
  const isClient = access.role === 'CLIENT';
  const casePayments = await listCasePayments(id);
  const urgentRoom = await activeUrgentCall(id);
  const offers = legalCase.status === 'DISTRIBUTED' ? await listCaseOffers(id) : [];

  const notices: Record<string, string> = {
    'case-submitted': labels.noticeSubmitted,
    'case-under-review': labels.noticeUnderReview,
    'case-assigned': labels.noticeAssigned,
    'case-declined': labels.noticeDeclined,
    'case-in-progress': labels.noticeInProgress,
    'case-completed': labels.noticeCompleted,
  };

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
    professionalUser?.profile?.fullName?.trim() || legalCase.firm?.legalName || labels.notYetAssigned;

  const closed = legalCase.status === 'COMPLETED' || legalCase.status === 'DECLINED';

  const feeStatusText = (payment: (typeof casePayments)[number]) =>
    payment.status === 'PAID'
      ? payment.method === 'CARD'
        ? labels.paidByCard
        : payment.method
          ? labels.paidByTransfer
          : labels.paid
      : payment.status === 'CANCELLED'
        ? labels.withdrawn
        : labels.awaitingPayment;

  const offerStatusText = (status: string) =>
    status === 'PENDING'
      ? labels.offerNotAnswered
      : status === 'ACCEPTED'
        ? labels.offerAccepted
        : status === 'PASSED'
          ? labels.offerPassed
          : labels.offerWithdrawn;

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label={t.memberCases.breadcrumb}>
        <Link href={isClient ? '/cases' : '/dashboard'} className="text-brand-700 hover:underline">
          {isClient ? labels.backToMyCases : labels.backToMyDashboard}
        </Link>
      </nav>

      {notice && notices[notice] ? <Alert tone="success">{notices[notice]}</Alert> : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{legalCase.reference}</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{legalCase.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {legalAreaLabel(t, legalCase.caseType)} ·{' '}
              {labels.submittedOn.replace('{date}', formatDateTime(legalCase.submittedAt))}
            </p>
          </div>
          <CaseStatusChip status={legalCase.status} />
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <CaseProgressTrack status={legalCase.status} />
        </div>

        {legalCase.status === 'DECLINED' && legalCase.declineReason ? (
          <Alert tone="error" className="mt-4" title={labels.declinedTitle}>
            <p className="whitespace-pre-line">{legalCase.declineReason}</p>
          </Alert>
        ) : null}

        {access.role === 'FIRM_OWNER' && !closed ? (
          <Alert tone="info" className="mt-4" title={labels.firmAcceptTitle}>
            {labels.firmAcceptBodyBefore}
            <Link href="/firm/lawyers" className="font-medium underline">
              {t.items.firmLawyers}
            </Link>
            {labels.firmAcceptBodyAfter}
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
                    {isClient ? labels.urgentOpenClient : labels.urgentOpenProfessional}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-slate-700">
                    {isClient ? labels.urgentBodyClient : labels.urgentBodyProfessional}
                  </p>
                </div>
                <Link
                  href={`/rooms/${urgentRoom.roomCode}`}
                  className={buttonClasses('primary', 'md')}
                >
                  {labels.joinCallNow}
                </Link>
              </div>
            </Card>
          ) : null}

          {/* ── The case as submitted ───────────────────────────────────── */}
          <Card>
            <h2 className="font-semibold text-slate-900">{labels.caseDescription}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
              {legalCase.description}
            </p>

            <EncryptionNotice subject={labels.casePapers} className="mt-6" />

            <h3 className="mt-6 text-sm font-semibold text-slate-900">
              {labels.attachments.replace('{count}', String(legalCase.files.length))}
            </h3>
            {legalCase.files.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">{labels.noFiles}</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {legalCase.files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-slate-800">{file.fileName}</span>
                      <span className="block text-xs text-slate-500">
                        {formatFileSize(file.sizeBytes)} ·{' '}
                        {labels.uploaded.replace('{date}', formatDateTime(file.createdAt))}
                      </span>
                    </span>
                    <a
                      href={`/api/case-files/${file.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-medium text-brand-700 hover:underline"
                    >
                      {t.common.open}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ── Conversation ────────────────────────────────────────────── */}
          <Card>
            <h2 className="mb-1 font-semibold text-slate-900">{labels.messages}</h2>
            <p className="mb-4 text-sm text-slate-600">
              {access.canMessage ? labels.canMessage : labels.cannotMessage}
            </p>
            <CaseChat
              caseId={legalCase.id}
              initialMessages={messages}
              hasMoreInitially={hasMore}
              viewerId={user.id}
              isClient={isClient}
              labels={{ ...t.memberCases.caseChat, you: t.room.you, payment: t.memberCases.feeBubble }}
              payments={casePayments.map((payment) => ({
                id: payment.id,
                caseId: payment.caseId,
                amountFils: payment.amountFils,
                purpose: payment.purpose,
                purposeLabel:
                  payment.purpose === 'OTHER'
                    ? t.memberCases.feeBubble.reasonOther
                    : paymentPurposeLabel(t, payment.purpose),
                details: payment.details,
                status: payment.status,
                method: payment.method,
                reference: payment.reference,
                cardBrand: payment.cardBrand,
                currency: payment.currency,
                cardLast4: payment.cardLast4,
                bankLines: localiseBankLines(t, bankTransferLines({
                  bankAccountName: payment.bankAccountName,
                  bankName: payment.bankName,
                  bankIban: payment.bankIban,
                  bankAccountNumber: payment.bankAccountNumber,
                  bankSwift: payment.bankSwift,
                  bankBranch: payment.bankBranch,
                  bankInstructions: payment.bankInstructions,
                })),
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
                  ? labels.declinedConversationClosed
                  : labels.cannotPost
              }
            />
          </Card>

          {offers.length > 0 ? (
            <Card>
              <h2 className="font-semibold text-slate-900">
                {labels.offeredHeading.replace('{count}', String(offers.length))}
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
                      {offerStatusText(offer.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {canRequestPayment ? (
            <Card>
              <h2 className="mb-3 font-semibold text-slate-900">{labels.feesHeading}</h2>
              {casePayments.length > 0 ? (
                <ul className="mb-4 divide-y divide-slate-100">
                  {casePayments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="text-sm text-slate-800">
                        {formatMoney(payment.amountFils, payment.currency)} ·{' '}
                        {purposeLower[payment.purpose] ?? payment.purpose}
                      </span>
                      <span className="text-xs text-slate-500">{feeStatusText(payment)}</span>
                      {payment.status === 'PAID' ? (
                        <Link
                          href={`/payments/${payment.id}/receipt`}
                          className="text-xs font-medium text-brand-700 hover:underline"
                        >
                          {labels.receipt}
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-4 text-sm text-slate-600">{labels.noFees}</p>
              )}
              <PaymentRequestForm
                caseId={legalCase.id}
                bankLines={localiseBankLines(t, bankTransferLines(ownBank ?? EMPTY_BANK))}
                bankReady={bankReady}
                labels={t.memberCases.feeRequest}
                purposeOptions={[
                  { value: 'CONSULTATION', label: paymentPurposeLabel(t, 'CONSULTATION') },
                  { value: 'CASE_ASSISTANCE', label: paymentPurposeLabel(t, 'CASE_ASSISTANCE') },
                  { value: 'COURT_FEES', label: paymentPurposeLabel(t, 'COURT_FEES') },
                  { value: 'OTHER', label: paymentPurposeLabel(t, 'OTHER') },
                ]}
                legalDetailsLabel={t.items.legalDetails}
              />
            </Card>
          ) : null}

          {/* ── History ─────────────────────────────────────────────────── */}
          <Card>
            <h2 className="font-semibold text-slate-900">{labels.history}</h2>
            <ol className="mt-3 divide-y divide-slate-100">
              {legalCase.events.map((event) => (
                <li key={event.id} className="py-2.5">
                  <p className="text-sm text-slate-800">
                    {event.fromStatus ? `${event.fromStatus} → ` : ''}
                    {event.toStatus}
                  </p>
                  <p className="text-xs text-slate-500">
                    {event.actor?.email ?? labels.system} · {formatDateTime(event.createdAt)}
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
              <h2 className="font-semibold text-slate-900">{labels.yourActions}</h2>
              <div className="mt-4">
                <CaseActionPanel
                  caseId={legalCase.id}
                  status={legalCase.status}
                  canReview={access.canReview}
                  canAccept={access.canAccept}
                  canProgress={access.canProgress}
                  canDecline={(access.canReview || access.canAccept) && !closed}
                  canDistribute={canDistribute}
                  labels={t.memberCases.caseActions}
                />
              </div>
            </Card>
          ) : null}

          <Card>
            <h2 className="font-semibold text-slate-900">
              {isClient ? labels.yourProfessional : labels.client}
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
                        {labels.registeredWith.replace('{name}', legalCase.firm.legalName)}
                      </p>
                    ) : null}
                    {legalCase.lawyer ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {labels.licence} {legalCase.lawyer.licenseNumber} ·{' '}
                        {legalCase.lawyer.licensingAuthority}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  {legalCase.firm
                    ? labels.sentToFirm.replace('{name}', legalCase.firm.legalName)
                    : labels.noProfessional}
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
                      {labels.residentIn.replace(
                        '{country}',
                        legalCase.client.profile.countryOfResidence,
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            <div className="mt-4">
              <DescriptionList
                items={[
                  {
                    term: labels.assignedLawyer,
                    detail: legalCase.lawyer
                      ? `${legalCase.lawyer.user.profile?.fullName?.trim() || legalCase.lawyer.user.email}`
                      : labels.notYetAssigned,
                  },
                  {
                    term: labels.firm,
                    detail: legalCase.firm?.legalName ?? labels.noneNamedLawyer,
                  },
                  {
                    term: labels.reviewed,
                    detail: legalCase.reviewedAt ? formatUaeDateTime(legalCase.reviewedAt) : labels.notYet,
                  },
                  {
                    term: labels.assigned,
                    detail: legalCase.assignedAt ? formatUaeDateTime(legalCase.assignedAt) : labels.notYet,
                  },
                ]}
              />
            </div>
          </Card>

          {isClient && legalCase.lawyer && !urgentRoom ? (
            <Card>
              <h2 className="font-semibold text-slate-900">{labels.talkNow}</h2>
              <p className="mt-1 mb-3 text-sm text-slate-600">
                {labels.talkNowBody.replace('{name}', professionalName)}
              </p>
              <RequestUrgentCallButton
                caseId={legalCase.id}
                professionalName={professionalName}
                labels={t.memberCases.urgentCall}
              />
              <Link href="/rooms" className={buttonClasses('secondary', 'md', 'mt-3 w-full')}>
                {labels.allRooms}
              </Link>
            </Card>
          ) : null}

          {isClient && legalCase.lawyer && urgentRoom ? (
            <Card>
              <h2 className="font-semibold text-slate-900">{labels.bookMeeting}</h2>
              <p className="mt-1 text-sm text-slate-600">{labels.bookMeetingBody}</p>
              <Link href="/rooms" className={buttonClasses('secondary', 'md', 'mt-3 w-full')}>
                {labels.seeMeetings}
              </Link>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
