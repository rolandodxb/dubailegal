import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { emailDeliveryNotice } from '@/lib/email';
import { VerifyEmailForm } from '@/components/forms/VerifyEmailForm';
import { ResendVerificationForm } from '@/components/forms/PasswordForms';
import { Alert, Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.publicPages.auth.verifyMetaTitle };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; welcome?: string }>;
}) {
  const user = await requireSession();
  if (user.emailVerifiedAt) redirect('/dashboard');

  const [{ t }, { token, welcome }] = await Promise.all([getI18n(), searchParams]);
  const auth = t.publicPages.auth;

  // The most recent confirmation message for this account, so the person can
  // act even on an installation with no mail provider configured.
  const latestMessage = await prisma.emailMessage.findFirst({
    where: { userId: user.id, purpose: 'EMAIL_VERIFICATION' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">{auth.verifyTitle}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {auth.verifyBodyLead}
        <span className="font-medium text-slate-900">{user.email}</span>
        {auth.verifyBodyTail}
      </p>

      <div className="mt-5 space-y-5">
        {welcome ? <Alert tone="success">{auth.verifyCreated}</Alert> : null}

        <Alert tone="info" title={auth.verifyDeliveryTitle}>
          {emailDeliveryNotice()}
          {latestMessage ? (
            <>
              {' '}
              {auth.verifyRecordedLead}
              {latestMessage.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
              {auth.verifyRecordedTail}
            </>
          ) : null}
        </Alert>

        {token ? (
          <VerifyEmailForm
            token={token}
            labels={{ pending: t.publicPages.verifyEmailForm.pending, submit: t.publicPages.verifyEmailForm.submit }}
          />
        ) : (
          <Alert tone="neutral">{auth.verifyOpenLink}</Alert>
        )}

        <div className="border-t border-slate-200 pt-5">
          <p className="mb-3 text-sm text-slate-700">{auth.verifyNotReceived}</p>
          <ResendVerificationForm
            labels={{
              pending: t.publicPages.passwordForms.resendPending,
              submit: t.publicPages.passwordForms.resendSubmit,
            }}
          />
        </div>

        <p className="text-sm">
          <Link href="/dashboard" className="font-medium text-brand-700 hover:underline">
            {auth.verifyContinue}
          </Link>
        </p>
      </div>
    </Card>
  );
}
