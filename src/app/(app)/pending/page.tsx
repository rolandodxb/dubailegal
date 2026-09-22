import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import { listCasesForFirm, listCasesForLawyer, unreadMessageCountsByCase } from '@/server/services/case-service';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import { CaseCard } from '@/components/cases/CaseCard';

export const metadata: Metadata = { title: 'Cases pending review' };

/**
 * New cases nobody has picked up yet, plus the ones this lawyer has opened for
 * review but not yet accepted. For a firm, any registered lawyer can accept a
 * case from here.
 */
export default async function PendingCasesPage() {
  const user = await requireProfessional();
  const isFirm = user.accountType === 'FIRM';

  const [lawyerCases, firmCases, unread] = await Promise.all([
    isFirm ? Promise.resolve(null) : listCasesForLawyer(user.id),
    isFirm ? listCasesForFirm(user.id) : Promise.resolve(null),
    unreadMessageCountsByCase(user.id),
  ]);

  const waiting = isFirm ? (firmCases?.submitted ?? []) : (lawyerCases?.pending ?? []);
  const inReview = isFirm ? [] : (lawyerCases?.reviewing ?? []);
  const distributed = isFirm ? (firmCases?.distributed ?? []) : [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Cases pending review</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {isFirm
            ? 'Open a case, decide it is a fit, then release it to your registered lawyers. They each choose to take it or pass, and the first to take it is assigned.'
            : 'New cases sent to you that nobody has picked up, and the ones you have opened for review.'}
        </p>
      </header>

      {isFirm ? (
        <Alert tone="info" title="How cases reach your lawyers">
          A case submitted to {user.profile?.fullName?.trim() || 'your firm'} lands here first. Open it
          and, if you have a lawyer who fits the work, press <strong>Accept and send to our
          lawyers</strong> — every registered lawyer is then offered it and decides for themselves.
        </Alert>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {isFirm ? 'Waiting for your decision' : 'Waiting to be picked up'} ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <EmptyState
            title="Nothing waiting"
            description={
              isFirm
                ? 'Cases sent to your firm appear here until one of your lawyers accepts them.'
                : 'Cases sent to you from your directory listing appear here.'
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {waiting.map((item) => (
              <CaseCard
                key={item.id}
                item={item}
                perspective="professional"
                action={{
                  href: `/cases/${item.id}`,
                  label: isFirm ? 'Open and review' : 'Review the case',
                }}
                unreadCount={unread.get(item.id) ?? 0}
              />
            ))}
          </ul>
        )}
      </section>

      {isFirm && distributed.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            With your lawyers ({distributed.length})
          </h2>
          <p className="mb-3 text-sm text-slate-600">
            Released and waiting for one of them to answer. Open a case to see who has passed and who
            has not replied.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {distributed.map((item) => (
              <CaseCard
                key={item.id}
                item={item}
                perspective="professional"
                action={{ href: `/cases/${item.id}`, label: 'See who answered' }}
                unreadCount={unread.get(item.id) ?? 0}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {inReview.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">Opened for review ({inReview.length})</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {inReview.map((item) => (
              <CaseCard
                key={item.id}
                item={item}
                perspective="professional"
                action={{ href: `/cases/${item.id}`, label: 'Continue review' }}
                unreadCount={unread.get(item.id) ?? 0}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {isFirm ? (
        <Card>
          <h2 className="font-semibold text-slate-900">Not a lawyer yourself?</h2>
          <p className="mt-1 text-sm text-slate-600">
            A firm account cannot accept a case — only a registered lawyer can. Add your lawyers so
            they can pick cases up.
          </p>
          <Link href="/firm/lawyers" className={buttonClasses('secondary', 'md', 'mt-3')}>
            Lawyers registered
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
