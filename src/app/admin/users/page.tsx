import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/lib/i18n';
import { accountTypeLabel } from '@/lib/i18n/labels';
import { requireReviewer } from '@/lib/auth';
import { listUsersForAdmin } from '@/server/services/admin-service';
import { formatDateTime } from '@/lib/format';
import { buttonClasses, Card, Input } from '@/components/ui/primitives';
import {
  DeleteAccountForm,
  ReinstateUserForm,
  ReviewerRoleForm,
  SuspendUserForm,
} from '@/components/forms/AdminForms';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.accounts };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ t }, reviewer] = await Promise.all([getI18n(), requireReviewer()]);
  const { q } = await searchParams;
  const users = await listUsersForAdmin(q);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.accounts}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.users.intro}</p>
      </header>

      <form method="get" action="/admin/users" className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="mb-1.5 block text-sm font-medium text-slate-800">
            {t.admin.users.searchLabel}
          </label>
          <Input id="q" name="q" type="search" defaultValue={q ?? ''} />
        </div>
        <button type="submit" className={buttonClasses('primary', 'md')}>
          {t.common.search}
        </button>
        {q ? (
          <Link href="/admin/users" className={buttonClasses('secondary', 'md')}>
            {t.common.clear}
          </Link>
        ) : null}
      </form>

      {users.length === 0 ? (
        <p className="text-sm text-slate-600">
          {q ? t.admin.users.noMatch : t.admin.users.noAccounts}
        </p>
      ) : (
        <ul className="space-y-3">
          {users.map((account) => {
            const isSelf = account.id === reviewer.id;
            return (
              <Card as="li" key={account.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium text-slate-900">
                      {account.profile?.fullName?.trim() || account.email}
                      {account.isDemo ? (
                        <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-900">
                          {t.admin.users.seededDemo}
                        </span>
                      ) : null}
                      {isSelf ? (
                        <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                          {t.admin.users.youBadge}
                        </span>
                      ) : null}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">{account.email}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {accountTypeLabel(t, account.accountType)} ·{' '}
                      {t.admin.users.registered.replace(
                        '{date}',
                        formatDateTime(account.createdAt),
                      )}{' '}
                      · {account._count.documents} {t.admin.users.documents} ·{' '}
                      {account._count.verificationCases} {t.admin.users.requests}
                    </p>
                    {account.suspendedReason ? (
                      <p className="mt-1 text-xs text-red-700">
                        {t.admin.users.suspended.replace('{reason}', account.suspendedReason)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        account.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-800 ring-green-200'
                          : account.status === 'SUSPENDED'
                            ? 'bg-red-50 text-red-800 ring-red-200'
                            : 'bg-slate-100 text-slate-700 ring-slate-200'
                      }`}
                    >
                      {account.status === 'PENDING_EMAIL'
                        ? t.admin.users.statusPendingEmail
                        : account.status === 'ACTIVE'
                          ? t.admin.users.statusActive
                          : t.admin.users.statusSuspended}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        account.verificationStatus === 'APPROVED'
                          ? 'bg-green-50 text-green-800 ring-green-200'
                          : account.verificationStatus === 'REJECTED'
                            ? 'bg-red-50 text-red-800 ring-red-200'
                            : 'bg-slate-100 text-slate-700 ring-slate-200'
                      }`}
                    >
                      {t.verificationStatus[account.verificationStatus]}
                    </span>
                    {account.roles.includes('REVIEWER') ? (
                      <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
                        {t.admin.users.reviewerBadge}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-start gap-3 border-t border-slate-100 pt-3">
                  {account.status === 'SUSPENDED' ? (
                    <ReinstateUserForm
                      userId={account.id}
                      labels={{
                        pending: t.admin.users.reinstatePending,
                        button: t.admin.users.reinstateButton,
                      }}
                    />
                  ) : isSelf ? null : (
                    <SuspendUserForm
                      userId={account.id}
                      labels={{
                        reasonLabel: t.admin.users.suspendReasonLabel,
                        confirm: t.admin.users.suspendConfirm,
                        pending: t.admin.users.suspendPending,
                        button: t.admin.users.suspendButton,
                      }}
                    />
                  )}

                  {isSelf ? null : (
                    <ReviewerRoleForm
                      userId={account.id}
                      grant={!account.roles.includes('REVIEWER')}
                      labels={{
                        grantConfirm: t.admin.users.reviewerGrantConfirm,
                        revokeConfirm: t.admin.users.reviewerRevokeConfirm,
                        pending: t.admin.users.reviewerPending,
                        makeReviewer: t.admin.users.makeReviewer,
                        removeReviewer: t.admin.users.removeReviewer,
                      }}
                    />
                  )}
                  {isSelf ? null : (
                    <DeleteAccountForm
                      userId={account.id}
                      email={account.email}
                      labels={{
                        summary: t.admin.users.deleteSummary,
                        confirmLabel: t.admin.users.deleteConfirmLabel,
                        hint: t.admin.users.deleteHint,
                        pending: t.admin.users.deletePending,
                        button: t.admin.users.deleteButton,
                      }}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
