import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireMember } from '@/lib/auth';
import { getVerificationOverview } from '@/server/services/verification-service';
import { listCasesForClient, listCasesForFirm, listCasesForLawyer, listClientsForLawyer } from '@/server/services/case-service';
import {
  diaryScope,
  listAppointmentsInRange,
  listBookableClients,
} from '@/server/services/appointment-service';
import { unreadNotificationCount } from '@/server/services/notification-service';
import { ACCOUNT_TYPE_LABEL, BADGE, ONGOING_CASE_STATUSES } from '@/lib/constants';
import { maskEmiratesId } from '@/lib/emirates-id';
import { formatDate } from '@/lib/format';
import { formatUaeTime, todayKey } from '@/lib/time';
import { VerificationBadge } from '@/components/VerificationBadge';
import { CaseCard } from '@/components/cases/CaseCard';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Dashboard' };

const NOTICES: Record<string, string> = {
  'email-confirmed': 'Your email address is confirmed.',
  'reviewer-only': 'That area is only available to accounts with reviewer access.',
  'professionals-only': 'That area is for lawyer and legal-firm accounts.',
};

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
  const user = await requireMember();
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
      {notice && NOTICES[notice] ? (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          {NOTICES[notice]}
        </p>
      ) : null}

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Hello, {displayName}</h1>
          {verified ? <VerificationBadge accountType={overview.accountType} size="lg" /> : null}
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {ACCOUNT_TYPE_LABEL[overview.accountType]} account · {user.email}
        </p>
      </header>

      {isReviewer ? (
        <Alert tone="info" title="You have reviewer access">
          Decide verification requests, manage accounts and read the outbox in the reviewer console.
          <div className="mt-3">
            <Link href="/admin/verifications" className={buttonClasses('primary', 'md')}>
              Open the reviewer console
            </Link>
          </div>
        </Alert>
      ) : null}

      {/* ── Practice dashboard ───────────────────────────────────────────── */}
      {isProfessional ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'In my portfolio', value: portfolioCount, href: '/portfolio' },
              { label: 'Pending review', value: pendingCount, href: '/pending' },
              { label: 'Clients', value: clientCount, href: '/clients' },
              { label: 'Meetings today', value: todayAppointments.length, href: '/calendar' },
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
            <h2 className="font-semibold text-slate-900">Today&rsquo;s diary</h2>
            {todayAppointments.length === 0 ? (
              <p className="mt-1 text-sm text-slate-600">
                No meetings booked for today.{' '}
                <Link href="/calendar" className="font-medium text-brand-700 hover:underline">
                  Open the calendar
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
                <h2 className="font-semibold text-slate-900">Waiting for you</h2>
                <Link href="/pending" className="text-sm font-medium text-brand-700 hover:underline">
                  See all
                </Link>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {pendingPreview.map((item) => (
                  <CaseCard
                    key={item.id}
                    item={item}
                    perspective="professional"
                    action={{ href: `/cases/${item.id}`, label: 'Review the case' }}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {isFirm ? (
            <Card>
              <h2 className="font-semibold text-slate-900">Lawyers registered</h2>
              <p className="mt-1 text-sm text-slate-600">
                Only a lawyer registered with your firm can accept a case submitted to it. Add your
                professionals so nothing sits unaccepted.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/firm/lawyers" className={buttonClasses('primary', 'md')}>
                  Manage lawyers registered
                </Link>
                <Link href="/pending" className={buttonClasses('secondary', 'md')}>
                  Cases pending review
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
            <h2 className="font-semibold text-slate-900">My cases</h2>
            <Link href="/cases" className="text-sm font-medium text-brand-700 hover:underline">
              See all and my meetings
            </Link>
          </div>
          {clientCases.length === 0 ? (
            <EmptyState
              title="You have not sent a case yet"
              description="Open a lawyer or firm in the directory and choose “Get in touch” to send your first case."
              action={
                <Link href="/directory" className={buttonClasses('primary', 'md')}>
                  Browse the directory
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
              <h2 className="font-semibold text-slate-900">Alerts</h2>
              <p className="mt-1 text-sm text-slate-600">
                {unreadAlerts} unread alert{unreadAlerts === 1 ? '' : 's'}.
              </p>
            </div>
            <Link href="/notifications" className={buttonClasses('secondary', 'md')}>
              Read my alerts
            </Link>
          </div>
        </Card>
      ) : null}

      {/* ── Verification ─────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">Verification</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              {verified ? (
                <>
                  Your documents were approved on {formatDate(user.verifiedAt)}. Your profile carries
                  the {BADGE[overview.accountType].label.toLowerCase()} badge.
                </>
              ) : overview.status === 'PENDING' ? (
                'Your request is in the queue and has not been picked up yet.'
              ) : overview.status === 'UNDER_REVIEW' ? (
                'A reviewer is examining your documents now.'
              ) : overview.status === 'REJECTED' ? (
                'Your last request was not approved. Read the reviewer’s reason, fix it, and submit again.'
              ) : (
                'Complete your profile, your legal details and your documents, then submit for review.'
              )}
            </p>
          </div>
          <Link href="/verification" className={buttonClasses('primary', 'md')}>
            {verified ? 'View my documents' : 'Continue verification'}
          </Link>
        </div>

        {!verified && overview.blockers.length > 0 ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-800">Still outstanding</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
              {overview.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <dl className="mt-4 grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-600">Emirates ID</dt>
            <dd className="font-medium text-slate-900">
              {overview.profile?.emiratesIdNumber
                ? maskEmiratesId(overview.profile.emiratesIdNumber)
                : 'Not provided'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-600">Documents on file</dt>
            <dd className="font-medium text-slate-900">
              {overview.documents.filter((doc) => doc.status !== 'SUPERSEDED').length}
            </dd>
          </div>
          <div>
            <dt className="text-slate-600">Verification requests</dt>
            <dd className="font-medium text-slate-900">{overview.cases.length}</dd>
          </div>
        </dl>
      </Card>

      {/* ── Listing ──────────────────────────────────────────────────────── */}
      {isProfessional ? (
        <Card>
          <h2 className="font-semibold text-slate-900">Your directory listing</h2>
          {listing ? (
            <>
              <p className="mt-1 text-sm text-slate-600">
                {listing.published ? (
                  <>
                    <strong className="text-slate-900">{listing.displayName}</strong> is published
                    and visible to everyone.
                  </>
                ) : (
                  <>
                    <strong className="text-slate-900">{listing.displayName}</strong> is saved as a
                    private draft. Nobody else can see it yet.
                  </>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/listing" className={buttonClasses('secondary', 'md')}>
                  Edit listing
                </Link>
                {listing.published ? (
                  <Link href={`/directory/${listing.id}`} className={buttonClasses('ghost', 'md')}>
                    View it in the directory
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <EmptyState
              title="You do not have a directory listing yet"
              description="Create one so that people searching by area of law and emirate can find you and send you a case. You choose when to publish it."
              action={
                <Link href="/listing" className={buttonClasses('primary', 'md')}>
                  Create my listing
                </Link>
              }
            />
          )}
        </Card>
      ) : null}

      <Card>
        <h2 className="font-semibold text-slate-900">Common tasks</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/profile" className={buttonClasses('secondary', 'md', 'w-full')}>
            Edit my profile
          </Link>
          {isProfessional ? (
            <Link href="/credentials" className={buttonClasses('secondary', 'md', 'w-full')}>
              Edit my legal details
            </Link>
          ) : null}
          {isProfessional ? (
            <Link href="/clients" className={buttonClasses('secondary', 'md', 'w-full')}>
              My clients
            </Link>
          ) : (
            <Link href="/directory" className={buttonClasses('secondary', 'md', 'w-full')}>
              Browse the directory
            </Link>
          )}
          <Link href="/verification" className={buttonClasses('secondary', 'md', 'w-full')}>
            Manage my documents
          </Link>
          <Link href="/inquiries" className={buttonClasses('secondary', 'md', 'w-full')}>
            Inquiries
          </Link>
          <Link href="/blog" className={buttonClasses('secondary', 'md', 'w-full')}>
            Community — ask, answer, recommend
          </Link>
          <Link href="/account" className={buttonClasses('secondary', 'md', 'w-full')}>
            Account and security
          </Link>
        </div>
      </Card>
    </div>
  );
}
