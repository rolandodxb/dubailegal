import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import { listCasesForFirm, listCasesForLawyer, unreadMessageCountsByCase } from '@/server/services/case-service';
import { buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import { CaseCard } from '@/components/cases/CaseCard';

export const metadata: Metadata = { title: 'My portfolio' };

/**
 * Every case this professional has accepted and is responsible for, plus the
 * ones already completed. Declined and unaccepted cases live under Cases
 * pending review instead.
 */
export default async function PortfolioPage() {
  const user = await requireProfessional();
  const isFirm = user.accountType === 'FIRM';

  const [items, unread] = await Promise.all([
    isFirm
      ? listCasesForFirm(user.id).then((result) => result.active)
      : listCasesForLawyer(user.id).then((result) => result.portfolio),
    unreadMessageCountsByCase(user.id),
  ]);

  const ongoing = items.filter((item) => item.status === 'ASSIGNED' || item.status === 'IN_PROGRESS');
  const completed = items.filter((item) => item.status === 'COMPLETED');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">My portfolio</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {isFirm
            ? 'Cases that one of your registered lawyers has accepted and is working on.'
            : 'Every case you have accepted and are responsible for.'}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Ongoing', value: ongoing.length },
          { label: 'Completed', value: completed.length },
          { label: 'Total accepted', value: items.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Ongoing ({ongoing.length})</h2>
        {ongoing.length === 0 ? (
          <EmptyState
            title="No ongoing cases"
            description="Cases you accept from the pending queue appear here."
            action={
              <Link href="/pending" className={buttonClasses('primary', 'md')}>
                Cases pending review
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {ongoing.map((item) => (
              <CaseCard key={item.id} item={item} perspective="professional" unreadCount={unread.get(item.id) ?? 0} />
            ))}
          </ul>
        )}
      </section>

      {completed.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">Completed ({completed.length})</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {completed.map((item) => (
              <CaseCard key={item.id} item={item} perspective="professional" unreadCount={unread.get(item.id) ?? 0} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
