import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n';
import { ForgotPasswordForm } from '@/components/forms/PasswordForms';
import { Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.publicPages.auth.forgotMetaTitle };
}

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();
  const labels = t.publicPages.passwordForms;

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">{t.publicPages.auth.forgotTitle}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">{t.publicPages.auth.forgotBody}</p>
      <ForgotPasswordForm
        labels={{
          email: t.auth.email,
          pending: labels.pendingSending,
          submit: labels.sendResetLink,
          backToSignIn: labels.backToSignIn,
        }}
      />
    </Card>
  );
}
