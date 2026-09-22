import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { TwoFactorLoginForm } from '@/components/forms/TwoFactorForms';
import { Alert, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Two-factor verification' };

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

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Two-factor verification</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Signed in as <span className="font-medium text-slate-900">{user.email}</span>. Enter the
        code from your authenticator app to finish.
      </p>

      <TwoFactorLoginForm />

      <Alert tone="info" className="mt-6">
        Lost your phone? Use one of the recovery codes you saved when you turned two-factor on. If you
        have none left, an administrator cannot recover them for you — that would defeat the point.
      </Alert>
    </Card>
  );
}
