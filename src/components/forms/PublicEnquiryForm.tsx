'use client';

import { useActionState } from 'react';
import { createEnquiryAction } from '@/app/actions/enquiry-actions';
import { initialFormState } from '@/lib/form-state';
import { LEGAL_AREAS } from '@/lib/constants';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui/primitives';

/**
 * The general enquiry form.
 *
 * Anyone can use it without an account, which is why the legend matters: an
 * enquiry goes into a shared pool and is answered by whoever picks it up, while
 * an account sends the matter directly to a chosen professional with documents,
 * a conversation and a record attached.
 */
export function PublicEnquiryForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction] = useActionState(createEnquiryAction, initialFormState);

  const value = (key: string) => state?.values?.[key] ?? '';

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? (
        <Alert tone="success" title="Enquiry sent">
          {state.message}
        </Alert>
      ) : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="The enquiry was not sent">
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="en-name" required error={state?.fieldErrors?.name}>
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

        <Field label="Email" htmlFor="en-email" required error={state?.fieldErrors?.email}>
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

        <Field label="Phone" htmlFor="en-phone" required error={state?.fieldErrors?.phone}>
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

        <Field label="Area of law" htmlFor="en-type" error={state?.fieldErrors?.caseType}>
          <Select
            id="en-type"
            name="caseType"
            defaultValue={value('caseType')}
            error={state?.fieldErrors?.caseType}
          >
            <option value="">Not sure / other</option>
            {LEGAL_AREAS.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Subject" htmlFor="en-subject" required error={state?.fieldErrors?.subject}>
        <Input
          id="en-subject"
          name="subject"
          required
          maxLength={160}
          placeholder="e.g. Question about a tenancy deposit"
          defaultValue={value('subject')}
          error={state?.fieldErrors?.subject}
        />
      </Field>

      <Field
        label="Your question"
        htmlFor="en-message"
        required
        error={state?.fieldErrors?.message}
        hint={compact ? undefined : 'At least 20 characters. A lawyer reads this before replying.'}
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

      <SubmitButton size={compact ? 'md' : 'lg'} pendingLabel="Sending…">
        Send my enquiry
      </SubmitButton>

      <p className="text-xs text-slate-500">
        Your enquiry goes into a shared pool that every registered lawyer and firm can see, and the
        first to pick it up contacts you directly.
      </p>
    </form>
  );
}
