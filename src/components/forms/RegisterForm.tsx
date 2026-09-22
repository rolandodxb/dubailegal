'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction } from '@/app/actions/auth-actions';
import { initialFormState } from '@/lib/form-state';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_DESCRIPTION, ACCOUNT_TYPE_LABEL, MIN_PASSWORD_LENGTH } from '@/lib/constants';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

const ACCOUNT_ICON = {
  USER: 'user',
  LAWYER: 'scale',
  FIRM: 'building',
} as const;

/**
 * Account creation.
 *
 * The account type is chosen here and cannot be changed afterwards, because it
 * determines which legal information and which documents the account must
 * supply before a reviewer can verify it.
 */
export function RegisterForm({
  defaultAccountType,
  inviteToken,
  invitedByFirm,
  lockedEmail,
}: {
  defaultAccountType?: string;
  inviteToken?: string;
  /** Set when the visitor arrived through a firm's invitation link. */
  invitedByFirm?: string;
  lockedEmail?: string;
}) {
  const [state, formAction] = useActionState(registerAction, initialFormState);
  const preselected = state?.values?.accountType || defaultAccountType || 'USER';

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {inviteToken ? <input type="hidden" name="inviteToken" value={inviteToken} /> : null}

      {invitedByFirm ? (
        <Alert tone="info" title={`You have been invited to join ${invitedByFirm}`}>
          Create your lawyer account with <strong>{lockedEmail}</strong> and complete your licence
          details. You will be registered with the firm automatically once your legal details are
          saved.
        </Alert>
      ) : null}

      {state && !state.ok && state.message ? (
        <Alert tone="error" title="We could not create your account">
          {state.message}
        </Alert>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-800">
          How will you use Dubai Legal?
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        </legend>
        <p className="text-xs text-slate-500">
          This decides what you must provide to become verified, and cannot be changed later. Your
          account opens as soon as you create it — your identity details and documents are asked for
          in the verification tab, where a reviewer reads them.
        </p>

        <div className="grid gap-3">
          {ACCOUNT_TYPES.map((type) => (
            <label
              key={type}
              className={cx(
                'flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 transition-colors',
                'border-slate-300 hover:border-brand-400',
                'has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:ring-1 has-checked:ring-brand-600',
              )}
            >
              <input
                type="radio"
                name="accountType"
                value={type}
                required
                defaultChecked={preselected === type}
                className="mt-1 h-4 w-4 shrink-0 accent-brand-700"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
                  <Icon name={ACCOUNT_ICON[type]} size={18} className="text-slate-500" />
                  {type === 'USER' ? 'I am a user' : type === 'LAWYER' ? 'I am a lawyer' : 'I am a legal firm'}
                </span>
                <span className="mt-1 block text-xs text-slate-600">{ACCOUNT_TYPE_DESCRIPTION[type]}</span>
              </span>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.accountType ? (
          <p className="text-xs font-medium text-red-600" role="alert">
            {state.fieldErrors.accountType}
          </p>
        ) : null}
      </fieldset>

      <Field
        label="Your full name"
        htmlFor="fullName"
        required
        error={state?.fieldErrors?.fullName}
        hint="As it appears on your identification, so a reviewer can match it."
      >
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          maxLength={120}
          placeholder="Nadia Rahman"
          defaultValue={state?.values?.fullName || ''}
          error={state?.fieldErrors?.fullName}
        />
      </Field>

      <Field
        label="Phone number"
        htmlFor="phone"
        required
        error={state?.fieldErrors?.phone}
        hint="How the other side of a case reaches you, and how you are told about a reply."
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          inputMode="tel"
          placeholder="+971 50 123 4567"
          defaultValue={state?.values?.phone || ''}
          error={state?.fieldErrors?.phone}
        />
      </Field>

      <Field label="Email address" htmlFor="email" required error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          inputMode="email"
          placeholder="you@example.ae"
          readOnly={Boolean(lockedEmail)}
          defaultValue={state?.values?.email || lockedEmail || ''}
          error={state?.fieldErrors?.email}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        required
        error={state?.fieldErrors?.password}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters, including a letter and a number.`}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          error={state?.fieldErrors?.password}
        />
      </Field>

      <Field label="Confirm password" htmlFor="confirmPassword" required error={state?.fieldErrors?.confirmPassword}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state?.fieldErrors?.confirmPassword}
        />
      </Field>

      <div>
        <label htmlFor="acceptTerms" className="flex cursor-pointer items-start gap-3">
          <input
            id="acceptTerms"
            name="acceptTerms"
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-700"
          />
          <span className="text-sm text-slate-700">
            I confirm the details I give are my own, and I understand that documents I upload are
            examined by a reviewer before any verification badge is issued.
          </span>
        </label>
        {state?.fieldErrors?.acceptTerms ? (
          <p className="mt-1 text-xs font-medium text-red-600" role="alert">
            {state.fieldErrors.acceptTerms}
          </p>
        ) : null}
      </div>

      <SubmitButton className="w-full" size="lg" pendingLabel="Creating your account…">
        Create account
      </SubmitButton>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
      <p className="text-center text-xs text-slate-500">
        {ACCOUNT_TYPE_LABEL.USER}, {ACCOUNT_TYPE_LABEL.LAWYER} and {ACCOUNT_TYPE_LABEL.FIRM}{' '}
        accounts all require an Emirates ID before verification.
      </p>
    </form>
  );
}
