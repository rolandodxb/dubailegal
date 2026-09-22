import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, homePathFor } from '@/lib/auth';
import { describeInvitationToken } from '@/server/services/firm-service';
import { getAvailability, isEnabled } from '@/lib/availability';
import { RegisterForm } from '@/components/forms/RegisterForm';
import { Alert, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Create an account' };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; invite?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(user.emailVerifiedAt ? homePathFor(user) : '/verify-email');

  const { type, invite } = await searchParams;

  const availability = await getAvailability();
  if (!isEnabled(availability.settings, 'feature.registration')) {
    return (
      <Card className="p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900">Registration is closed</h1>
        <p className="mt-2 text-sm text-slate-600">
          New account registration is currently switched off by the administrators of this
          installation. If you already have an account you can still{' '}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            sign in
          </Link>
          .
        </p>
      </Card>
    );
  }
  const defaultAccountType = type && ['USER', 'LAWYER', 'FIRM'].includes(type) ? type : undefined;

  // Arriving through a firm's invitation link names the firm and pins the
  // address the invitation was issued to.
  const invitation = invite ? await describeInvitationToken(invite) : null;

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">
        {invitation ? 'Join your firm on Dubai Legal' : 'Create your Dubai Legal account'}
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        One account type, chosen now. You can complete your profile and documents straight after.
      </p>

      {invite && !invitation ? (
        <Alert tone="warning" className="mb-5">
          That invitation link is no longer valid. It may have been used already or withdrawn by the
          firm. You can still register as a lawyer below.
        </Alert>
      ) : null}

      <RegisterForm
        defaultAccountType={invitation ? 'LAWYER' : defaultAccountType}
        inviteToken={invitation ? invite : undefined}
        invitedByFirm={invitation?.firm.legalName}
        lockedEmail={invitation?.email}
      />
    </Card>
  );
}
