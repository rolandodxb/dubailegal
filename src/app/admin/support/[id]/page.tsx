import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireReviewer } from '@/lib/auth';
import { getTicketForAdmin } from '@/server/services/support-service';
import { SUPPORT_CATEGORY_LABEL, SUPPORT_STATUS_LABEL } from '@/lib/support';
import { formatUaeDateTime } from '@/lib/time';
import { ACCOUNT_TYPE_LABEL } from '@/lib/constants';
import { Avatar } from '@/components/Avatar';
import { VerificationStatusPill } from '@/components/VerificationBadge';
import { SupportReplyForm, SolveTicketForm } from '@/components/forms/SupportForms';
import { Alert, buttonClasses, Card, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export const metadata: Metadata = { title: 'Support ticket' };

/**
 * One support ticket, from the administrator's side.
 *
 * The reporter's account sits beside the conversation, because most problems are
 * explained by what is on the account: whether it is verified, what kind of
 * account it is, and whether it is one of the seeded samples.
 */
export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireReviewer();
  const { id } = await params;

  const ticket = await getTicketForAdmin(id);
  if (!ticket) notFound();

  const reporter = ticket.user.profile?.fullName?.trim() || ticket.user.email;

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label="Breadcrumb">
        <Link href="/admin/support" className="text-brand-700 hover:underline">
          ← Support queue
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-500">{ticket.reference}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {SUPPORT_CATEGORY_LABEL[ticket.category] ?? ticket.category} · raised{' '}
            {formatUaeDateTime(ticket.createdAt)}
            {ticket.contextPath ? ` · from ${ticket.contextPath}` : ''}
          </p>
        </div>
        <span
          className={cx(
            'inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset',
            ticket.status === 'OPEN'
              ? 'bg-domain-enquiry/5 text-domain-enquiry ring-domain-enquiry/25'
              : ticket.status === 'ANSWERED'
                ? 'bg-domain-verification/5 text-domain-verification ring-domain-verification/25'
                : 'bg-slate-100 text-slate-600 ring-slate-200',
          )}
        >
          {SUPPORT_STATUS_LABEL[ticket.status] ?? ticket.status}
        </span>
      </header>

      {ticket.status === 'SOLVED' ? (
        <Alert tone="success" title="Solved and closed">
          Closed {ticket.solvedAt ? formatUaeDateTime(ticket.solvedAt) : ''}
          {ticket.solvedBy ? ` by ${ticket.solvedBy.email}` : ''}. Neither side can post to this
          ticket again.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <h2 className="font-semibold text-slate-900">Conversation</h2>

          <ul className="mt-4 space-y-4">
            {ticket.messages.map((message) => {
              const name =
                message.author.profile?.fullName?.trim() || message.author.email || 'Member';
              return (
                <li key={message.id} className="flex gap-3">
                  <span className="shrink-0">
                    {message.fromStaff ? (
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
                        <Icon name="lifeBuoy" size={17} />
                      </span>
                    ) : (
                      <Avatar
                        userId={message.author.id}
                        name={name}
                        hasPhoto={Boolean(message.author.profile?.avatarDocumentId)}
                        size={36}
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">
                      {message.fromStaff ? (
                        <span className="font-medium text-slate-800">
                          Support · {message.author.email}
                        </span>
                      ) : (
                        <span className="font-medium text-slate-800">
                          {name} · {ACCOUNT_TYPE_LABEL[message.author.accountType]}
                        </span>
                      )}{' '}
                      · {formatUaeDateTime(message.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-line rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800">
                      {message.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <SupportReplyForm ticketId={ticket.id} asAdmin disabled={ticket.status === 'SOLVED'} />
          </div>
        </Card>

        <aside className="space-y-4">
          <Card>
            <h2 className="font-semibold text-slate-900">Who raised it</h2>
            <div className="mt-3 flex items-start gap-3">
              <Avatar
                userId={ticket.user.id}
                name={reporter}
                hasPhoto={Boolean(ticket.user.profile?.avatarDocumentId)}
                size={40}
              />
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{reporter}</p>
                <p className="text-xs text-slate-500">{ticket.user.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {ACCOUNT_TYPE_LABEL[ticket.user.accountType]} · joined{' '}
                  {formatUaeDateTime(ticket.user.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <VerificationStatusPill
                accountType={ticket.user.accountType}
                status={ticket.user.verificationStatus}
              />
              {ticket.user.isDemo ? (
                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                  Seeded demo data
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/admin/users?search=${encodeURIComponent(ticket.user.email)}`}
                className={buttonClasses('secondary', 'sm')}
              >
                Find the account
              </Link>
            </div>
          </Card>

          <Card className={ticket.status === 'SOLVED' ? undefined : 'border-domain-verification/30'}>
            <h2 className="font-semibold text-slate-900">Finish this ticket</h2>
            <p className="mt-1 mb-3 text-sm text-slate-600">
              Marking it solved closes the ticket for both sides. The reporter is told, and raises a
              new ticket if the problem returns.
            </p>
            {ticket.status === 'SOLVED' ? (
              <p className="text-sm text-slate-500">
                Already solved{ticket.solvedBy ? ` by ${ticket.solvedBy.email}` : ''}.
              </p>
            ) : (
              <SolveTicketForm ticketId={ticket.id} reference={ticket.reference} />
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
