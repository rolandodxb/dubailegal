import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { listReviewQueue } from '@/server/services/verification-service';
import { ACCOUNT_TYPE_LABEL, VERIFICATION_REQUEST_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { buttonClasses, Card, EmptyState } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Verification requests' };

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireReviewer();
  const [{ queue, decided }, params] = await Promise.all([listReviewQueue(), searchParams]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Verification requests</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Oldest requests first, so nobody is starved by newer ones. Take a request to record yourself
          as its reviewer, then accept or reject each document before recording a decision. These
          are document checks on an account — they are not cases between a client and a lawyer.
        </p>
      </header>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          Waiting ({queue.length})
        </h2>

        {queue.length === 0 ? (
          <EmptyState
            title="Nothing waiting for review"
            description="Requests appear here as members submit their documents. This list is never padded with examples."
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
                          Seeded demo data
                        </span>
                      ) : null}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {ACCOUNT_TYPE_LABEL[item.user.accountType]} · round {item.round} ·{' '}
                      {item._count.documents} {item._count.documents === 1 ? 'document' : 'documents'}{' '}
                      · submitted {formatDateTime(item.submittedAt)}
                    </p>
                    {item.user.profile?.phone ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Phone {item.user.profile.phone}
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
                      {VERIFICATION_REQUEST_LABEL[item.status] ?? item.status}
                    </span>
                    <Link
                      href={`/admin/verifications/${item.id}`}
                      className={buttonClasses('primary', 'sm')}
                    >
                      Open request
                    </Link>
                  </div>
                </div>
                {item.reviewer ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Taken by {item.reviewer.email}
                  </p>
                ) : null}
              </Card>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Recently decided</h2>
        {decided.length === 0 ? (
          <p className="text-sm text-slate-600">No decisions recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {decided.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {item.user.profile?.fullName?.trim() || item.user.email}
                    {item.user.isDemo ? (
                      <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-900">
                        demo
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    {ACCOUNT_TYPE_LABEL[item.user.accountType]} · round {item.round} ·{' '}
                    {formatDateTime(item.decidedAt)}
                    {item.reviewer ? ` · reviewed by ${item.reviewer.email}` : ''}
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
                    {VERIFICATION_REQUEST_LABEL[item.status] ?? item.status}
                  </span>
                  <Link
                    href={`/admin/verifications/${item.id}`}
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    View
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
