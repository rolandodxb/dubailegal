'use client';

import { useActionState } from 'react';
import type { DocumentKind } from '@prisma/client';
import { deleteDocumentAction, uploadDocumentAction } from '@/app/actions/profile-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Select } from '@/components/ui/primitives';

type DocumentStatus = 'AWAITING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';

export type DocumentRow = {
  id: string;
  kind: DocumentKind;
  status: DocumentStatus;
  fileName: string;
  reviewNotes: string | null;
  reviewedAt: Date | null;
};

const STATUS_STYLES: Record<DocumentStatus, string> = {
  AWAITING_REVIEW: 'bg-brand-50 text-brand-800 ring-brand-200',
  APPROVED: 'bg-green-50 text-green-800 ring-green-200',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200',
  SUPERSEDED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/** The words the upload form shows, in the reader's language. */
export type DocumentUploadFormLabels = {
  notUploadedTitle: string;
  type: string;
  requiredMark: string;
  optionalMark: string;
  file: string;
  fileHint: string;
  documentNumber: string;
  documentNumberHint: string;
  expiryDate: string;
  uploading: string;
  upload: string;
  /** The name of each document kind, keyed by the stored code. */
  kindLabels: Record<string, string>;
};

/** The words the document list shows, in the reader's language. */
export type DocumentListLabels = {
  empty: string;
  statusAwaitingReview: string;
  statusApproved: string;
  statusRejected: string;
  statusSuperseded: string;
  view: string;
  reviewerSaid: string;
  remove: string;
  removeConfirm: string;
  removing: string;
  /** The name of each document kind, keyed by the stored code. */
  kindLabels: Record<string, string>;
};

/**
 * Uploads one piece of evidence. Replacing a document supersedes the previous
 * one of the same type rather than deleting it, so a reviewer sees the current
 * version and the history survives.
 */
export function DocumentUploadForm({
  kinds,
  requiredKinds,
  labels,
}: {
  kinds: DocumentKind[];
  requiredKinds: DocumentKind[];
  labels: DocumentUploadFormLabels;
}) {
  const [state, formAction] = useActionState(uploadDocumentAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.notUploadedTitle}>
          {state.message}
        </Alert>
      ) : null}

      <Field label={labels.type} htmlFor="kind" required error={state?.fieldErrors?.kind}>
        <Select id="kind" name="kind" required error={state?.fieldErrors?.kind}>
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {labels.kindLabels[kind]}
              {requiredKinds.includes(kind) ? labels.requiredMark : labels.optionalMark}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={labels.file}
        htmlFor="file"
        required
        error={state?.fieldErrors?.file}
        hint={labels.fileHint}
      >
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-brand-800 hover:file:bg-brand-100"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={labels.documentNumber}
          htmlFor="documentNumber"
          error={state?.fieldErrors?.documentNumber}
          hint={labels.documentNumberHint}
        >
          <Input id="documentNumber" name="documentNumber" maxLength={80} />
        </Field>

        <Field label={labels.expiryDate} htmlFor="expiresOn" error={state?.fieldErrors?.expiresOn}>
          <Input id="expiresOn" name="expiresOn" type="date" />
        </Field>
      </div>

      <SubmitButton pendingLabel={labels.uploading}>{labels.upload}</SubmitButton>
    </form>
  );
}

export function DocumentList({
  documents,
  labels,
}: {
  documents: DocumentRow[];
  labels: DocumentListLabels;
}) {
  const statusLabels: Record<DocumentStatus, string> = {
    AWAITING_REVIEW: labels.statusAwaitingReview,
    APPROVED: labels.statusApproved,
    REJECTED: labels.statusRejected,
    SUPERSEDED: labels.statusSuperseded,
  };

  if (documents.length === 0) {
    return <p className="text-sm text-slate-600">{labels.empty}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {documents.map((document) => (
        <li key={document.id} className="py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{labels.kindLabels[document.kind]}</p>
              <p className="truncate text-xs text-slate-500">{document.fileName}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[document.status]}`}
              >
                {statusLabels[document.status]}
              </span>
              <a
                href={`/api/documents/${document.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                {labels.view}
              </a>
              <DeleteDocumentButton documentId={document.id} labels={labels} />
            </div>
          </div>
          {document.status === 'REJECTED' && document.reviewNotes ? (
            <p className="mt-1.5 rounded-md bg-red-50 px-2 py-1 text-xs text-red-800">
              {labels.reviewerSaid.replace('{notes}', document.reviewNotes)}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function DeleteDocumentButton({
  documentId,
  labels,
}: {
  documentId: string;
  labels: DocumentListLabels;
}) {
  const [state, formAction] = useActionState(deleteDocumentAction, initialFormState);

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="documentId" value={documentId} />
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      <SubmitButton
        variant="ghost"
        size="sm"
        className="text-red-700 hover:bg-red-50"
        confirm={labels.removeConfirm}
        pendingLabel={labels.removing}
      >
        {labels.remove}
      </SubmitButton>
    </form>
  );
}
