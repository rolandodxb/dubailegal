import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { listCasesForFirm, listCasesForLawyer, unreadMessageCountsByCase } from '@/server/services/case-service';
import { buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import { CaseCard } from '@/components/cases/CaseCard';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.portfolio };
}

/**
 * Every case this professional has accepted and is responsible for, plus the
 * ones already completed. Declined and unaccepted cases live under Cases
 * pending review instead.
 */
export default async function PortfolioPage() {
  const [{ t }, user] = await Promise.all([getI18n(), requireProfessional()]);
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
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.portfolio}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {isFirm ? t.memberCore.portfolio.introFirm : t.memberCore.portfolio.introLawyer}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t.memberCore.portfolio.ongoing, value: ongoing.length },
          { label: t.memberCore.portfolio.completed, value: completed.length },
          { label: t.memberCore.portfolio.totalAccepted, value: items.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.memberCore.portfolio.ongoing} ({ongoing.length})
        </h2>
        {ongoing.length === 0 ? (
          <EmptyState
            title={t.memberCore.portfolio.emptyTitle}
            description={t.memberCore.portfolio.emptyBody}
            action={
              <Link href="/pending" className={buttonClasses('primary', 'md')}>
                {t.items.pending}
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
          <h2 className="mb-3 font-semibold text-slate-900">
            {t.memberCore.portfolio.completed} ({completed.length})
          </h2>
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
