import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { TwoFactorLoginForm } from '@/components/forms/TwoFactorForms';
import { Alert, Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.publicPages.auth.twoFactorMetaTitle };
}

/**
 * The second step of signing in.
 *
 * The session exists but can reach nothing else: every guard sends it back here
 * until a code is given. There is deliberately nothing to navigate to from this
 * page except the way out.
 */
export default async function TwoFactorLoginPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.twoFactorSatisfied) redirect('/dashboard');

  const { t } = await getI18n();
  const auth = t.publicPages.auth;

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">{auth.twoFactorTitle}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        {auth.twoFactorBodyLead}
        <span className="font-medium text-slate-900">{user.email}</span>
        {auth.twoFactorBodyTail}
      </p>

      <TwoFactorLoginForm labels={t.publicPages.twoFactorForm} />

      <Alert tone="info" className="mt-6">
        {auth.twoFactorLostPhone}
      </Alert>
    </Card>
  );
}
