import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
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
  const [{ t }, user] = await Promise.all([getI18n(), requireProfessional()]);
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
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.pending}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {isFirm ? t.memberCore.pending.introFirm : t.memberCore.pending.introLawyer}
        </p>
      </header>

      {isFirm ? (
        <Alert tone="info" title={t.memberCore.pending.howReachTitle}>
          {t.memberCore.pending.howReachBefore.replace(
            '{name}',
            user.profile?.fullName?.trim() || t.memberCore.pending.yourFirm,
          )}
          <strong>{t.memberCore.pending.howReachAction}</strong>
          {t.memberCore.pending.howReachAfter}
        </Alert>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {isFirm
            ? t.memberCore.pending.waitingForDecision
            : t.memberCore.pending.waitingToBePickedUp}{' '}
          ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <EmptyState
            title={t.memberCore.pending.nothingWaiting}
            description={
              isFirm ? t.memberCore.pending.emptyFirm : t.memberCore.pending.emptyLawyer
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
                  label: isFirm
                    ? t.memberCore.pending.openAndReview
                    : t.memberCore.pending.reviewTheCase,
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
            {t.memberCore.pending.withYourLawyers.replace(
              '{count}',
              String(distributed.length),
            )}
          </h2>
          <p className="mb-3 text-sm text-slate-600">
            {t.memberCore.pending.withYourLawyersBody}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {distributed.map((item) => (
              <CaseCard
                key={item.id}
                item={item}
                perspective="professional"
                action={{ href: `/cases/${item.id}`, label: t.memberCore.pending.seeWhoAnswered }}
                unreadCount={unread.get(item.id) ?? 0}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {inReview.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            {t.memberCore.pending.openedForReview.replace('{count}', String(inReview.length))}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {inReview.map((item) => (
              <CaseCard
                key={item.id}
                item={item}
                perspective="professional"
                action={{ href: `/cases/${item.id}`, label: t.memberCore.pending.continueReview }}
                unreadCount={unread.get(item.id) ?? 0}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {isFirm ? (
        <Card>
          <h2 className="font-semibold text-slate-900">{t.memberCore.pending.notLawyerTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{t.memberCore.pending.notLawyerBody}</p>
          <Link href="/firm/lawyers" className={buttonClasses('secondary', 'md', 'mt-3')}>
            {t.items.firmLawyers}
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
