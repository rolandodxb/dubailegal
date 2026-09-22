import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/forms/PasswordForms';
import { Alert, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Choose a new password' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card className="p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900">Choose a new password</h1>
        <div className="mt-4 space-y-4">
          <Alert tone="error">
            This page needs a reset link. Open the link from your reset message, or request a new
            one.
          </Alert>
          <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
            Request a new reset link
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Choose a new password</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Pick something you have not used on this account before.
      </p>
      <ResetPasswordForm token={token} />
    </Card>
  );
}
