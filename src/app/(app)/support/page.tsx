import type { Metadata } from 'next';
import Link from 'next/link';
import { requireActiveUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { supportCategoryLabel, supportStatusLabel } from '@/lib/i18n/labels';
import { getTicketForOwner, listTicketsForUser } from '@/server/services/support-service';
import { formatUaeDateTime } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import {
  SupportReplyForm,
  SupportTicketForm,
} from '@/components/forms/SupportForms';
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
 * Support, for anyone with an account.
 *
 * One screen: raise a problem, then carry on the conversation about it. Only the
 * person who raised it and a platform administrator can read a ticket — not the
 * other side of a case, and not the professional a client might be reporting.
 */
export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const [{ t, effectiveLocale }, user] = await Promise.all([getI18n(), requireActiveUser()]);
  const { ticket: ticketId } = await searchParams;

  const tickets = await listTicketsForUser(user.id);
  const open = ticketId ? await getTicketForOwner(ticketId, user.id) : null;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-domain-enquiry/10 text-domain-enquiry">
            <Icon name="lifeBuoy" size={18} />
          </span>
          <h1 className="text-2xl font-semibold text-slate-900">{t.items.support}</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{t.memberCore.support.intro}</p>
      </header>

      {/* ── The thread ───────────────────────────────────────────────────── */}
      {open ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs text-slate-500">{open.reference}</p>
              <h2 className="mt-0.5 font-semibold text-slate-900">{open.subject}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {supportCategoryLabel(t, open.category)} ·{' '}
                {t.memberCore.support.opened} {formatUaeDateTime(open.createdAt, effectiveLocale)}
                {open.contextPath
                  ? ` · ${t.memberCore.support.from} ${open.contextPath}`
                  : ''}
              </p>
            </div>
            <span
              className={cx(
                'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                STATUS_STYLE[open.status] ?? 'bg-slate-100 text-slate-600 ring-slate-200',
              )}
            >
              {supportStatusLabel(t, open.status)}
            </span>
          </div>

          {open.status === 'SOLVED' ? (
            <Alert tone="success" className="mt-4" title={t.memberCore.support.solvedTitle}>
              {t.memberCore.support.closedWarning
                .replace('{date}', open.solvedAt ? formatUaeDateTime(open.solvedAt, effectiveLocale) : '')
                .replace(
                  '{closedBy}',
                  open.solvedBy
                    ? t.memberCore.support.closedBy.replace('{email}', open.solvedBy.email)
                    : '',
                )
                .replace('{reference}', open.reference)}
            </Alert>
          ) : null}

          <ul className="mt-5 space-y-4">
            {open.messages.map((message) => {
              const name =
                message.author.profile?.fullName?.trim() ||
                message.author.email ||
                t.memberCore.support.member;
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
                          {t.memberCore.support.staff}
                        </span>
                      ) : (
                        t.room.you
                      )}{' '}
                      · {formatUaeDateTime(message.createdAt, effectiveLocale)}
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
            <SupportReplyForm
              ticketId={open.id}
              disabled={open.status === 'SOLVED'}
              labels={{
                closedTicket: t.memberCore.supportForms.closedTicket,
                message: t.memberCore.supportForms.message,
                replyPlaceholder: t.memberCore.supportForms.replyPlaceholder,
                replyPlaceholderAdmin: t.memberCore.supportForms.replyPlaceholderAdmin,
                sending: t.memberCore.supportForms.sending,
                sendReply: t.memberCore.supportForms.sendReply,
                sendMessage: t.memberCore.supportForms.sendMessage,
              }}
            />
          </div>

          <div className="mt-5">
            <Link href="/support" className={buttonClasses('ghost', 'sm')}>
              {t.memberCore.support.allMyTickets}
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="font-semibold text-slate-900">{t.memberCore.support.reportTitle}</h2>
          <p className="mt-1 mb-4 text-sm text-slate-600">{t.memberCore.support.reportBody}</p>
          <SupportTicketForm
            labels={{
              problem: t.memberCore.supportForms.problem,
              problemHint: t.memberCore.supportForms.problemHint,
              problemPlaceholder: t.memberCore.supportForms.problemPlaceholder,
              about: t.memberCore.supportForms.about,
              describe: t.memberCore.supportForms.describe,
              describeHint: t.memberCore.supportForms.describeHint,
              sendingToSupport: t.memberCore.supportForms.sendingToSupport,
              sendToSupport: t.memberCore.supportForms.sendToSupport,
              privacyNote: t.memberCore.supportForms.privacyNote,
              categories: t.labels.supportCategory,
            }}
          />
        </Card>
      )}

      {/* ── My tickets ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.memberCore.support.myTickets.replace('{count}', String(tickets.length))}
        </h2>
        {tickets.length === 0 ? (
          <EmptyState
            title={t.memberCore.support.emptyTitle}
            description={t.memberCore.support.emptyBody}
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {tickets.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{entry.subject}</p>
                  <p className="text-xs text-slate-500">
                    {entry.reference} · {supportCategoryLabel(t, entry.category)} ·{' '}
                    {(entry._count.messages === 1
                      ? t.memberCore.support.messagesOne
                      : t.memberCore.support.messagesMany
                    ).replace('{count}', String(entry._count.messages))}{' '}
                    · {t.memberCore.support.updated} {formatUaeDateTime(entry.updatedAt, effectiveLocale)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cx(
                      'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                      STATUS_STYLE[entry.status] ?? 'bg-slate-100 text-slate-600 ring-slate-200',
                    )}
                  >
                    {supportStatusLabel(t, entry.status)}
                  </span>
                  <Link
                    href={`/support?ticket=${entry.id}`}
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    {t.common.open}
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
