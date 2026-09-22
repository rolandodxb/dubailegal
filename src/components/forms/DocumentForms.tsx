'use client';

import { useActionState } from 'react';
import type { DocumentKind } from '@prisma/client';
import { deleteDocumentAction, uploadDocumentAction } from '@/app/actions/profile-actions';
import { initialFormState } from '@/lib/form-state';
import { DOCUMENT_KIND_HINT, DOCUMENT_KIND_LABEL } from '@/lib/constants';
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

const STATUS_LABELS: Record<DocumentStatus, string> = {
  AWAITING_REVIEW: 'Waiting to be reviewed',
  APPROVED: 'Accepted',
  REJECTED: 'Not accepted',
  SUPERSEDED: 'Replaced',
};

/**
 * Uploads one piece of evidence. Replacing a document supersedes the previous
 * one of the same type rather than deleting it, so a reviewer sees the current
 * version and the history survives.
 */
export function DocumentUploadForm({
  kinds,
  requiredKinds,
}: {
  kinds: DocumentKind[];
  requiredKinds: DocumentKind[];
}) {
  const [state, formAction] = useActionState(uploadDocumentAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="The document was not uploaded">
          {state.message}
        </Alert>
      ) : null}

      <Field label="Document type" htmlFor="kind" required error={state?.fieldErrors?.kind}>
        <Select id="kind" name="kind" required error={state?.fieldErrors?.kind}>
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {DOCUMENT_KIND_LABEL[kind]}
              {requiredKinds.includes(kind) ? ' — required' : ' — optional'}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="File"
        htmlFor="file"
        required
        error={state?.fieldErrors?.file}
        hint="PDF, JPEG, PNG or WebP, up to 10 MB. The type is confirmed from the file's contents, not its name."
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
          label="Number on the document"
          htmlFor="documentNumber"
          error={state?.fieldErrors?.documentNumber}
          hint="Optional. Helps the reviewer match it."
        >
          <Input id="documentNumber" name="documentNumber" maxLength={80} />
        </Field>

        <Field label="Expiry date" htmlFor="expiresOn" error={state?.fieldErrors?.expiresOn}>
          <Input id="expiresOn" name="expiresOn" type="date" />
        </Field>
      </div>

      <SubmitButton pendingLabel="Uploading…">Upload document</SubmitButton>
    </form>
  );
}

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No documents uploaded yet. Every account must upload an Emirates ID before it can be
        verified.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {documents.map((document) => (
        <li key={document.id} className="py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {DOCUMENT_KIND_LABEL[document.kind]}
              </p>
              <p className="truncate text-xs text-slate-500">{document.fileName}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[document.status]}`}
              >
                {STATUS_LABELS[document.status]}
              </span>
              <a
                href={`/api/documents/${document.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                View
              </a>
              <DeleteDocumentButton documentId={document.id} />
            </div>
          </div>
          {document.status === 'REJECTED' && document.reviewNotes ? (
            <p className="mt-1.5 rounded-md bg-red-50 px-2 py-1 text-xs text-red-800">
              Reviewer said: {document.reviewNotes}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function DeleteDocumentButton({ documentId }: { documentId: string }) {
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
        confirm="Remove this document? You will need to upload it again."
        pendingLabel="Removing…"
      >
        Remove
      </SubmitButton>
    </form>
  );
}
