import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requestMeta, requireReviewer } from '@/lib/auth';
import { getCaseForReview } from '@/server/services/verification-service';
import {
  ACCOUNT_TYPE_LABEL,
  VERIFICATION_REQUEST_LABEL,
  DOCUMENT_KIND_LABEL,
  DOCUMENT_REQUIREMENTS,
  EMIRATE_LABEL,
  LEGAL_AREA_LABEL,
} from '@/lib/constants';
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
  const reviewer = await requireReviewer();
  const meta = await requestMeta();
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

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label="Breadcrumb">
        <Link href="/admin/verifications" className="text-brand-700 hover:underline">
          ← Back to the verification queue
        </Link>
      </nav>

      {notice === 'decided-approved' ? (
        <Alert tone="success" title="Case approved">
          The verification badge has been issued and the applicant has been marked verified.
        </Alert>
      ) : null}
      {notice === 'decided-rejected' ? (
        <Alert tone="warning" title="Case refused">
          The decision and your reasons are recorded. The applicant can correct the file and submit
          again.
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
              {ACCOUNT_TYPE_LABEL[applicant.accountType]} · round {reviewCase.round} · submitted{' '}
              {formatDateTime(reviewCase.submittedAt)}
            </p>
          </div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {VERIFICATION_REQUEST_LABEL[reviewCase.status] ?? reviewCase.status}
          </span>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          {decided ? (
            <DescriptionList
              items={[
                {
                  term: 'Decision',
                  detail: VERIFICATION_REQUEST_LABEL[reviewCase.status] ?? reviewCase.status,
                },
                { term: 'Decided', detail: formatDateTime(reviewCase.decidedAt) },
                {
                  term: 'Reviewer',
                  detail: reviewCase.reviewer?.email ?? 'Not recorded',
                },
                {
                  term: 'Reason recorded',
                  detail: reviewCase.decisionNotes ?? 'No notes were recorded.',
                },
              ]}
            />
          ) : reviewCase.status === 'SUBMITTED' ? (
            <ClaimCaseForm caseId={reviewCase.id} />
          ) : claimedByMe ? (
            <Alert tone="info">
              You have taken this request. Review each document below, then record a decision.
            </Alert>
          ) : (
            <Alert tone="warning">
              This request has been taken by {reviewCase.reviewer?.email ?? 'another reviewer'}. You cannot
              record decisions on it.
            </Alert>
          )}
        </div>
      </Card>

      {applicant.isDemo ? (
        <Alert tone="neutral" title="This is seeded demo data, not a real applicant">
          Every value on this account — the name, the Emirates ID number, the licence and the
          uploaded files — was generated by <code>npm run seed:demo</code> so the product can be
          explored. Nothing here was supplied by a real person or firm.
        </Alert>
      ) : null}

      {/* ── Applicant identity ──────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">Applicant identity</h2>
        <p className="mt-1 text-xs text-slate-500">
          Reading this page is recorded in the audit log. The Emirates ID is compared against the
          uploaded card.
        </p>

        {checkDigit === false ? (
          <Alert tone="warning" className="mt-3">
            The Emirates ID fails its internal check digit. Look carefully at the uploaded card
            before approving.
          </Alert>
        ) : null}

        <div className="mt-3">
          <DescriptionList
            items={[
              { term: 'Email', detail: applicant.email },
              { term: 'Email confirmed', detail: formatDateTime(applicant.emailVerifiedAt) },
              {
                term: 'Emirates ID',
                detail: (
                  <span className="font-mono text-base font-semibold tracking-wide">
                    {profile?.emiratesIdNumber ?? 'Not provided'}
                  </span>
                ),
              },
              {
                term: 'ID expiry',
                detail: profile?.emiratesIdExpiry ? formatDate(profile.emiratesIdExpiry) : 'Not provided',
              },
              { term: 'Phone', detail: profile?.phone ?? 'Not provided' },
              {
                term: 'Date of birth',
                detail: profile?.dateOfBirth
                  ? `${formatDate(profile.dateOfBirth)}${age !== null ? ` (age ${age})` : ''}`
                  : 'Not provided',
              },
              { term: 'Place of birth', detail: profile?.placeOfBirth ?? 'Not provided' },
              {
                term: 'Country of residence',
                detail: profile?.countryOfResidence ?? 'Not provided',
              },
              { term: 'Nationality', detail: profile?.nationality ?? 'Not provided' },
              {
                term: 'Work',
                detail: <span className="whitespace-pre-line">{profile?.workDescription ?? 'Not provided'}</span>,
              },
              {
                term: 'Education',
                detail: (
                  <span className="whitespace-pre-line">{profile?.educationBackground ?? 'Not provided'}</span>
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
            {applicant.accountType === 'FIRM' ? 'Legal consultant registration' : 'Legal licence'}
          </h2>
          <div className="mt-3">
            <DescriptionList
              items={[
                { term: 'Licence number', detail: applicant.lawyerProfile.licenseNumber },
                {
                  term: 'Licensing authority',
                  detail: applicant.lawyerProfile.licensingAuthority,
                },
                {
                  term: 'Issued',
                  detail: applicant.lawyerProfile.licenseIssuedOn
                    ? formatDate(applicant.lawyerProfile.licenseIssuedOn)
                    : 'Not stated',
                },
                {
                  term: 'Expires',
                  detail: applicant.lawyerProfile.licenseExpiresOn
                    ? formatDate(applicant.lawyerProfile.licenseExpiresOn)
                    : 'Not stated',
                },
                {
                  term: 'Bar association',
                  detail: applicant.lawyerProfile.barAssociationNumber ?? 'Not stated',
                },
              ]}
            />
          </div>
        </Card>
      ) : null}

      {applicant.firmProfile ? (
        <Card>
          <h2 className="font-semibold text-slate-900">Firm registration</h2>
          <div className="mt-3">
            <DescriptionList
              items={[
                { term: 'Registered name', detail: applicant.firmProfile.legalName },
                { term: 'Trade licence', detail: applicant.firmProfile.tradeLicenseNumber },
                { term: 'Authority', detail: applicant.firmProfile.tradeLicenseAuthority },
                {
                  term: 'Issued',
                  detail: applicant.firmProfile.tradeLicenseIssuedOn
                    ? formatDate(applicant.firmProfile.tradeLicenseIssuedOn)
                    : 'Not stated',
                },
                {
                  term: 'Expires',
                  detail: applicant.firmProfile.tradeLicenseExpiresOn
                    ? formatDate(applicant.firmProfile.tradeLicenseExpiresOn)
                    : 'Not stated',
                },
                {
                  term: 'Structure',
                  detail: applicant.firmProfile.legalStructure ?? 'Not stated',
                },
                {
                  term: 'Registered emirate',
                  detail: applicant.firmProfile.registeredEmirate
                    ? EMIRATE_LABEL[applicant.firmProfile.registeredEmirate]
                    : 'Not stated',
                },
                {
                  term: 'Authorised signatory',
                  detail: applicant.firmProfile.authorisedSignatory ?? 'Not stated',
                },
                {
                  term: 'Address',
                  detail: applicant.firmProfile.registeredAddress ?? 'Not stated',
                },
              ]}
            />
          </div>
        </Card>
      ) : null}

      {/* ── Listing ─────────────────────────────────────────────────────── */}
      {applicant.listing ? (
        <Card>
          <h2 className="font-semibold text-slate-900">Directory listing</h2>
          <p className="mt-1 text-sm text-slate-600">
            {applicant.listing.published ? 'Published' : 'Draft, not public'} ·{' '}
            {applicant.listing.displayName}
            {website ? ` · ${website}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {applicant.listing.areas.map((area) => (
              <Chip key={area} tone="brand">
                {LEGAL_AREA_LABEL[area]}
              </Chip>
            ))}
            {applicant.listing.emirates.map((emirate) => (
              <Chip key={emirate}>{EMIRATE_LABEL[emirate]}</Chip>
            ))}
          </div>
        </Card>
      ) : null}

      {/* ── Documents ───────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">
          Documents on this request ({reviewCase.documents.length})
        </h2>

        {missingRequired.length > 0 ? (
          <Alert tone="error" className="mt-3">
            This request is missing required documents:{' '}
            {missingRequired.map((kind) => DOCUMENT_KIND_LABEL[kind]).join(', ')}. It cannot be
            approved as it stands.
          </Alert>
        ) : null}

        {missingRequired.length === 0 && !reviewCase.documents.every((doc) => doc.status === 'APPROVED') ? (
          <Alert tone="info" className="mt-3">
            Every required document is present. Accept each one below before approving the case.
          </Alert>
        ) : null}

        <ul className="mt-4 space-y-4">
          {reviewCase.documents.map((document) => (
            <li key={document.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {DOCUMENT_KIND_LABEL[document.kind]}
                    {required.includes(document.kind) ? (
                      <span className="ml-2 text-xs font-normal text-brand-700">required</span>
                    ) : (
                      <span className="ml-2 text-xs font-normal text-slate-500">optional</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {document.fileName} · {formatFileSize(document.sizeBytes)} · uploaded{' '}
                    {formatDateTime(document.createdAt)}
                    {document.documentNumber ? ` · number ${document.documentNumber}` : ''}
                    {document.expiresOn ? ` · expires ${formatDate(document.expiresOn)}` : ''}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                    sha256 {document.sha256.slice(0, 24)}…
                  </p>
                  {document.reviewNotes ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Previous note: {document.reviewNotes}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${DOC_STATUS_STYLES[document.status]}`}
                  >
                    {document.status.replace('_', ' ').toLowerCase()}
                  </span>
                  <a
                    href={`/api/documents/${document.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses('secondary', 'sm')}
                  >
                    Open document
                  </a>
                </div>
              </div>

              {canReviewDocuments ? (
                <ReviewDocumentForm documentId={document.id} caseId={reviewCase.id} />
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      {/* ── Decision ────────────────────────────────────────────────────── */}
      {!decided && reviewCase.status !== 'WITHDRAWN' ? (
        <Card>
          <h2 className="font-semibold text-slate-900">Record your decision</h2>

          {rejectedKinds.length > 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              Rejected so far: {rejectedKinds.map((kind) => DOCUMENT_KIND_LABEL[kind]).join(', ')}
            </p>
          ) : null}

          <div className="mt-4">
            {canReviewDocuments ? (
              <DecisionForm caseId={reviewCase.id} />
            ) : (
              <Alert tone="info">
                Take the request before recording a decision.
              </Alert>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
