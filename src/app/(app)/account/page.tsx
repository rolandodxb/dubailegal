import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireActiveUser, currentSessionToken } from '@/lib/auth';
import { hashToken } from '@/lib/tokens';
import { ACCOUNT_TYPE_LABEL, BADGE } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { emailDeliveryNotice } from '@/lib/email';
import { env } from '@/lib/env';
import { pushConfigured, subscriptionCount } from '@/server/services/push-service';
import { PushNotificationSettings } from '@/components/forms/PushNotificationSettings';
import { TwoFactorSettings } from '@/components/forms/TwoFactorForms';
import { recoveryCodeCount, twoFactorEnabled } from '@/server/services/two-factor-service';
import { revokeOtherSessionsAction } from '@/app/actions/auth-actions';
import { VerificationBadge } from '@/components/VerificationBadge';
import { ChangePasswordForm } from '@/components/forms/PasswordForms';
import { EncryptionNotice } from '@/components/SecurityNotice';
import { Alert, buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Account and security' };

const NOTICES: Record<string, string> = {
  'sessions-revoked': 'Every other device has been signed out.',
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const user = await requireActiveUser();
  const [params, token] = await Promise.all([searchParams, currentSessionToken()]);

  const [pushCount, recoveryLeft] = await Promise.all([
    subscriptionCount(user.id),
    recoveryCodeCount(user.id),
  ]);

  const sessions = await prisma.session.findMany({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: 'desc' },
    select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true, userAgent: true, tokenHash: true },
  });

  const currentHash = token ? hashToken(token) : null;
  const notice = params.notice ? NOTICES[params.notice] : undefined;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Account and security</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your sign-in details, active sessions and verification state.
        </p>
      </header>

      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-slate-900">Account</h2>
          {user.verificationStatus === 'APPROVED' ? (
            <VerificationBadge accountType={user.accountType} size="md" />
          ) : null}
        </div>
        <div className="mt-3">
          <DescriptionList
            items={[
              { term: 'Email address', detail: user.email },
              { term: 'Account type', detail: ACCOUNT_TYPE_LABEL[user.accountType] },
              {
                term: 'Badge',
                detail:
                  user.verificationStatus === 'APPROVED'
                    ? BADGE[user.accountType].label
                    : 'No badge — your documents have not been approved',
              },
              { term: 'Email confirmed', detail: formatDateTime(user.emailVerifiedAt) },
              { term: 'Last signed in', detail: formatDateTime(user.lastLoginAt) },
              {
                term: 'Reviewer access',
                detail: user.roles.includes('REVIEWER') ? (
                  <>
                    Yes —{' '}
                    <Link href="/admin/verifications" className="font-medium text-brand-700 hover:underline">
                      open the reviewer console
                    </Link>
                  </>
                ) : (
                  'No'
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-900">Change password</h2>
        <p className="mt-1 mb-5 text-sm text-slate-600">
          Changing your password signs out every other device.
        </p>
        <ChangePasswordForm />
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Active sessions</h2>
            <p className="mt-1 text-sm text-slate-600">
              {sessions.length} {sessions.length === 1 ? 'device is' : 'devices are'} signed in.
            </p>
          </div>
          {sessions.length > 1 ? (
            <form action={revokeOtherSessionsAction}>
              <button type="submit" className={buttonClasses('danger', 'md')}>
                Sign out other devices
              </button>
            </form>
          ) : null}
        </div>

        <ul className="mt-4 divide-y divide-slate-100">
          {sessions.map((session) => (
            <li key={session.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-900">
                  {session.userAgent ?? 'Unknown device'}
                  {session.tokenHash === currentHash ? (
                    <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                      This device
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">
                  Last active {formatDateTime(session.lastSeenAt)} · expires{' '}
                  {formatDateTime(session.expiresAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <EncryptionNotice subject="Your documents and conversations" />

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">Two-factor authentication</h2>
        <TwoFactorSettings enabled={twoFactorEnabled(user)} recoveryCodesLeft={recoveryLeft} />
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">Notifications</h2>
        <PushNotificationSettings
          vapidPublicKey={env.vapidPublicKey}
          configured={pushConfigured()}
          subscriptionCount={pushCount}
        />
      </Card>

      {/* The billing letterhead belongs with the other account settings, because
          that is where somebody looks for it — and it is where they change the
          mark away from the Dubai Legal one if they have their own. */}
      {user.accountType === 'LAWYER' || user.accountType === 'FIRM' ? (
        <Card>
          <h2 className="font-semibold text-slate-900">Billing receipts</h2>
          <p className="mt-1 text-sm text-slate-600">
            Every fee you raise produces a receipt the client can print. It carries the standard Dubai
            Legal layout until you choose a letterhead of your own.
          </p>
          <div className="mt-4">
            <Link href="/receipt-template" className={buttonClasses('secondary', 'md')}>
              Choose my receipt layout
            </Link>
          </div>
        </Card>
      ) : null}

      <Alert tone="info" title="About email from this installation">
        {emailDeliveryNotice()}
      </Alert>
    </div>
  );
}
