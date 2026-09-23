import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getI18n } from '@/lib/i18n';
import {
  accountTypeLabel,
  documentKindLabel,
  emirateLabel,
  legalAreaLabel,
  verificationRequestLabel,
} from '@/lib/i18n/labels';
import { requestMeta, requireReviewer } from '@/lib/auth';
import { getCaseForReview } from '@/server/services/verification-service';
import { DOCUMENT_REQUIREMENTS } from '@/lib/constants';
import { calculateAge, formatDate, formatDateTime, formatFileSize, safeExternalUrl } from '@/lib/format';
import { emiratesIdCheckDigitMatches } from '@/lib/emirates-id';
import { Alert, buttonClasses, Card, Chip, DescriptionList } from '@/components/ui/primitives';
import { ClaimCaseForm, DecisionForm, ReviewDocumentForm } from '@/components/forms/AdminForms';

export const metadata: Metadata = { title: 'Review request' };

const DOC_STATUS_STYLES: Record<string, string> = {
  AWAITING_REVIEW: 'bg-brand-50 text-brand-800 ring-brand-200',
  APPROVED: 'bg-green-50 text-green-800 ring-green-200',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200',
  SUPERSEDED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export default async function ReviewCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ t }, reviewer, meta] = await Promise.all([getI18n(), requireReviewer(), requestMeta()]);
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);

  const reviewCase = await getCaseForReview(id, reviewer.id, meta.ip);
  if (!reviewCase) notFound();

  const applicant = reviewCase.user;
  const profile = applicant.profile;
  const required = DOCUMENT_REQUIREMENTS[applicant.accountType].required;
  const decided = reviewCase.status === 'APPROVED' || reviewCase.status === 'REJECTED';
  const claimedByMe = reviewCase.reviewerId === reviewer.id;
  const canReviewDocuments = reviewCase.status === 'UNDER_REVIEW' && claimedByMe;

  const caseKinds = new Set(reviewCase.documents.map((doc) => doc.kind));
  const missingRequired = required.filter((kind) => !caseKinds.has(kind));
  const rejectedKinds = reviewCase.documents
    .filter((doc) => doc.status === 'REJECTED')
    .map((doc) => doc.kind);
  const age = calculateAge(profile?.dateOfBirth ?? null);
  const checkDigit = profile?.emiratesIdNumber
    ? emiratesIdCheckDigitMatches(profile.emiratesIdNumber)
    : null;
  const website = safeExternalUrl(applicant.listing?.website ?? null);
  const docStatusLabel: Record<string, string> = t.admin.verifications.docStatus;

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label={t.admin.verifications.breadcrumb}>
        <Link href="/admin/verifications" className="text-brand-700 hover:underline">
          {t.admin.verifications.backToQueue}
        </Link>
      </nav>

      {notice === 'decided-approved' ? (
        <Alert tone="success" title={t.admin.verifications.approvedTitle}>
          {t.admin.verifications.approvedBody}
        </Alert>
      ) : null}
      {notice === 'decided-rejected' ? (
        <Alert tone="warning" title={t.admin.verifications.refusedTitle}>
          {t.admin.verifications.refusedBody}
        </Alert>
      ) : null}

      {/* ── Case state ──────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {profile?.fullName?.trim() || applicant.email}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {accountTypeLabel(t, applicant.accountType)} ·{' '}
              {t.admin.verifications.round.replace('{round}', String(reviewCase.round))} ·{' '}
              {t.admin.verifications.submitted.replace(
                '{date}',
                formatDateTime(reviewCase.submittedAt),
              )}
            </p>
          </div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {verificationRequestLabel(t, reviewCase.status)}
          </span>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          {decided ? (
            <DescriptionList
              items={[
                {
                  term: t.admin.verifications.decision,
                  detail: verificationRequestLabel(t, reviewCase.status),
                },
                {
                  term: t.admin.verifications.decided,
                  detail: formatDateTime(reviewCase.decidedAt),
                },
                {
                  term: t.admin.verifications.reviewer,
                  detail: reviewCase.reviewer?.email ?? t.admin.verifications.notRecorded,
                },
                {
                  term: t.admin.verifications.reasonRecorded,
                  detail: reviewCase.decisionNotes ?? t.admin.verifications.noNotes,
                },
              ]}
            />
          ) : reviewCase.status === 'SUBMITTED' ? (
            <ClaimCaseForm
              caseId={reviewCase.id}
              labels={{
                button: t.admin.verifications.claim.button,
                pending: t.admin.verifications.claim.pending,
                hint: t.admin.verifications.claim.hint,
              }}
            />
          ) : claimedByMe ? (
            <Alert tone="info">{t.admin.verifications.claimedNotice}</Alert>
          ) : (
            <Alert tone="warning">
              {t.admin.verifications.takenByOther.replace(
                '{email}',
                reviewCase.reviewer?.email ?? t.admin.verifications.anotherReviewer,
              )}
            </Alert>
          )}
        </div>
      </Card>

      {applicant.isDemo ? (
        <Alert tone="neutral" title={t.admin.verifications.demoTitle}>
          {t.admin.verifications.demoBodyLead} <code>npm run seed:demo</code>{' '}
          {t.admin.verifications.demoBodyTail}
        </Alert>
      ) : null}

      {/* ── Applicant identity ──────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">{t.admin.verifications.applicantIdentity}</h2>
        <p className="mt-1 text-xs text-slate-500">{t.admin.verifications.auditNote}</p>

        {checkDigit === false ? (
          <Alert tone="warning" className="mt-3">
            {t.admin.verifications.checkDigitWarning}
          </Alert>
        ) : null}

        <div className="mt-3">
          <DescriptionList
            items={[
              { term: t.common.email, detail: applicant.email },
              {
                term: t.admin.verifications.emailConfirmed,
                detail: formatDateTime(applicant.emailVerifiedAt),
              },
              {
                term: t.dashboard.emiratesId,
                detail: (
                  <span className="font-mono text-base font-semibold tracking-wide">
                    {profile?.emiratesIdNumber ?? t.admin.verifications.notProvided}
                  </span>
                ),
              },
              {
                term: t.admin.verifications.idExpiry,
                detail: profile?.emiratesIdExpiry
                  ? formatDate(profile.emiratesIdExpiry)
                  : t.admin.verifications.notProvided,
              },
              {
                term: t.common.phone,
                detail: profile?.phone ?? t.admin.verifications.notProvided,
              },
              {
                term: t.admin.verifications.dateOfBirth,
                detail: profile?.dateOfBirth
                  ? `${formatDate(profile.dateOfBirth)}${
                      age !== null
                        ? ` ${t.admin.verifications.age.replace('{age}', String(age))}`
                        : ''
                    }`
                  : t.admin.verifications.notProvided,
              },
              {
                term: t.admin.verifications.placeOfBirth,
                detail: profile?.placeOfBirth ?? t.admin.verifications.notProvided,
              },
              {
                term: t.admin.verifications.countryOfResidence,
                detail: profile?.countryOfResidence ?? t.admin.verifications.notProvided,
              },
              {
                term: t.admin.verifications.nationality,
                detail: profile?.nationality ?? t.admin.verifications.notProvided,
              },
              {
                term: t.admin.verifications.work,
                detail: (
                  <span className="whitespace-pre-line">
                    {profile?.workDescription ?? t.admin.verifications.notProvided}
                  </span>
                ),
              },
              {
                term: t.admin.verifications.education,
                detail: (
                  <span className="whitespace-pre-line">
                    {profile?.educationBackground ?? t.admin.verifications.notProvided}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </Card>

      {/* ── Legal credentials ───────────────────────────────────────────── */}
      {applicant.lawyerProfile ? (
        <Card>
          <h2 className="font-semibold text-slate-900">
            {applicant.accountType === 'FIRM'
              ? t.admin.verifications.firmLegalHeading
              : t.admin.verifications.lawyerLegalHeading}
          </h2>
          <div className="mt-3">
            <DescriptionList
              items={[
                {
                  term: t.admin.verifications.licenceNumber,
                  detail: applicant.lawyerProfile.licenseNumber,
                },
                {
                  term: t.admin.verifications.licensingAuthority,
                  detail: applicant.lawyerProfile.licensingAuthority,
                },
                {
                  term: t.admin.verifications.issued,
                  detail: applicant.lawyerProfile.licenseIssuedOn
                    ? formatDate(applicant.lawyerProfile.licenseIssuedOn)
                    : t.admin.verifications.notStated,
                },
                {
                  term: t.admin.verifications.expires,
                  detail: applicant.lawyerProfile.licenseExpiresOn
                    ? formatDate(applicant.lawyerProfile.licenseExpiresOn)
                    : t.admin.verifications.notStated,
                },
                {
                  term: t.admin.verifications.barAssociation,
                  detail:
                    applicant.lawyerProfile.barAssociationNumber ??
                    t.admin.verifications.notStated,
                },
              ]}
            />
          </div>
        </Card>
      ) : null}

      {applicant.firmProfile ? (
        <Card>
          <h2 className="font-semibold text-slate-900">{t.admin.verifications.firmRegistration}</h2>
          <div className="mt-3">
            <DescriptionList
              items={[
                {
                  term: t.admin.verifications.registeredName,
                  detail: applicant.firmProfile.legalName,
                },
                {
                  term: t.admin.verifications.tradeLicence,
                  detail: applicant.firmProfile.tradeLicenseNumber,
                },
                {
                  term: t.admin.verifications.authority,
                  detail: applicant.firmProfile.tradeLicenseAuthority,
                },
                {
                  term: t.admin.verifications.issued,
                  detail: applicant.firmProfile.tradeLicenseIssuedOn
                    ? formatDate(applicant.firmProfile.tradeLicenseIssuedOn)
                    : t.admin.verifications.notStated,
                },
                {
                  term: t.admin.verifications.expires,
                  detail: applicant.firmProfile.tradeLicenseExpiresOn
                    ? formatDate(applicant.firmProfile.tradeLicenseExpiresOn)
                    : t.admin.verifications.notStated,
                },
                {
                  term: t.admin.verifications.structure,
                  detail: applicant.firmProfile.legalStructure ?? t.admin.verifications.notStated,
                },
                {
                  term: t.admin.verifications.registeredEmirate,
                  detail: applicant.firmProfile.registeredEmirate
                    ? emirateLabel(t, applicant.firmProfile.registeredEmirate)
                    : t.admin.verifications.notStated,
                },
                {
                  term: t.admin.verifications.authorisedSignatory,
                  detail:
                    applicant.firmProfile.authorisedSignatory ?? t.admin.verifications.notStated,
                },
                {
                  term: t.admin.verifications.address,
                  detail:
                    applicant.firmProfile.registeredAddress ?? t.admin.verifications.notStated,
                },
              ]}
            />
          </div>
        </Card>
      ) : null}

      {/* ── Listing ─────────────────────────────────────────────────────── */}
      {applicant.listing ? (
        <Card>
          <h2 className="font-semibold text-slate-900">{t.items.listing}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {applicant.listing.published
              ? t.admin.verifications.published
              : t.admin.verifications.draftNotPublic}{' '}
            · {applicant.listing.displayName}
            {website ? ` · ${website}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {applicant.listing.areas.map((area) => (
              <Chip key={area} tone="brand">
                {legalAreaLabel(t, area)}
              </Chip>
            ))}
            {applicant.listing.emirates.map((emirate) => (
              <Chip key={emirate}>{emirateLabel(t, emirate)}</Chip>
            ))}
          </div>
        </Card>
      ) : null}

      {/* ── Documents ───────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">
          {t.admin.verifications.documentsOnRequest.replace(
            '{count}',
            String(reviewCase.documents.length),
          )}
        </h2>

        {missingRequired.length > 0 ? (
          <Alert tone="error" className="mt-3">
            {t.admin.verifications.missingRequired.replace(
              '{kinds}',
              missingRequired.map((kind) => documentKindLabel(t, kind)).join(', '),
            )}
          </Alert>
        ) : null}

        {missingRequired.length === 0 && !reviewCase.documents.every((doc) => doc.status === 'APPROVED') ? (
          <Alert tone="info" className="mt-3">
            {t.admin.verifications.allPresent}
          </Alert>
        ) : null}

        <ul className="mt-4 space-y-4">
          {reviewCase.documents.map((document) => (
            <li key={document.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {documentKindLabel(t, document.kind)}
                    {required.includes(document.kind) ? (
                      <span className="ml-2 text-xs font-normal text-brand-700">
                        {t.admin.verifications.required}
                      </span>
                    ) : (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {t.admin.verifications.optional}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {document.fileName} · {formatFileSize(document.sizeBytes)} ·{' '}
                    {t.admin.verifications.uploaded.replace(
                      '{date}',
                      formatDateTime(document.createdAt),
                    )}
                    {document.documentNumber
                      ? ` · ${t.admin.verifications.docNumber.replace(
                          '{number}',
                          document.documentNumber,
                        )}`
                      : ''}
                    {document.expiresOn
                      ? ` · ${t.admin.verifications.docExpires.replace(
                          '{date}',
                          formatDate(document.expiresOn),
                        )}`
                      : ''}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                    sha256 {document.sha256.slice(0, 24)}…
                  </p>
                  {document.reviewNotes ? (
                    <p className="mt-1 text-xs text-slate-600">
                      {t.admin.verifications.previousNote.replace('{note}', document.reviewNotes)}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${DOC_STATUS_STYLES[document.status]}`}
                  >
                    {docStatusLabel[document.status] ?? document.status.replace('_', ' ').toLowerCase()}
                  </span>
                  <a
                    href={`/api/documents/${document.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses('secondary', 'sm')}
                  >
                    {t.admin.verifications.openDocument}
                  </a>
                </div>
              </div>

              {canReviewDocuments ? (
                <ReviewDocumentForm
                  documentId={document.id}
                  caseId={reviewCase.id}
                  labels={{
                    notesLabel: t.admin.verifications.review.notesLabel,
                    notesHint: t.admin.verifications.review.notesHint,
                    accept: t.admin.verifications.review.accept,
                    reject: t.admin.verifications.review.reject,
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      {/* ── Decision ────────────────────────────────────────────────────── */}
      {!decided && reviewCase.status !== 'WITHDRAWN' ? (
        <Card>
          <h2 className="font-semibold text-slate-900">{t.admin.verifications.recordDecision}</h2>

          {rejectedKinds.length > 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              {t.admin.verifications.rejectedSoFar.replace(
                '{kinds}',
                rejectedKinds.map((kind) => documentKindLabel(t, kind)).join(', '),
              )}
            </p>
          ) : null}

          <div className="mt-4">
            {canReviewDocuments ? (
              <DecisionForm
                caseId={reviewCase.id}
                labels={{
                  errorTitle: t.admin.verifications.decide.errorTitle,
                  reasonLabel: t.admin.verifications.decide.reasonLabel,
                  reasonHint: t.admin.verifications.decide.reasonHint,
                  approve: t.admin.verifications.decide.approve,
                  refuse: t.admin.verifications.decide.refuse,
                  footnote: t.admin.verifications.decide.footnote,
                }}
              />
            ) : (
              <Alert tone="info">{t.admin.verifications.takeFirst}</Alert>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
