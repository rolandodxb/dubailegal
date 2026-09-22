'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input } from '@/components/ui/primitives';
import type { Dictionary } from '@/lib/i18n/en';

/**
 * Signing in.
 *
 * The words come from the dictionary passed by the page rather than being written
 * here, so the form speaks the reader's language — including the labels, which is
 * where a half-translated interface is most obvious.
 */
export function LoginForm({
  t,
  notice,
  next,
}: {
  t: Dictionary;
  notice?: string;
  next?: string;
}) {
  const [state, formAction] = useActionState(loginAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {/* Where to go once signed in — the page that asked them to sign in. */}
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state && !state.ok && state.message ? (
        <Alert tone="error" title={t.auth.signInFailed}>
          {state.message}
        </Alert>
      ) : null}

      <Field label={t.auth.email} htmlFor="email" required error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          inputMode="email"
          placeholder="you@example.ae"
          defaultValue={state?.values?.email ?? ''}
          error={state?.fieldErrors?.email}
        />
      </Field>

      <Field label={t.auth.password} htmlFor="password" required error={state?.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={state?.fieldErrors?.password}
        />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingLabel={t.auth.signingIn}>
        {t.auth.signInTitle}
      </SubmitButton>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="font-medium text-brand-700 hover:underline">
          {t.auth.forgotPassword}
        </Link>
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
          className="font-medium text-brand-700 hover:underline"
        >
          {t.nav.createAccount}
        </Link>
      </div>
    </form>
  );
}
