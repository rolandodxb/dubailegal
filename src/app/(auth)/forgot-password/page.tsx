import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/forms/PasswordForms';
import { Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Enter the email address on your account and we will record a reset link for it.
      </p>
      <ForgotPasswordForm />
    </Card>
  );
}
