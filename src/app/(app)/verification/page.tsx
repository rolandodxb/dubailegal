import type { Metadata } from 'next';
import Link from 'next/link';
import { DocumentKind } from '@prisma/client';
import { requireMember } from '@/lib/auth';
import { getVerificationOverview } from '@/server/services/verification-service';
import { getAvailability, isEnabled } from '@/lib/availability';
import { VERIFICATION_REQUEST_LABEL, DOCUMENT_KIND_LABEL, VERIFICATION_STATUS_LABEL } from '@/lib/constants';
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

export const metadata: Metadata = { title: 'Verification' };

export default async function VerificationPage() {
  const user = await requireMember();
  const [overview, availability] = await Promise.all([
    getVerificationOverview(user.id),
    getAvailability(),
  ]);
  if (!overview) return null;

  const canSubmitDocuments = isEnabled(availability.settings, 'feature.verification_submission');

  const required = overview.requirements.required;
  const optional = overview.requirements.optional;
  const orderedKinds: DocumentKind[] = [...required, ...optional, 'OTHER'];
  const uniqueKinds = Array.from(new Set(orderedKinds));

  const usable = overview.documents.filter((doc) => doc.status !== 'SUPERSEDED');
  const presentKinds = new Set(
    usable.filter((doc) => doc.status !== 'REJECTED').map((doc) => doc.kind),
  );
  const openCase = overview.openCase;

  // ── Checklist ────────────────────────────────────────────────────────────
  const profileDone = overview.missingProfileFields.length === 0;
  const documentsDone = overview.missingDocuments.length === 0;
  const credentialDone = !overview.needsCredential || overview.hasCredential;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Verification</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Upload the documents a reviewer needs, then submit. Nothing is verified automatically —
          a person examines each document and records the decision.
        </p>
      </header>

      {/* ── Current status ──────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">Current status</h2>
        <div className="mt-3">
          <DescriptionList
            items={[
              { term: 'Status', detail: VERIFICATION_STATUS_LABEL[overview.status] },
              {
                term: 'Emirates ID on file',
                detail: overview.profile?.emiratesIdNumber
                  ? maskEmiratesId(overview.profile.emiratesIdNumber)
                  : 'Not provided yet',
              },
              {
                term: 'Documents on file',
                detail: `${usable.length} (${presentKinds.size} of ${required.length} required types)`,
              },
              {
                term: 'Requests submitted',
                detail: String(overview.cases.length),
              },
              {
                term: 'Open request',
                detail: openCase
                  ? `Round ${openCase.round}, submitted ${formatDate(openCase.submittedAt)}`
                  : 'None',
              },
            ]}
          />
        </div>
      </Card>

      <EncryptionNotice subject="Identity documents" className="mb-6" />

      {overview.checkDigitWarning ? (
        <Alert tone="warning" title="About your Emirates ID number">
          {overview.checkDigitWarning}
        </Alert>
      ) : null}

      {/* ── Reviewer feedback ───────────────────────────────────────────── */}
      {overview.latestCase?.status === 'REJECTED' && overview.latestCase.decisionNotes ? (
        <Alert tone="error" title="Why your last request was not approved">
          <p className="whitespace-pre-line">{overview.latestCase.decisionNotes}</p>
          <p className="mt-2 text-xs">
            Fix what is described, then submit again. Uploading a replacement document does not
            require a new account.
          </p>
        </Alert>
      ) : null}

      {overview.latestCase?.status === 'APPROVED' ? (
        <Alert tone="success" title="Your account is verified">
          Approved by a reviewer on {formatDateTime(overview.latestCase.decidedAt)}. Replacing a
          required document withdraws the badge until it is reviewed again.
        </Alert>
      ) : null}

      {/* ── Checklist ───────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">What is still needed</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <ChecklistItem done={overview.emailVerified} label="Email address confirmed" />
          <ChecklistItem
            done={profileDone}
            label="Profile complete"
            detail={
              profileDone
                ? undefined
                : `Missing: ${overview.missingProfileFields.join(', ')}`
            }
            href="/profile"
            hrefLabel="Open my profile"
          />
          {overview.needsCredential ? (
            <ChecklistItem
              done={credentialDone}
              label={
                overview.accountType === 'FIRM'
                  ? 'Firm legal registration added'
                  : 'Legal licence added'
              }
              href="/credentials"
              hrefLabel="Open legal details"
            />
          ) : null}
          <ChecklistItem
            done={documentsDone}
            label="Required documents uploaded"
            detail={
              documentsDone
                ? undefined
                : `Missing: ${overview.missingDocuments
                    .map((kind) => DOCUMENT_KIND_LABEL[kind])
                    .join(', ')}`
            }
            href="#documents"
            hrefLabel="Upload below"
          />
        </ul>
      </Card>

      {/* ── Documents ───────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">Your documents</h2>
        <p className="mt-1 text-sm text-slate-600">
          Documents are stored privately. Only you and the reviewer examining your case can open
          them.
        </p>
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
          />
        </div>
      </Card>

      {/* ── Upload ──────────────────────────────────────────────────────── */}
      <Card>
        <h2 id="documents" className="font-semibold text-slate-900">
          Upload a document
        </h2>

        {openCase ? (
          <Alert tone="info" className="mt-3" title="Your documents are with a reviewer">
            Documents cannot be changed while a request is being reviewed. Withdraw the request
            below if you need to replace something.
          </Alert>
        ) : (
          <div className="mt-4">
            <DocumentUploadForm kinds={uniqueKinds} requiredKinds={required} />
          </div>
        )}
      </Card>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">
          {openCase ? 'Request in progress' : 'Submit for verification'}
        </h2>

        <div className="mt-4">
          {openCase ? (
            <WithdrawVerificationForm />
          ) : canSubmitDocuments ? (
            <SubmitVerificationForm blockers={overview.blockers} />
          ) : (
            <Alert tone="warning">
              Submitting documents for verification is currently switched off. You can still upload
              and review your documents, and submit once it is switched back on.
            </Alert>
          )}
        </div>
      </Card>

      {/* ── History ────────────────────────────────────────────────────── */}
      {overview.cases.length > 0 ? (
        <Card>
          <h2 className="font-semibold text-slate-900">History</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {overview.cases.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    Round {item.round} · {VERIFICATION_REQUEST_LABEL[item.status] ?? item.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    Submitted {formatDate(item.submittedAt)}
                    {item.decidedAt ? ` · decided ${formatDate(item.decidedAt)}` : ''}
                  </p>
                </div>
                {item.status === 'WITHDRAWN' ? (
                  <p className="mt-1 text-xs text-slate-500">Withdrawn by you.</p>
                ) : null}
                {item.decisionNotes ? (
                  <p className="mt-1 whitespace-pre-line text-xs text-slate-600">
                    {item.decisionNotes}
                  </p>
                ) : null}
                {item.reviewer ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Reviewed by {item.reviewer.email}
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
  detail,
  href,
  hrefLabel,
}: {
  done: boolean;
  label: string;
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
          <span className="sr-only">{done ? ' — complete' : ' — outstanding'}</span>
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
