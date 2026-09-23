'use client';

import { useActionState } from 'react';
import { createCaseAction } from '@/app/actions/case-actions';
import { initialFormState } from '@/lib/form-state';
import type { MemberCasesDict } from '@/lib/i18n/dict/memberCases';
import { MAX_CASE_FILES } from '@/lib/constants';
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
  labels,
  areaOptions,
  statusLabels,
}: {
  listingId: string;
  professionalName: string;
  suggestedType?: string;
  labels: MemberCasesDict['caseForm'];
  /** The practice areas, already in the reader's language. */
  areaOptions: { value: string; label: string }[];
  /** The three case states the closing note names, in the reader's language. */
  statusLabels: { submitted: string; underReview: string; assigned: string };
}) {
  const [state, formAction] = useActionState(createCaseAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.notSent}>
          {state.message}
        </Alert>
      ) : null}

      <input type="hidden" name="listingId" value={listingId} />

      <Field
        label={labels.caseName}
        htmlFor="case-title"
        required
        error={state?.fieldErrors?.title}
        hint={labels.caseNameHint}
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

      <Field
        label={labels.caseType}
        htmlFor="case-type"
        required
        error={state?.fieldErrors?.caseType}
      >
        <Select
          id="case-type"
          name="caseType"
          required
          defaultValue={state?.values?.caseType ?? suggestedType ?? 'COMMERCIAL'}
          error={state?.fieldErrors?.caseType}
        >
          {areaOptions.map((area) => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={labels.caseDescription}
        htmlFor="case-description"
        required
        error={state?.fieldErrors?.description}
        hint={labels.caseDescriptionHint.replace('{name}', professionalName)}
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
        label={labels.attachments}
        htmlFor="case-files"
        error={state?.fieldErrors?.files}
        hint={labels.attachmentsHint.replace('{count}', String(MAX_CASE_FILES))}
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

      <SubmitButton size="lg" pendingLabel={labels.sending}>
        {labels.send}
      </SubmitButton>

      <p className="text-xs text-slate-500">
        {labels.statusFlowStart}
        <strong>{statusLabels.submitted}</strong>
        {labels.statusFlowMid}
        <strong>{statusLabels.underReview}</strong>
        {labels.statusFlowEnd}
        <strong>{statusLabels.assigned}</strong>.
      </p>
    </form>
  );
}
