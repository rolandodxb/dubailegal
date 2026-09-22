import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { listUsersForAdmin } from '@/server/services/admin-service';
import { ACCOUNT_TYPE_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { buttonClasses, Card, Input } from '@/components/ui/primitives';
import {
  DeleteAccountForm,
  ReinstateUserForm,
  ReviewerRoleForm,
  SuspendUserForm,
} from '@/components/forms/AdminForms';

export const metadata: Metadata = { title: 'Accounts' };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const reviewer = await requireReviewer();
  const { q } = await searchParams;
  const users = await listUsersForAdmin(q);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Accounts</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every registered account, newest first. Suspending an account signs out all of its devices
          immediately and is reversible; deleting removes the account, its cases, documents and
          sessions for good. You can do neither to your own account, and you cannot delete the only
          reviewer.
        </p>
      </header>

      <form method="get" action="/admin/users" className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="mb-1.5 block text-sm font-medium text-slate-800">
            Search by email or name
          </label>
          <Input id="q" name="q" type="search" defaultValue={q ?? ''} />
        </div>
        <button type="submit" className={buttonClasses('primary', 'md')}>
          Search
        </button>
        {q ? (
          <Link href="/admin/users" className={buttonClasses('secondary', 'md')}>
            Clear
          </Link>
        ) : null}
      </form>

      {users.length === 0 ? (
        <p className="text-sm text-slate-600">
          {q ? 'No account matches that search.' : 'No accounts have registered yet.'}
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
                          Seeded demo data
                        </span>
                      ) : null}
                      {isSelf ? (
                        <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                          You
                        </span>
                      ) : null}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">{account.email}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {ACCOUNT_TYPE_LABEL[account.accountType]} · registered{' '}
                      {formatDateTime(account.createdAt)} · {account._count.documents} documents ·{' '}
                      {account._count.verificationCases} requests
                    </p>
                    {account.suspendedReason ? (
                      <p className="mt-1 text-xs text-red-700">
                        Suspended: {account.suspendedReason}
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
                        ? 'Email unconfirmed'
                        : account.status === 'ACTIVE'
                          ? 'Active'
                          : 'Suspended'}
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
                      {account.verificationStatus.replace('_', ' ').toLowerCase()}
                    </span>
                    {account.roles.includes('REVIEWER') ? (
                      <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
                        Reviewer
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-start gap-3 border-t border-slate-100 pt-3">
                  {account.status === 'SUSPENDED' ? (
                    <ReinstateUserForm userId={account.id} />
                  ) : isSelf ? null : (
                    <SuspendUserForm userId={account.id} />
                  )}

                  {isSelf ? null : (
                    <ReviewerRoleForm
                      userId={account.id}
                      grant={!account.roles.includes('REVIEWER')}
                    />
                  )}
                  {isSelf ? null : (
                    <DeleteAccountForm userId={account.id} email={account.email} />
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
