import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireActiveUser, currentSessionToken } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { accountTypeLabel } from '@/lib/i18n/labels';
import { hashToken } from '@/lib/tokens';
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

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ t }, user] = await Promise.all([getI18n(), requireActiveUser()]);
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
  const notice =
    params.notice === 'sessions-revoked' ? t.memberCore.account.sessionsRevoked : undefined;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.accountSecurity}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.memberCore.account.intro}</p>
      </header>

      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-slate-900">{t.memberCore.account.heading}</h2>
          {user.verificationStatus === 'APPROVED' ? (
            <VerificationBadge
              accountType={user.accountType}
              size="md"
              label={t.badges[user.accountType]}
            />
          ) : null}
        </div>
        <div className="mt-3">
          <DescriptionList
            items={[
              { term: t.auth.email, detail: user.email },
              {
                term: t.memberCore.account.accountType,
                detail: accountTypeLabel(t, user.accountType),
              },
              {
                term: t.memberCore.account.badge,
                detail:
                  user.verificationStatus === 'APPROVED'
                    ? t.badges[user.accountType]
                    : t.memberCore.account.noBadge,
              },
              {
                term: t.memberCore.account.emailConfirmed,
                detail: formatDateTime(user.emailVerifiedAt),
              },
              { term: t.memberCore.account.lastSignedIn, detail: formatDateTime(user.lastLoginAt) },
              {
                term: t.memberCore.account.reviewerAccess,
                detail: user.roles.includes('REVIEWER') ? (
                  <>
                    {t.common.yes} —{' '}
                    <Link href="/admin/verifications" className="font-medium text-brand-700 hover:underline">
                      {t.memberCore.account.openReviewerConsole}
                    </Link>
                  </>
                ) : (
                  t.common.no
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-900">{t.memberCore.account.changePassword}</h2>
        <p className="mt-1 mb-5 text-sm text-slate-600">
          {t.memberCore.account.changePasswordBody}
        </p>
        <ChangePasswordForm labels={t.memberCore.securityForms.changePassword} />
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">{t.memberCore.account.activeSessions}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {(sessions.length === 1
                ? t.memberCore.account.devicesSignedInOne
                : t.memberCore.account.devicesSignedInMany
              ).replace('{count}', String(sessions.length))}
            </p>
          </div>
          {sessions.length > 1 ? (
            <form action={revokeOtherSessionsAction}>
              <button type="submit" className={buttonClasses('danger', 'md')}>
                {t.memberCore.account.signOutOtherDevices}
              </button>
            </form>
          ) : null}
        </div>

        <ul className="mt-4 divide-y divide-slate-100">
          {sessions.map((session) => (
            <li key={session.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-900">
                  {session.userAgent ?? t.memberCore.account.unknownDevice}
                  {session.tokenHash === currentHash ? (
                    <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                      {t.memberCore.account.thisDevice}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">
                  {t.memberCore.account.lastActiveExpires
                    .replace('{lastActive}', formatDateTime(session.lastSeenAt))
                    .replace('{expires}', formatDateTime(session.expiresAt))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <EncryptionNotice subject="Your documents and conversations" />

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">{t.memberCore.account.twoFactor}</h2>
        <TwoFactorSettings
          enabled={twoFactorEnabled(user)}
          recoveryCodesLeft={recoveryLeft}
          labels={t.memberCore.securityForms.twoFactor}
        />
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">
          {t.memberCore.account.notifications}
        </h2>
        <PushNotificationSettings
          vapidPublicKey={env.vapidPublicKey}
          configured={pushConfigured()}
          subscriptionCount={pushCount}
          labels={{
            heading: t.memberCore.pushNotifications.heading,
            status: t.memberCore.pushNotifications.status,
            bodyOn: t.memberCore.pushNotifications.bodyOn,
            bodyDenied: t.memberCore.pushNotifications.bodyDenied,
            bodyUnsupported: t.memberCore.pushNotifications.bodyUnsupported,
            bodyUnconfigured: t.memberCore.pushNotifications.bodyUnconfigured,
            bodyOff: t.memberCore.pushNotifications.bodyOff,
            subscriptionOne: t.memberCore.pushNotifications.subscriptionOne,
            subscriptionMany: t.memberCore.pushNotifications.subscriptionMany,
            turningOff: t.memberCore.pushNotifications.turningOff,
            turnOff: t.memberCore.pushNotifications.turnOff,
            turnOn: t.memberCore.pushNotifications.turnOn,
          }}
        />
      </Card>

      {/* The billing letterhead belongs with the other account settings, because
          that is where somebody looks for it — and it is where they change the
          mark away from the Legal Dash one if they have their own. */}
      {user.accountType === 'LAWYER' || user.accountType === 'FIRM' ? (
        <Card>
          <h2 className="font-semibold text-slate-900">{t.memberCore.account.billingReceipts}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t.memberCore.account.billingReceiptsBody}
          </p>
          <div className="mt-4">
            <Link href="/receipt-template" className={buttonClasses('secondary', 'md')}>
              {t.memberCore.account.chooseReceiptLayout}
            </Link>
          </div>
        </Card>
      ) : null}

      <Alert tone="info" title={t.memberCore.account.emailInstallationTitle}>
        {emailDeliveryNotice()}
      </Alert>
    </div>
  );
}
