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

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field label="Email address" htmlFor="email" required error={state?.fieldErrors?.email}>
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

      <SubmitButton className="w-full" size="lg" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>

      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="Could not reset your password">
          {state.message}
        </Alert>
      ) : null}

      <input type="hidden" name="token" value={token} />

      <Field
        label="New password"
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

      <Field label="Confirm new password" htmlFor="confirmPassword" required error={state?.fieldErrors?.confirmPassword}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state?.fieldErrors?.confirmPassword}
        />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingLabel="Saving…">
        Set new password
      </SubmitButton>

      <p className="text-xs text-slate-500">
        Setting a new password signs out every device that was already signed in.
      </p>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label="Current password"
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
        label="New password"
        htmlFor="newPassword"
        required
        error={state?.fieldErrors?.password}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters, including a letter and a number.`}
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

      <Field label="Confirm new password" htmlFor="confirmNewPassword" required error={state?.fieldErrors?.confirmPassword}>
        <Input
          id="confirmNewPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state?.fieldErrors?.confirmPassword}
        />
      </Field>

      <SubmitButton pendingLabel="Updating…">Change password</SubmitButton>
    </form>
  );
}

export function ResendVerificationForm() {
  const [state, formAction] = useActionState(resendVerificationAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <SubmitButton variant="secondary" pendingLabel="Requesting…">
        Send the confirmation message again
      </SubmitButton>
    </form>
  );
}
