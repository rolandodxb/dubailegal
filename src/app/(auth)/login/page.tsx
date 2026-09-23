import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser, homePathFor } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { LoginForm } from '@/components/forms/LoginForm';
import { safeNextPath } from '@/lib/redirect';
import { Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.signInTitle };
}

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

  // The reasons somebody can land here with a message. They are read from the
  // dictionary rather than written here, so they follow the reader's language.
  const notices: Record<string, string> = {
    'signed-out': t.publicPages.auth.signedOut,
    'password-reset': t.publicPages.auth.passwordReset,
    suspended: t.publicPages.auth.suspended,
  };

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">{t.auth.signInTitle}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">{t.auth.signInIntro}</p>
      <LoginForm t={t} notice={notice ? notices[notice] : undefined} next={next || undefined} />
    </Card>
  );
}
