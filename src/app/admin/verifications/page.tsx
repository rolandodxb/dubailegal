import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/lib/i18n';
import { accountTypeLabel, verificationRequestLabel } from '@/lib/i18n/labels';
import { requireReviewer } from '@/lib/auth';
import { listReviewQueue } from '@/server/services/verification-service';
import { formatDateTime } from '@/lib/format';
import { buttonClasses, Card, EmptyState } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.verifications.title };
}

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ t }] = await Promise.all([getI18n(), requireReviewer()]);
  const [{ queue, decided }, params] = await Promise.all([listReviewQueue(), searchParams]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.admin.verifications.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.verifications.intro}</p>
      </header>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.admin.verifications.waiting.replace('{count}', String(queue.length))}
        </h2>

        {queue.length === 0 ? (
          <EmptyState
            title={t.admin.verifications.empty.title}
            description={t.admin.verifications.empty.body}
          />
        ) : (
          <ul className="space-y-3">
            {queue.map((item) => (
              <Card as="li" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">
                      {item.user.profile?.fullName?.trim() || item.user.email}
                      {item.user.isDemo ? (
                        <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-900">
                          {t.admin.verifications.seededDemo}
                        </span>
                      ) : null}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {accountTypeLabel(t, item.user.accountType)} ·{' '}
                      {t.admin.verifications.round.replace('{round}', String(item.round))} ·{' '}
                      {item._count.documents}{' '}
                      {item._count.documents === 1
                        ? t.admin.verifications.document
                        : t.admin.verifications.documents}{' '}
                      ·{' '}
                      {t.admin.verifications.submitted.replace(
                        '{date}',
                        formatDateTime(item.submittedAt),
                      )}
                    </p>
                    {item.user.profile?.phone ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t.admin.verifications.phone.replace(
                          '{phone}',
                          item.user.profile.phone ?? '',
                        )}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        item.status === 'UNDER_REVIEW'
                          ? 'bg-amber-50 text-amber-900 ring-amber-200'
                          : 'bg-brand-50 text-brand-800 ring-brand-200'
                      }`}
                    >
                      {verificationRequestLabel(t, item.status)}
                    </span>
                    <Link
                      href={`/admin/verifications/${item.id}`}
                      className={buttonClasses('primary', 'sm')}
                    >
                      {t.admin.verifications.openRequest}
                    </Link>
                  </div>
                </div>
                {item.reviewer ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {t.admin.verifications.takenBy.replace('{email}', item.reviewer.email)}
                  </p>
                ) : null}
              </Card>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.admin.verifications.recentlyDecided}
        </h2>
        {decided.length === 0 ? (
          <p className="text-sm text-slate-600">{t.admin.verifications.noDecisions}</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {decided.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {item.user.profile?.fullName?.trim() || item.user.email}
                    {item.user.isDemo ? (
                      <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-900">
                        {t.admin.verifications.demo}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    {accountTypeLabel(t, item.user.accountType)} ·{' '}
                    {t.admin.verifications.round.replace('{round}', String(item.round))} ·{' '}
                    {formatDateTime(item.decidedAt)}
                    {item.reviewer
                      ? ` · ${t.admin.verifications.reviewedBy.replace('{email}', item.reviewer.email)}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      item.status === 'APPROVED'
                        ? 'bg-green-50 text-green-800 ring-green-200'
                        : item.status === 'REJECTED'
                          ? 'bg-red-50 text-red-800 ring-red-200'
                          : 'bg-slate-100 text-slate-600 ring-slate-200'
                    }`}
                  >
                    {verificationRequestLabel(t, item.status)}
                  </span>
                  <Link
                    href={`/admin/verifications/${item.id}`}
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    {t.common.view}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
