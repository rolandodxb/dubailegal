'use client';

import { useActionState } from 'react';
import { createEnquiryAction } from '@/app/actions/enquiry-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui/primitives';

/**
 * The general enquiry form.
 *
 * Anyone can use it without an account, which is why the legend matters: an
 * enquiry goes into a shared pool and is answered by whoever picks it up, while
 * an account sends the matter directly to a chosen professional with documents,
 * a conversation and a record attached.
 *
 * The words come from the page that renders it: this is a client component, so
 * it cannot read the dictionary itself.
 */
export function PublicEnquiryForm({
  compact = false,
  labels,
}: {
  compact?: boolean;
  labels: {
    sentTitle: string;
    failedTitle: string;
    name: string;
    email: string;
    phone: string;
    areaOfLaw: string;
    areaOptions: { value: string; label: string }[];
    notSure: string;
    subject: string;
    subjectPlaceholder: string;
    question: string;
    questionHint: string;
    pending: string;
    submit: string;
    poolNote: string;
  };
}) {
  const [state, formAction] = useActionState(createEnquiryAction, initialFormState);

  const value = (key: string) => state?.values?.[key] ?? '';

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? (
        <Alert tone="success" title={labels.sentTitle}>
          {state.message}
        </Alert>
      ) : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.failedTitle}>
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={labels.name} htmlFor="en-name" required error={state?.fieldErrors?.name}>
          <Input
            id="en-name"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            defaultValue={value('name')}
            error={state?.fieldErrors?.name}
          />
        </Field>

        <Field label={labels.email} htmlFor="en-email" required error={state?.fieldErrors?.email}>
          <Input
            id="en-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={value('email')}
            error={state?.fieldErrors?.email}
          />
        </Field>

        <Field label={labels.phone} htmlFor="en-phone" required error={state?.fieldErrors?.phone}>
          <Input
            id="en-phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+971 50 123 4567"
            defaultValue={value('phone')}
            error={state?.fieldErrors?.phone}
          />
        </Field>

        <Field label={labels.areaOfLaw} htmlFor="en-type" error={state?.fieldErrors?.caseType}>
          <Select
            id="en-type"
            name="caseType"
            defaultValue={value('caseType')}
            error={state?.fieldErrors?.caseType}
          >
            <option value="">{labels.notSure}</option>
            {labels.areaOptions.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label={labels.subject} htmlFor="en-subject" required error={state?.fieldErrors?.subject}>
        <Input
          id="en-subject"
          name="subject"
          required
          maxLength={160}
          placeholder={labels.subjectPlaceholder}
          defaultValue={value('subject')}
          error={state?.fieldErrors?.subject}
        />
      </Field>

      <Field
        label={labels.question}
        htmlFor="en-message"
        required
        error={state?.fieldErrors?.message}
        hint={compact ? undefined : labels.questionHint}
      >
        <Textarea
          id="en-message"
          name="message"
          required
          minLength={20}
          maxLength={4000}
          rows={compact ? 4 : 5}
          defaultValue={value('message')}
          error={state?.fieldErrors?.message}
        />
      </Field>

      <SubmitButton size={compact ? 'md' : 'lg'} pendingLabel={labels.pending}>
        {labels.submit}
      </SubmitButton>

      <p className="text-xs text-slate-500">{labels.poolNote}</p>
    </form>
  );
}
