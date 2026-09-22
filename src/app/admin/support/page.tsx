import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { listTicketsForAdmin } from '@/server/services/support-service';
import { SUPPORT_CATEGORY_LABEL, SUPPORT_STATUS_LABEL } from '@/lib/support';
import { formatUaeDateTime } from '@/lib/time';
import { ACCOUNT_TYPE_LABEL } from '@/lib/constants';
import { Alert, buttonClasses, Card, cx, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export const metadata: Metadata = { title: 'Support' };

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
  await requireReviewer();
  const { status } = await searchParams;
  const filter = status === 'OPEN' || status === 'ANSWERED' || status === 'SOLVED' ? status : undefined;

  const { rows, open, answered, solved } = await listTicketsForAdmin(filter);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Support</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Problems reported by users, lawyers and firms. Support is read by administrators only: it is
          never shown to the other side of a case. Open a ticket, answer it, and press the solved
          button when it is finished — that closes it for both sides.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Waiting for a reply', value: open, href: '/admin/support?status=OPEN' },
          { label: 'Answered, awaiting them', value: answered, href: '/admin/support?status=ANSWERED' },
          { label: 'Solved and closed', value: solved, href: '/admin/support?status=SOLVED' },
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
          Showing {filter.toLowerCase()} tickets.{' '}
          <Link href="/admin/support" className="font-medium text-brand-700 hover:underline">
            Show all
          </Link>
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={filter ? `No ${filter.toLowerCase()} tickets` : 'No tickets have been raised'}
          description="When somebody reports a problem it appears here, with their account and the whole conversation attached."
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
                        {SUPPORT_STATUS_LABEL[ticket.status] ?? ticket.status}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                        {ACCOUNT_TYPE_LABEL[ticket.user.accountType]}
                      </span>
                      {ticket.user.isDemo ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                          Seeded demo data
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-2 font-medium text-slate-900">{ticket.subject}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {reporter} · {ticket.user.email} ·{' '}
                      {SUPPORT_CATEGORY_LABEL[ticket.category] ?? ticket.category} · raised{' '}
                      {formatUaeDateTime(ticket.createdAt)} · {ticket._count.messages} message
                      {ticket._count.messages === 1 ? '' : 's'}
                    </p>

                    {last ? (
                      <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-slate-700">
                        <span className="font-medium text-slate-500">
                          {last.fromStaff ? 'Support: ' : 'Reporter: '}
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
                    Open the ticket
                  </Link>
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      <Alert tone="info" title="Support is private to administrators and the reporter">
        A ticket can contain anything about an account. It is never visible to the other side of a
        case, and solving one closes it for both sides — the reporter raises a new ticket if the
        problem returns.
      </Alert>
    </div>
  );
}
