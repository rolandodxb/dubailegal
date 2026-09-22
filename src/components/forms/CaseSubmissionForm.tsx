'use client';

import { useActionState } from 'react';
import { createCaseAction } from '@/app/actions/case-actions';
import { initialFormState } from '@/lib/form-state';
import { LEGAL_AREAS, MAX_CASE_FILES } from '@/lib/constants';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui/primitives';

/**
 * "Get in touch": the client names the case, picks its type, describes it and
 * attaches whatever papers the professional needs to assess it.
 */
export function CaseSubmissionForm({
  listingId,
  professionalName,
  suggestedType,
}: {
  listingId: string;
  professionalName: string;
  suggestedType?: string;
}) {
  const [state, formAction] = useActionState(createCaseAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="The case was not sent">
          {state.message}
        </Alert>
      ) : null}

      <input type="hidden" name="listingId" value={listingId} />

      <Field
        label="Case name"
        htmlFor="case-title"
        required
        error={state?.fieldErrors?.title}
        hint="A short name you will recognise, for example “Commercial lease dispute — Deira office”."
      >
        <Input
          id="case-title"
          name="title"
          required
          minLength={4}
          maxLength={160}
          defaultValue={state?.values?.title ?? ''}
          error={state?.fieldErrors?.title}
        />
      </Field>

      <Field label="Case type" htmlFor="case-type" required error={state?.fieldErrors?.caseType}>
        <Select
          id="case-type"
          name="caseType"
          required
          defaultValue={state?.values?.caseType ?? suggestedType ?? 'COMMERCIAL'}
          error={state?.fieldErrors?.caseType}
        >
          {LEGAL_AREAS.map((area) => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Case description"
        htmlFor="case-description"
        required
        error={state?.fieldErrors?.description}
        hint={`Explain what has happened and what you need. ${professionalName} reads this first.`}
      >
        <Textarea
          id="case-description"
          name="description"
          required
          minLength={30}
          maxLength={8000}
          rows={8}
          defaultValue={state?.values?.description ?? ''}
          error={state?.fieldErrors?.description}
        />
      </Field>

      <Field
        label="Attachments"
        htmlFor="case-files"
        error={state?.fieldErrors?.files}
        hint={`Contracts, letters, notices, photographs. PDF, JPEG, PNG or WebP, up to ${MAX_CASE_FILES} files of 10 MB each.`}
      >
        <input
          id="case-files"
          name="files"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-brand-800 hover:file:bg-brand-100"
        />
      </Field>

      <SubmitButton size="lg" pendingLabel="Sending your case…">
        Send case for review
      </SubmitButton>

      <p className="text-xs text-slate-500">
        Your case starts as <strong>Submitted</strong>. When the professional opens it you will see{' '}
        <strong>Under review</strong>, and once they accept it, <strong>Assigned</strong>.
      </p>
    </form>
  );
}
