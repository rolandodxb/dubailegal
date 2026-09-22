import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser, homePathFor } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { LoginForm } from '@/components/forms/LoginForm';
import { safeNextPath } from '@/lib/redirect';
import { Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Sign in' };

const NOTICES: Record<string, string> = {
  'signed-out': 'You have been signed out.',
  'password-reset': 'Your password has been changed. Sign in with your new password.',
  suspended: 'That account is suspended. Contact a reviewer if you believe this is a mistake.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; next?: string }>;
}) {
  const [{ t }, { notice, next: rawNext }] = await Promise.all([getI18n(), searchParams]);
  // Checked here as well as in the action, so a redirect cannot be smuggled in
  // through the sign-in link itself.
  const next = safeNextPath(rawNext, '');

  const user = await getSessionUser();
  if (user) {
    redirect(next || (user.emailVerifiedAt ? homePathFor(user) : '/verify-email'));
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">{t.auth.signInTitle}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">{t.auth.signInIntro}</p>
      <LoginForm t={t} notice={notice ? NOTICES[notice] : undefined} next={next || undefined} />
    </Card>
  );
}
