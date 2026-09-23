'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import {
  changePasswordAction,
  forgotPasswordAction,
  resendVerificationAction,
  resetPasswordAction,
} from '@/app/actions/auth-actions';
import { initialFormState } from '@/lib/form-state';
import { MIN_PASSWORD_LENGTH } from '@/lib/constants';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input } from '@/components/ui/primitives';

/**
 * The password forms.
 *
 * Each one takes the words it shows from the page that renders it: these are
 * client components, so they cannot read the dictionary themselves. The password
 * rule is the one sentence they all share, so it is passed in as a template and
 * filled with the configured minimum length here.
 */
export function ForgotPasswordForm({
  labels,
}: {
  labels: { email: string; pending: string; submit: string; backToSignIn: string };
}) {
  const [state, formAction] = useActionState(forgotPasswordAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field label={labels.email} htmlFor="email" required error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.ae"
          defaultValue={state?.values?.email ?? ''}
          error={state?.fieldErrors?.email}
        />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingLabel={labels.pending}>
        {labels.submit}
      </SubmitButton>

      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          {labels.backToSignIn}
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({
  token,
  labels,
}: {
  token: string;
  labels: {
    failedTitle: string;
    newPassword: string;
    passwordHint: string;
    confirmNewPassword: string;
    pending: string;
    submit: string;
    note: string;
  };
}) {
  const [state, formAction] = useActionState(resetPasswordAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.failedTitle}>
          {state.message}
        </Alert>
      ) : null}

      <input type="hidden" name="token" value={token} />

      <Field
        label={labels.newPassword}
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
        label={labels.confirmNewPassword}
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

      <SubmitButton className="w-full" size="lg" pendingLabel={labels.pending}>
        {labels.submit}
      </SubmitButton>

      <p className="text-xs text-slate-500">{labels.note}</p>
    </form>
  );
}

export function ChangePasswordForm({
  labels,
}: {
  labels: {
    currentPassword: string;
    newPassword: string;
    passwordHint: string;
    confirmNewPassword: string;
    pending: string;
    submit: string;
  };
}) {
  const [state, formAction] = useActionState(changePasswordAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label={labels.currentPassword}
        htmlFor="currentPassword"
        required
        error={state?.fieldErrors?.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          error={state?.fieldErrors?.currentPassword}
        />
      </Field>

      <Field
        label={labels.newPassword}
        htmlFor="newPassword"
        required
        error={state?.fieldErrors?.password}
        hint={labels.passwordHint.replace('{count}', String(MIN_PASSWORD_LENGTH))}
      >
        <Input
          id="newPassword"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          error={state?.fieldErrors?.password}
        />
      </Field>

      <Field
        label={labels.confirmNewPassword}
        htmlFor="confirmNewPassword"
        required
        error={state?.fieldErrors?.confirmPassword}
      >
        <Input
          id="confirmNewPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state?.fieldErrors?.confirmPassword}
        />
      </Field>

      <SubmitButton pendingLabel={labels.pending}>{labels.submit}</SubmitButton>
    </form>
  );
}

export function ResendVerificationForm({
  labels,
}: {
  labels: { pending: string; submit: string };
}) {
  const [state, formAction] = useActionState(resendVerificationAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <SubmitButton variant="secondary" pendingLabel={labels.pending}>
        {labels.submit}
      </SubmitButton>
    </form>
  );
}
