import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/lib/i18n';
import { accountTypeLabel, supportCategoryLabel, supportStatusLabel } from '@/lib/i18n/labels';
import { requireReviewer } from '@/lib/auth';
import { listTicketsForAdmin } from '@/server/services/support-service';
import { formatUaeDateTime } from '@/lib/time';
import { Alert, buttonClasses, Card, cx, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.support };
}

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-domain-enquiry/5 text-domain-enquiry ring-domain-enquiry/25',
  ANSWERED: 'bg-domain-verification/5 text-domain-verification ring-domain-verification/25',
  SOLVED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/**
 * The support queue, for administrators.
 *
 * Every ticket raised by a user, a lawyer or a firm, with who raised it and what
 * they said last. Answering is a conversation, not a form letter; the ticket is
 * closed from the ticket screen with the solved button.
 */
export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ t, effectiveLocale }] = await Promise.all([getI18n(), requireReviewer()]);
  const { status } = await searchParams;
  const filter = status === 'OPEN' || status === 'ANSWERED' || status === 'SOLVED' ? status : undefined;

  const { rows, open, answered, solved } = await listTicketsForAdmin(filter);

  const showingLabel: Record<string, string> = t.admin.support.showing;
  const emptyFilteredLabel: Record<string, string> = t.admin.support.emptyFiltered;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.support}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.support.intro}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t.admin.support.statWaiting, value: open, href: '/admin/support?status=OPEN' },
          { label: t.admin.support.statAnswered, value: answered, href: '/admin/support?status=ANSWERED' },
          { label: t.labels.supportStatus.SOLVED, value: solved, href: '/admin/support?status=SOLVED' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="block">
            <Card
              className={cx(
                'transition-colors hover:border-brand-400',
                filter && stat.href.endsWith(filter) ? 'ring-2 ring-brand-600' : undefined,
              )}
            >
              <p className="text-sm text-slate-600">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      {filter ? (
        <p className="text-sm text-slate-600">
          {showingLabel[filter]}{' '}
          <Link href="/admin/support" className="font-medium text-brand-700 hover:underline">
            {t.admin.support.showAll}
          </Link>
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={filter ? emptyFilteredLabel[filter] : t.admin.support.emptyTitle}
          description={t.admin.support.emptyBody}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((ticket) => {
            const reporter =
              ticket.user.profile?.fullName?.trim() || ticket.user.email;
            const last = ticket.messages[0];
            return (
              <Card as="li" key={ticket.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{ticket.reference}</span>
                      <span
                        className={cx(
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                          STATUS_STYLE[ticket.status] ?? 'bg-slate-100 text-slate-600 ring-slate-200',
                        )}
                      >
                        {supportStatusLabel(t, ticket.status)}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                        {accountTypeLabel(t, ticket.user.accountType)}
                      </span>
                      {ticket.user.isDemo ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                          {t.admin.support.seededDemoData}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-2 font-medium text-slate-900">{ticket.subject}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {reporter} · {ticket.user.email} ·{' '}
                      {supportCategoryLabel(t, ticket.category)} · {t.admin.support.raised}{' '}
                      {formatUaeDateTime(ticket.createdAt, effectiveLocale)} ·{' '}
                      {(ticket._count.messages === 1
                        ? t.admin.support.messagesOne
                        : t.admin.support.messagesMany
                      ).replace('{count}', String(ticket._count.messages))}
                    </p>

                    {last ? (
                      <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-slate-700">
                        <span className="font-medium text-slate-500">
                          {last.fromStaff
                            ? t.admin.support.supportPrefix
                            : t.admin.support.reporterPrefix}
                        </span>
                        {last.body}
                      </p>
                    ) : null}
                  </div>

                  <Link
                    href={`/admin/support/${ticket.id}`}
                    className={buttonClasses(ticket.status === 'OPEN' ? 'primary' : 'secondary', 'md')}
                  >
                    <Icon name="message" size={16} />
                    {t.admin.support.openTicket}
                  </Link>
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      <Alert tone="info" title={t.admin.support.privateTitle}>
        {t.admin.support.privateBody}
      </Alert>
    </div>
  );
}
