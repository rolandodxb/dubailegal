'use client';

import { useActionState } from 'react';
import { createReviewAction } from '@/app/actions/review-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { StarIcon } from '@/components/icons';

export type ReviewableCase = {
  id: string;
  reference: string;
  title: string;
  professional: string;
};

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below expectations',
  3: 'Acceptable',
  4: 'Good',
  5: 'Excellent',
};

/**
 * Writes a review against a case this client actually had.
 *
 * The case selector is not decoration: a review is only accepted against a real
 * engagement, which is what stops the rating from being an open comment box.
 */
export function ReviewForm({ cases }: { cases: ReviewableCase[] }) {
  const [state, formAction] = useActionState(createReviewAction, initialFormState);
  const selected = state?.values?.rating ?? '';

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="Your review was not published">
          {state.message}
        </Alert>
      ) : null}

      {cases.length === 0 ? (
        <Alert tone="neutral">
          You can leave a review once a professional has accepted a case of yours. Reviews are tied
          to a real engagement, so there is nothing to review yet.
        </Alert>
      ) : null}

      <Field
        label="Which case is this about?"
        htmlFor="review-case"
        required
        error={state?.fieldErrors?.caseId}
        hint="Only cases a professional accepted appear here."
      >
        <Select
          id="review-case"
          name="caseId"
          required
          disabled={cases.length === 0}
          defaultValue={state?.values?.caseId ?? ''}
          error={state?.fieldErrors?.caseId}
        >
          <option value="">Choose a case…</option>
          {cases.map((item) => (
            <option key={item.id} value={item.id}>
              {item.reference} — {item.title} ({item.professional})
            </option>
          ))}
        </Select>
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">
          Your rating
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
              <span className="ml-2 text-xs text-slate-600">{RATING_LABELS[value]}</span>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.rating ? (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
            {state.fieldErrors.rating}
          </p>
        ) : null}
      </fieldset>

      <Field label="Headline" htmlFor="review-title" error={state?.fieldErrors?.title}>
        <Input
          id="review-title"
          name="title"
          maxLength={120}
          placeholder="e.g. Clear advice and quick to respond"
          defaultValue={state?.values?.title ?? ''}
          error={state?.fieldErrors?.title}
        />
      </Field>

      <Field
        label="Your review"
        htmlFor="review-body"
        required
        error={state?.fieldErrors?.body}
        hint="Describe your experience. At least 20 characters."
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

      <SubmitButton size="lg" disabled={cases.length === 0} pendingLabel="Publishing…">
        Publish review
      </SubmitButton>

      <p className="text-xs text-slate-500">
        Your review is published under your name with your verification badge. It is tied to the
        case you choose, and an administrator can hide it if it breaks the rules.
      </p>
    </form>
  );
}
