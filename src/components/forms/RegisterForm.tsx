'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { AccountType } from '@prisma/client';
import { registerAction } from '@/app/actions/auth-actions';
import { initialFormState } from '@/lib/form-state';
import { MIN_PASSWORD_LENGTH } from '@/lib/constants';
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
 *
 * Every word comes from the page that renders it: this is a client component,
 * so it cannot read the dictionary itself.
 */
export function RegisterForm({
  defaultAccountType,
  inviteToken,
  invitedByFirm,
  lockedEmail,
  labels,
}: {
  defaultAccountType?: string;
  inviteToken?: string;
  /** Set when the visitor arrived through a firm's invitation link. */
  invitedByFirm?: string;
  lockedEmail?: string;
  labels: {
    invitedTitle: string;
    invitedLead: string;
    invitedTail: string;
    failedTitle: string;
    accountTypeLegend: string;
    accountTypeHint: string;
    accountTypes: { value: AccountType; label: string; description: string }[];
    fullName: string;
    fullNameHint: string;
    phone: string;
    phoneHint: string;
    email: string;
    password: string;
    passwordHint: string;
    confirmPassword: string;
    terms: string;
    pending: string;
    submit: string;
    haveAccount: string;
    signIn: string;
    emiratesIdNote: string;
  };
}) {
  const [state, formAction] = useActionState(registerAction, initialFormState);
  const preselected = state?.values?.accountType || defaultAccountType || 'USER';

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {inviteToken ? <input type="hidden" name="inviteToken" value={inviteToken} /> : null}

      {invitedByFirm ? (
        <Alert
          tone="info"
          title={labels.invitedTitle.replace('{firm}', invitedByFirm)}
        >
          {labels.invitedLead}
          <strong>{lockedEmail}</strong>
          {labels.invitedTail}
        </Alert>
      ) : null}

      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.failedTitle}>
          {state.message}
        </Alert>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-800">
          {labels.accountTypeLegend}
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        </legend>
        <p className="text-xs text-slate-500">{labels.accountTypeHint}</p>

        <div className="grid gap-3">
          {labels.accountTypes.map((type) => (
            <label
              key={type.value}
              className={cx(
                'flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 transition-colors',
                'border-slate-300 hover:border-brand-400',
                'has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:ring-1 has-checked:ring-brand-600',
              )}
            >
              <input
                type="radio"
                name="accountType"
                value={type.value}
                required
                defaultChecked={preselected === type.value}
                className="mt-1 h-4 w-4 shrink-0 accent-brand-700"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
                  <Icon name={ACCOUNT_ICON[type.value]} size={18} className="text-slate-500" />
                  {type.label}
                </span>
                <span className="mt-1 block text-xs text-slate-600">{type.description}</span>
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
        label={labels.fullName}
        htmlFor="fullName"
        required
        error={state?.fieldErrors?.fullName}
        hint={labels.fullNameHint}
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
        label={labels.phone}
        htmlFor="phone"
        required
        error={state?.fieldErrors?.phone}
        hint={labels.phoneHint}
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

      <Field label={labels.email} htmlFor="email" required error={state?.fieldErrors?.email}>
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
        label={labels.password}
        htmlFor="password"
        required
        error={state?.fieldErrors?.password}
        hint={labels.passwordHint.replace('{count}', String(MIN_PASSWORD_LENGTH))}
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

      <Field
        label={labels.confirmPassword}
        htmlFor="confirmPassword"
        required
        error={state?.fieldErrors?.confirmPassword}
      >
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
          <span className="text-sm text-slate-700">{labels.terms}</span>
        </label>
        {state?.fieldErrors?.acceptTerms ? (
          <p className="mt-1 text-xs font-medium text-red-600" role="alert">
            {state.fieldErrors.acceptTerms}
          </p>
        ) : null}
      </div>

      <SubmitButton className="w-full" size="lg" pendingLabel={labels.pending}>
        {labels.submit}
      </SubmitButton>

      <p className="text-center text-sm text-slate-600">
        {labels.haveAccount}{' '}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          {labels.signIn}
        </Link>
      </p>
      <p className="text-center text-xs text-slate-500">{labels.emiratesIdNote}</p>
    </form>
  );
}
