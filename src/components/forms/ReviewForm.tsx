'use client';

import { useActionState } from 'react';
import { createReviewAction } from '@/app/actions/review-actions';
import { initialFormState } from '@/lib/form-state';
import type { MemberCasesDict } from '@/lib/i18n/dict/memberCases';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { StarIcon } from '@/components/icons';

export type ReviewableCase = {
  id: string;
  reference: string;
  title: string;
  professional: string;
};

const RATING_LABEL_KEYS = ['ratingPoor', 'ratingBelow', 'ratingAcceptable', 'ratingGood', 'ratingExcellent'] as const;

/**
 * Writes a review against a case this client actually had.
 *
 * The case selector is not decoration: a review is only accepted against a real
 * engagement, which is what stops the rating from being an open comment box.
 */
export function ReviewForm({
  cases,
  labels,
}: {
  cases: ReviewableCase[];
  labels: MemberCasesDict['reviewForm'];
}) {
  const [state, formAction] = useActionState(createReviewAction, initialFormState);
  const selected = state?.values?.rating ?? '';

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.notPublished}>
          {state.message}
        </Alert>
      ) : null}

      {cases.length === 0 ? <Alert tone="neutral">{labels.empty}</Alert> : null}

      <Field
        label={labels.whichCase}
        htmlFor="review-case"
        required
        error={state?.fieldErrors?.caseId}
        hint={labels.whichCaseHint}
      >
        <Select
          id="review-case"
          name="caseId"
          required
          disabled={cases.length === 0}
          defaultValue={state?.values?.caseId ?? ''}
          error={state?.fieldErrors?.caseId}
        >
          <option value="">{labels.chooseCase}</option>
          {cases.map((item) => (
            <option key={item.id} value={item.id}>
              {item.reference} — {item.title} ({item.professional})
            </option>
          ))}
        </Select>
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">
          {labels.yourRating}
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              htmlFor={`rating-${value}`}
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 has-checked:border-amber-500 has-checked:bg-amber-50 has-checked:font-medium has-checked:text-amber-900"
            >
              <input
                id={`rating-${value}`}
                type="radio"
                name="rating"
                value={value}
                required
                defaultChecked={selected === String(value)}
                className="sr-only"
              />
              <span className="inline-flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: value }, (_, index) => (
                  <StarIcon key={index} size={12} />
                ))}
              </span>
              <span className="ml-2 text-xs text-slate-600">
                {labels[RATING_LABEL_KEYS[value - 1]!]}
              </span>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.rating ? (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
            {state.fieldErrors.rating}
          </p>
        ) : null}
      </fieldset>

      <Field label={labels.headline} htmlFor="review-title" error={state?.fieldErrors?.title}>
        <Input
          id="review-title"
          name="title"
          maxLength={120}
          placeholder={labels.headlinePlaceholder}
          defaultValue={state?.values?.title ?? ''}
          error={state?.fieldErrors?.title}
        />
      </Field>

      <Field
        label={labels.yourReview}
        htmlFor="review-body"
        required
        error={state?.fieldErrors?.body}
        hint={labels.yourReviewHint}
      >
        <Textarea
          id="review-body"
          name="body"
          required
          minLength={20}
          maxLength={4000}
          rows={5}
          defaultValue={state?.values?.body ?? ''}
          error={state?.fieldErrors?.body}
        />
      </Field>

      <SubmitButton size="lg" disabled={cases.length === 0} pendingLabel={labels.publishing}>
        {labels.publish}
      </SubmitButton>

      <p className="text-xs text-slate-500">{labels.footnote}</p>
    </form>
  );
}
