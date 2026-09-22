import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { emailDeliveryNotice } from '@/lib/email';
import { VerifyEmailForm } from '@/components/forms/VerifyEmailForm';
import { ResendVerificationForm } from '@/components/forms/PasswordForms';
import { Alert, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Confirm your email address' };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; welcome?: string }>;
}) {
  const user = await requireSession();
  if (user.emailVerifiedAt) redirect('/dashboard');

  const { token, welcome } = await searchParams;

  // The most recent confirmation message for this account, so the person can
  // act even on an installation with no mail provider configured.
  const latestMessage = await prisma.emailMessage.findFirst({
    where: { userId: user.id, purpose: 'EMAIL_VERIFICATION' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Confirm your email address</h1>
      <p className="mt-1 text-sm text-slate-600">
        We sent a confirmation link to <span className="font-medium text-slate-900">{user.email}</span>.
        Your account is limited until the address is confirmed.
      </p>

      <div className="mt-5 space-y-5">
        {welcome ? <Alert tone="success">Your account has been created.</Alert> : null}

        <Alert tone="info" title="About email delivery on this installation">
          {emailDeliveryNotice()}
          {latestMessage ? (
            <>
              {' '}
              The newest confirmation message for this account was recorded on{' '}
              {latestMessage.createdAt.toISOString().slice(0, 16).replace('T', ' ')} UTC.
            </>
          ) : null}
        </Alert>

        {token ? (
          <VerifyEmailForm token={token} />
        ) : (
          <Alert tone="neutral">
            Open the confirmation link from the message we recorded, or request a fresh one below.
          </Alert>
        )}

        <div className="border-t border-slate-200 pt-5">
          <p className="mb-3 text-sm text-slate-700">Did not receive it, or the link expired?</p>
          <ResendVerificationForm />
        </div>

        <p className="text-sm">
          <Link href="/dashboard" className="font-medium text-brand-700 hover:underline">
            Continue to my dashboard
          </Link>
        </p>
      </div>
    </Card>
  );
}
