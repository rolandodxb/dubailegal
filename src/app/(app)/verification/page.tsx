import type { Metadata } from 'next';
import Link from 'next/link';
import { DocumentKind } from '@prisma/client';
import { requireMember } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { blockerTexts } from '@/lib/i18n/requirements';
import { documentKindLabel, verificationRequestLabel } from '@/lib/i18n/labels';
import { getVerificationOverview } from '@/server/services/verification-service';
import { getAvailability, isEnabled } from '@/lib/availability';
import { formatDate, formatDateTime } from '@/lib/format';
import { maskEmiratesId } from '@/lib/emirates-id';
import { EncryptionNotice } from '@/components/SecurityNotice';
import { Alert, buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';
import { DocumentList, DocumentUploadForm } from '@/components/forms/DocumentForms';
import {
  SubmitVerificationForm,
  WithdrawVerificationForm,
} from '@/components/forms/VerificationActions';
import { fieldName } from '@/lib/i18n/messages';
import { requirementText } from '@/lib/i18n/requirements';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.verification };
}

export default async function VerificationPage() {
  const user = await requireMember();
  const [{ t, effectiveLocale }, overview, availability] = await Promise.all([
    getI18n(),
    getVerificationOverview(user.id),
    getAvailability(),
  ]);
  if (!overview) return null;

  const canSubmitDocuments = isEnabled(availability.settings, 'feature.verification_submission');

  // The documents offered are the ones this member's situation calls for, in the
  // order the rules put them: identity, residence if they live abroad, then the
  // licence to practise. Everything else stays available under "other".
  const requestedKinds = overview.rules.requests.flatMap((request) => request.kinds);
  const orderedKinds: DocumentKind[] = [
    ...requestedKinds,
    'PROFILE_PHOTO',
    'PROFESSIONAL_INDEMNITY_INSURANCE',
    'BRAND_LOGO',
    'OTHER',
  ];
  const uniqueKinds = Array.from(new Set(orderedKinds));

  const usable = overview.documents.filter((doc) => doc.status !== 'SUPERSEDED');
  const presentKinds = new Set(
    usable.filter((doc) => doc.status !== 'REJECTED').map((doc) => doc.kind),
  );
  const openCase = overview.openCase;
  const requestedKindCount = overview.rules.requests.filter(
    (request) => request.kinds.length > 0 && request.kinds[0] !== 'PROFILE_PHOTO',
  ).length;

  // The names of the document kinds, resolved once here so the document forms
  // can render them without carrying the dictionary into the client bundle.
  const kindLabels = Object.fromEntries(
    (Object.values(DocumentKind) as DocumentKind[]).map((kind) => [
      kind,
      documentKindLabel(t, kind),
    ]),
  );

  // ── Checklist ────────────────────────────────────────────────────────────
  const profileDone = overview.missingProfileFields.length === 0;
  const documentsDone = overview.missingDocuments.length === 0;
  const credentialDone = !overview.needsCredential || overview.hasCredential;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.verification}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t.memberPro.verification.intro}</p>
      </header>

      {/* ── Current status ──────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">{t.memberPro.verification.currentStatus}</h2>
        <div className="mt-3">
          <DescriptionList
            items={[
              { term: t.common.status, detail: t.verificationStatus[overview.status] },
              {
                term: t.memberPro.verification.emiratesIdOnFile,
                detail: overview.profile?.emiratesIdNumber
                  ? maskEmiratesId(overview.profile.emiratesIdNumber)
                  : t.memberPro.verification.notProvidedYet,
              },
              {
                term: t.dashboard.documentsOnFile,
                detail: `${usable.length} (${t.memberPro.verification.requestedTypes
                  .replace('{present}', String(presentKinds.size))
                  .replace('{total}', String(requestedKindCount))})`,
              },
              {
                term: t.memberPro.verification.requestsSubmitted,
                detail: String(overview.cases.length),
              },
              {
                term: t.memberPro.verification.openRequest,
                detail: openCase
                  ? t.memberPro.verification.roundSubmitted
                      .replace('{round}', String(openCase.round))
                      .replace('{date}', formatDate(openCase.submittedAt))
                  : t.common.none,
              },
            ]}
          />
        </div>
      </Card>

      <EncryptionNotice subject={t.memberPro.verification.encryptionSubject} className="mb-6" />

      {overview.checkDigitWarning ? (
        <Alert tone="warning" title={t.memberPro.verification.checkDigitTitle}>
          {t.memberPro.verification.checkDigitWarning}
        </Alert>
      ) : null}

      {/* ── Reviewer feedback ───────────────────────────────────────────── */}
      {overview.latestCase?.status === 'REJECTED' && overview.latestCase.decisionNotes ? (
        <Alert tone="error" title={t.memberPro.verification.notApprovedTitle}>
          <p className="whitespace-pre-line">{overview.latestCase.decisionNotes}</p>
          <p className="mt-2 text-xs">{t.memberPro.verification.notApprovedBody}</p>
        </Alert>
      ) : null}

      {overview.latestCase?.status === 'APPROVED' ? (
        <Alert tone="success" title={t.memberPro.verification.verifiedTitle}>
          {t.memberPro.verification.verifiedBody.replace(
            '{date}',
            formatDateTime(overview.latestCase.decidedAt),
          )}
        </Alert>
      ) : null}

      {/* ── Checklist ───────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">{t.memberPro.verification.stillNeeded}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <ChecklistItem
            done={overview.emailVerified}
            label={t.memberPro.verification.emailConfirmed}
            completeLabel={t.memberPro.verification.completeSr}
            outstandingLabel={t.memberPro.verification.outstandingSr}
          />
          <ChecklistItem
            done={profileDone}
            label={t.memberPro.verification.profileComplete}
            completeLabel={t.memberPro.verification.completeSr}
            outstandingLabel={t.memberPro.verification.outstandingSr}
            detail={
              profileDone
                ? undefined
                : t.memberPro.verification.missing.replace(
                    '{items}',
                    overview.missingProfileFields
                      .map((field) => fieldName(effectiveLocale, field))
                      .join(', '),
                  )
            }
            href="/profile"
            hrefLabel={t.memberPro.verification.openMyProfile}
          />
          {overview.needsCredential ? (
            <ChecklistItem
              done={credentialDone}
              label={
                overview.accountType === 'FIRM'
                  ? t.memberPro.verification.firmRegistrationAdded
                  : t.memberPro.verification.legalLicenceAdded
              }
              completeLabel={t.memberPro.verification.completeSr}
              outstandingLabel={t.memberPro.verification.outstandingSr}
              href="/credentials"
              hrefLabel={t.memberPro.verification.openLegalDetails}
            />
          ) : null}
          <ChecklistItem
            done={documentsDone}
            label={t.memberPro.verification.requiredDocumentsUploaded}
            completeLabel={t.memberPro.verification.completeSr}
            outstandingLabel={t.memberPro.verification.outstandingSr}
            detail={
              documentsDone
                ? undefined
                : t.memberPro.verification.missing.replace(
                    '{items}',
                    overview.missingDocumentRequests
                      .map((request) => requirementText(t, effectiveLocale, request, overview.documentRules).label)
                      .join(', '),
                  )
            }
            href="#documents"
            hrefLabel={t.memberPro.verification.uploadBelow}
          />
        </ul>
      </Card>

      {/* ── Documents ───────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">{t.memberPro.verification.yourDocuments}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.memberPro.verification.documentsPrivacy}</p>
        <div className="mt-4">
          <DocumentList
            documents={usable.map((doc) => ({
              id: doc.id,
              kind: doc.kind,
              status: doc.status,
              fileName: doc.fileName,
              reviewNotes: doc.reviewNotes,
              reviewedAt: doc.reviewedAt,
            }))}
            labels={{
              empty: t.memberPro.documents.empty,
              statusAwaitingReview: t.memberPro.documents.statusAwaitingReview,
              statusApproved: t.memberPro.documents.statusApproved,
              statusRejected: t.memberPro.documents.statusRejected,
              statusSuperseded: t.memberPro.documents.statusSuperseded,
              view: t.memberPro.documents.view,
              reviewerSaid: t.memberPro.documents.reviewerSaid,
              remove: t.memberPro.documents.remove,
              removeConfirm: t.memberPro.documents.removeConfirm,
              removing: t.memberPro.documents.removing,
              kindLabels,
              purgedNote: t.memberPro.documents.purgedNote,
            }}
          />
        </div>
      </Card>

      {/* ── Upload ──────────────────────────────────────────────────────── */}
      <Card>
        <h2 id="documents" className="font-semibold text-slate-900">
          {t.memberPro.documents.title}
        </h2>

        {openCase ? (
          <Alert tone="info" className="mt-3" title={t.memberPro.verification.withReviewerTitle}>
            {t.memberPro.verification.withReviewerBody}
          </Alert>
        ) : (
          <div className="mt-4">
            <DocumentUploadForm
              kinds={uniqueKinds}
              requiredKinds={requestedKinds}
              labels={{
                notUploadedTitle: t.memberPro.documents.notUploadedTitle,
                type: t.memberPro.documents.type,
                requiredMark: t.memberPro.documents.requiredMark,
                optionalMark: t.memberPro.documents.optionalMark,
                file: t.memberPro.documents.file,
                fileHint: t.memberPro.documents.fileHint,
                documentNumber: t.memberPro.documents.documentNumber,
                documentNumberHint: t.memberPro.documents.documentNumberHint,
                expiryDate: t.memberPro.documents.expiryDate,
                uploading: t.memberPro.documents.uploading,
                upload: t.memberPro.documents.upload,
                kindLabels,
              }}
            />
          </div>
        )}
      </Card>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">
          {openCase
            ? t.memberPro.verification.requestInProgress
            : t.memberPro.verification.submitForVerification}
        </h2>

        <div className="mt-4">
          {openCase ? (
            <WithdrawVerificationForm
              labels={{
                confirm: t.memberPro.verification.withdrawConfirm,
                withdrawing: t.memberPro.verification.withdrawing,
                withdrawRequest: t.memberPro.verification.withdrawRequest,
                withdrawNote: t.memberPro.verification.withdrawNote,
              }}
            />
          ) : canSubmitDocuments ? (
            <SubmitVerificationForm
              blockers={blockerTexts(t, effectiveLocale, overview.blockerItems, overview.documentRules)}
              labels={{
                beforeSubmitTitle: t.memberPro.verification.beforeSubmitTitle,
                submit: t.memberPro.verification.submitForVerification,
                submitting: t.memberPro.verification.submitting,
                buttonActive: t.memberPro.verification.buttonActive,
              }}
            />
          ) : (
            <Alert tone="warning">{t.memberPro.verification.submissionOff}</Alert>
          )}
        </div>
      </Card>

      {/* ── History ────────────────────────────────────────────────────── */}
      {overview.cases.length > 0 ? (
        <Card>
          <h2 className="font-semibold text-slate-900">{t.memberPro.verification.history}</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {overview.cases.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {t.memberPro.verification.roundStatus
                      .replace('{round}', String(item.round))
                      .replace('{status}', verificationRequestLabel(t, item.status))}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.memberPro.verification.submittedOn.replace(
                      '{date}',
                      formatDate(item.submittedAt),
                    )}
                    {item.decidedAt
                      ? ` ${t.memberPro.verification.decidedOn.replace('{date}', formatDate(item.decidedAt))}`
                      : ''}
                  </p>
                </div>
                {item.status === 'WITHDRAWN' ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {t.memberPro.verification.withdrawnByYou}
                  </p>
                ) : null}
                {item.decisionNotes ? (
                  <p className="mt-1 whitespace-pre-line text-xs text-slate-600">
                    {item.decisionNotes}
                  </p>
                ) : null}
                {item.reviewer ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {t.memberPro.verification.reviewedBy.replace('{email}', item.reviewer.email)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function ChecklistItem({
  done,
  label,
  completeLabel,
  outstandingLabel,
  detail,
  href,
  hrefLabel,
}: {
  done: boolean;
  label: string;
  completeLabel: string;
  outstandingLabel: string;
  detail?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'
        }`}
      >
        <Icon name={done ? 'check' : 'alertTriangle'} size={12} strokeWidth={2.25} />
      </span>
      <span className="min-w-0">
        <span className={`block ${done ? 'text-slate-700' : 'font-medium text-slate-900'}`}>
          {label}
          <span className="sr-only">{done ? completeLabel : outstandingLabel}</span>
        </span>
        {detail ? <span className="mt-0.5 block text-xs text-slate-500">{detail}</span> : null}
        {!done && href && hrefLabel ? (
          <Link href={href} className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline">
            {hrefLabel}
          </Link>
        ) : null}
      </span>
    </li>
  );
}
