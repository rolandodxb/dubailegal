import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/lib/i18n';
import { ResetPasswordForm } from '@/components/forms/PasswordForms';
import { Alert, Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.publicPages.auth.resetMetaTitle };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ t }, { token }] = await Promise.all([getI18n(), searchParams]);
  const labels = t.publicPages.passwordForms;

  if (!token) {
    return (
      <Card className="p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900">{t.publicPages.auth.resetTitle}</h1>
        <div className="mt-4 space-y-4">
          <Alert tone="error">{t.publicPages.auth.resetNoToken}</Alert>
          <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
            {t.publicPages.auth.resetRequestNew}
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">{t.publicPages.auth.resetTitle}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">{t.publicPages.auth.resetIntro}</p>
      <ResetPasswordForm
        token={token}
        labels={{
          failedTitle: labels.resetFailedTitle,
          newPassword: labels.newPassword,
          passwordHint: t.publicPages.registerForm.passwordHint,
          confirmNewPassword: labels.confirmNewPassword,
          pending: labels.pendingSaving,
          submit: labels.setNewPassword,
          note: labels.resetNote,
        }}
      />
    </Card>
  );
}
