import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireMember } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { blockerTexts } from '@/lib/i18n/requirements';
import { getVerificationOverview } from '@/server/services/verification-service';
import { listCasesForClient, listCasesForFirm, listCasesForLawyer, listClientsForLawyer } from '@/server/services/case-service';
import {
  diaryScope,
  listAppointmentsInRange,
  listBookableClients,
} from '@/server/services/appointment-service';
import { unreadNotificationCount } from '@/server/services/notification-service';
import { ONGOING_CASE_STATUSES } from '@/lib/constants';
import { maskEmiratesId } from '@/lib/emirates-id';
import { formatDate } from '@/lib/format';
import { formatUaeTime, todayKey } from '@/lib/time';
import { VerificationBadge } from '@/components/VerificationBadge';
import { CaseCard } from '@/components/cases/CaseCard';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';

/** The tab title, in the reader's language — the same words as the nav entry. */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.dashboard };
}

/**
 * One dashboard, shaped by the account type.
 *
 * Lawyers and firms get a practice dashboard — portfolio, pending cases,
 * clients and today's diary. Clients get their cases and upcoming meetings.
 * Reviewers are pointed at the console they actually work in.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ t, effectiveLocale }, user] = await Promise.all([getI18n(), requireMember()]);
  const { notice } = await searchParams;

  const isReviewer = user.roles.includes('REVIEWER');
  const isFirm = user.accountType === 'FIRM';
  const isLawyer = user.accountType === 'LAWYER';
  const isProfessional = isFirm || isLawyer;

  const [overview, unreadAlerts, listing] = await Promise.all([
    getVerificationOverview(user.id),
    unreadNotificationCount(user.id),
    prisma.listing.findUnique({
      where: { userId: user.id },
      select: { published: true, displayName: true, id: true },
    }),
  ]);
  if (!overview) return null;

  const verified = overview.status === 'APPROVED';
  const displayName = overview.profile?.fullName?.trim() || user.email;

  const noticeText =
    notice === 'email-confirmed'
      ? t.memberCore.dashboard.notices.emailConfirmed
      : notice === 'reviewer-only'
        ? t.memberCore.dashboard.notices.reviewerOnly
        : notice === 'professionals-only'
          ? t.memberCore.dashboard.notices.professionalsOnly
          : undefined;

  // ── Practice numbers ──────────────────────────────────────────────────────
  let portfolioCount = 0;
  let pendingCount = 0;
  let clientCount = 0;
  let todayAppointments: { id: string; startsAt: Date; clientName: string }[] = [];
  let pendingPreview: Awaited<ReturnType<typeof listCasesForLawyer>>['pending'] = [];

  if (isProfessional) {
    // These four answer different questions about the same member and none of
    // them depends on another, so they are asked together: four round trips in
    // the time of one, which on a remote database is most of this page's cost.
    const [lawyerCases, firmCases, clients, bookable, scope] = await Promise.all([
      isLawyer ? listCasesForLawyer(user.id) : Promise.resolve(null),
      isFirm ? listCasesForFirm(user.id) : Promise.resolve(null),
      listClientsForLawyer(user.id),
      listBookableClients(user.id),
      // A firm has no diary of its own, but it does have its lawyers' diaries.
      diaryScope(user.id),
    ]);

    portfolioCount = isFirm
      ? (firmCases?.active.length ?? 0)
      : (lawyerCases?.portfolio.length ?? 0);
    pendingCount = isFirm
      ? (firmCases?.submitted.length ?? 0)
      : (lawyerCases?.pending.length ?? 0) + (lawyerCases?.reviewing.length ?? 0);
    pendingPreview = lawyerCases?.pending.slice(0, 2) ?? [];
    clientCount = clients.length;

    const { lawyerProfileId } = bookable;
    const ids = scope.isFirm ? scope.lawyerIds : lawyerProfileId ? [lawyerProfileId] : [];
    if (ids.length > 0) {
      const key = todayKey();
      const todays = await listAppointmentsInRange(ids, key, key);
      todayAppointments = todays
        .filter((item) => item.status === 'BOOKED')
        .map((item) => ({
          id: item.id,
          startsAt: item.startsAt,
          clientName: item.client.profile?.fullName?.trim() || item.client.email,
        }));
    }
  }

  const clientCases = isProfessional ? [] : await listCasesForClient(user.id);

  return (
    <div className="space-y-8">
      {noticeText ? (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          {noticeText}
        </p>
      ) : null}

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            {t.memberCore.dashboard.hello.replace('{name}', displayName)}
          </h1>
          {verified ? (
            <VerificationBadge
              accountType={overview.accountType}
              size="lg"
              label={t.badges[overview.accountType]}
            />
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {t.memberCore.accountTypeLines[overview.accountType]} · {user.email}
        </p>
      </header>

      {isReviewer ? (
        <Alert tone="info" title={t.dashboard.reviewerAccess}>
          {t.memberCore.dashboard.reviewerConsoleBody}
          <div className="mt-3">
            <Link href="/admin/verifications" className={buttonClasses('primary', 'md')}>
              {t.memberCore.dashboard.openReviewerConsole}
            </Link>
          </div>
        </Alert>
      ) : null}

      {/* ── Practice dashboard ───────────────────────────────────────────── */}
      {isProfessional ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: t.memberCore.dashboard.inMyPortfolio,
                value: portfolioCount,
                href: '/portfolio',
              },
              {
                label: t.memberCore.dashboard.pendingReview,
                value: pendingCount,
                href: '/pending',
              },
              { label: t.memberCore.dashboard.clients, value: clientCount, href: '/clients' },
              {
                label: t.memberCore.dashboard.meetingsToday,
                value: todayAppointments.length,
                href: '/calendar',
              },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href} className="block">
                <Card className="transition-colors hover:border-brand-400">
                  <p className="text-sm text-slate-600">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
                </Card>
              </Link>
            ))}
          </div>

          <Card>
            <h2 className="font-semibold text-slate-900">{t.dashboard.todayDiary}</h2>
            {todayAppointments.length === 0 ? (
              <p className="mt-1 text-sm text-slate-600">
                {t.memberCore.dashboard.noMeetingsToday}{' '}
                <Link href="/calendar" className="font-medium text-brand-700 hover:underline">
                  {t.memberCore.dashboard.openTheCalendar}
                </Link>
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {todayAppointments.map((appointment) => (
                  <li key={appointment.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm text-slate-800">{appointment.clientName}</span>
                    <span className="text-sm font-medium text-slate-900">
                      {formatUaeTime(appointment.startsAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {pendingPreview.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{t.dashboard.waitingForYou}</h2>
                <Link href="/pending" className="text-sm font-medium text-brand-700 hover:underline">
                  {t.memberCore.dashboard.seeAll}
                </Link>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {pendingPreview.map((item) => (
                  <CaseCard
                    key={item.id}
                    item={item}
                    perspective="professional"
                    action={{ href: `/cases/${item.id}`, label: t.memberCore.dashboard.reviewTheCase }}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {isFirm ? (
            <Card>
              <h2 className="font-semibold text-slate-900">{t.dashboard.lawyersRegistered}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {t.memberCore.dashboard.firmLawyersBody}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/firm/lawyers" className={buttonClasses('primary', 'md')}>
                  {t.memberCore.dashboard.manageLawyers}
                </Link>
                <Link href="/pending" className={buttonClasses('secondary', 'md')}>
                  {t.items.pending}
                </Link>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}

      {/* ── Client dashboard ─────────────────────────────────────────────── */}
      {!isProfessional ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{t.memberCore.dashboard.myCases}</h2>
            <Link href="/cases" className="text-sm font-medium text-brand-700 hover:underline">
              {t.memberCore.dashboard.seeAllAndMeetings}
            </Link>
          </div>
          {clientCases.length === 0 ? (
            <EmptyState
              title={t.dashboard.noCasesYet}
              description={t.dashboard.noCasesBody}
              action={
                <Link href="/directory" className={buttonClasses('primary', 'md')}>
                  {t.dashboard.browseDirectory}
                </Link>
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {clientCases.slice(0, 4).map((item) => (
                <CaseCard key={item.id} item={item} perspective="client" />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {unreadAlerts > 0 ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">{t.items.alerts}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {(unreadAlerts === 1
                  ? t.memberCore.dashboard.alertsUnreadOne
                  : t.memberCore.dashboard.alertsUnreadMany
                ).replace('{count}', String(unreadAlerts))}
              </p>
            </div>
            <Link href="/notifications" className={buttonClasses('secondary', 'md')}>
              {t.items.myAlerts}
            </Link>
          </div>
        </Card>
      ) : null}

      {/* ── Verification ─────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">{t.dashboard.verification}</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              {verified ? (
                <>
                  {t.memberCore.dashboard.approvedOn
                    .replace('{date}', formatDate(user.verifiedAt))
                    .replace('{badge}', t.badges[overview.accountType].toLowerCase())}
                </>
              ) : overview.status === 'PENDING' ? (
                t.memberCore.dashboard.pendingQueue
              ) : overview.status === 'UNDER_REVIEW' ? (
                t.memberCore.dashboard.underReview
              ) : overview.status === 'REJECTED' ? (
                t.memberCore.dashboard.rejected
              ) : (
                t.memberCore.dashboard.incomplete
              )}
            </p>
          </div>
          <Link href="/verification" className={buttonClasses('primary', 'md')}>
            {verified
              ? t.memberCore.dashboard.viewMyDocuments
              : t.memberCore.dashboard.continueVerification}
          </Link>
        </div>

        {!verified && overview.blockers.length > 0 ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-800">{t.dashboard.stillOutstanding}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
              {blockerTexts(t, effectiveLocale, overview.blockerItems, overview.documentRules).map(
                (blocker) => (
                  <li key={blocker}>{blocker}</li>
                ),
              )}
            </ul>
          </div>
        ) : null}

        <dl className="mt-4 grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-600">{t.dashboard.emiratesId}</dt>
            <dd className="font-medium text-slate-900">
              {overview.profile?.emiratesIdNumber
                ? maskEmiratesId(overview.profile.emiratesIdNumber)
                : t.memberCore.dashboard.notProvided}
            </dd>
          </div>
          <div>
            <dt className="text-slate-600">{t.dashboard.documentsOnFile}</dt>
            <dd className="font-medium text-slate-900">
              {overview.documents.filter((doc) => doc.status !== 'SUPERSEDED').length}
            </dd>
          </div>
          <div>
            <dt className="text-slate-600">{t.dashboard.verificationRequests}</dt>
            <dd className="font-medium text-slate-900">{overview.cases.length}</dd>
          </div>
        </dl>
      </Card>

      {/* ── Listing ──────────────────────────────────────────────────────── */}
      {isProfessional ? (
        <Card>
          <h2 className="font-semibold text-slate-900">{t.dashboard.yourListing}</h2>
          {listing ? (
            <>
              <p className="mt-1 text-sm text-slate-600">
                {listing.published ? (
                  <>
                    <strong className="text-slate-900">{listing.displayName}</strong>{' '}
                    {t.memberCore.dashboard.listingPublished}
                  </>
                ) : (
                  <>
                    <strong className="text-slate-900">{listing.displayName}</strong>{' '}
                    {t.memberCore.dashboard.listingDraft}
                  </>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/listing" className={buttonClasses('secondary', 'md')}>
                  {t.memberCore.dashboard.editListing}
                </Link>
                {listing.published ? (
                  <Link href={`/directory/${listing.id}`} className={buttonClasses('ghost', 'md')}>
                    {t.memberCore.dashboard.viewInDirectory}
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <EmptyState
              title={t.dashboard.noListing}
              description={t.dashboard.noListingBody}
              action={
                <Link href="/listing" className={buttonClasses('primary', 'md')}>
                  {t.memberCore.dashboard.createMyListing}
                </Link>
              }
            />
          )}
        </Card>
      ) : null}

      <Card>
        <h2 className="font-semibold text-slate-900">{t.dashboard.commonTasks}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/profile" className={buttonClasses('secondary', 'md', 'w-full')}>
            {t.dashboard.editProfile}
          </Link>
          {isProfessional ? (
            <Link href="/credentials" className={buttonClasses('secondary', 'md', 'w-full')}>
              {t.dashboard.legalDetails}
            </Link>
          ) : null}
          {isProfessional ? (
            <Link href="/clients" className={buttonClasses('secondary', 'md', 'w-full')}>
              {t.dashboard.myClients}
            </Link>
          ) : (
            <Link href="/directory" className={buttonClasses('secondary', 'md', 'w-full')}>
              {t.dashboard.browseDirectory}
            </Link>
          )}
          <Link href="/verification" className={buttonClasses('secondary', 'md', 'w-full')}>
            {t.dashboard.manageDocuments}
          </Link>
          <Link href="/inquiries" className={buttonClasses('secondary', 'md', 'w-full')}>
            {t.items.inquiries}
          </Link>
          <Link href="/blog" className={buttonClasses('secondary', 'md', 'w-full')}>
            {t.dashboard.community}
          </Link>
          <Link href="/account" className={buttonClasses('secondary', 'md', 'w-full')}>
            {t.items.accountSecurity}
          </Link>
        </div>
      </Card>
    </div>
  );
}
