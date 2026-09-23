import Link from 'next/link';
import { getI18n } from '@/lib/i18n';
import { legalAreaLabel } from '@/lib/i18n/labels';
import { formatDateTime } from '@/lib/format';
import { buttonClasses, Card } from '@/components/ui/primitives';
import { CaseStatusChip } from './CaseStatusChip';

export type CaseCardData = {
  id: string;
  reference: string;
  title: string;
  caseType: string;
  status: string;
  submittedAt: Date;
  updatedAt: Date;
  client: { id: string; profile: { fullName: string } | null; email: string };
  lawyer: { id: string; user: { profile: { fullName: string } | null } | null } | null;
  firm: { id: string; legalName: string } | null;
  _count?: { messages: number };
};

/**
 * One case, as it appears in a list. Shows the reference the client can quote,
 * the party on the other side, and the current state.
 */
export async function CaseCard({
  item,
  perspective,
  action,
  unreadCount = 0,
}: {
  item: CaseCardData;
  perspective: 'client' | 'professional';
  action?: { href: string; label: string };
  /** Unread messages from the other side, shown as a badge. */
  unreadCount?: number;
}) {
  const { t } = await getI18n();
  const labels = t.memberCases.caseCard;

  const counterpartyName =
    perspective === 'client'
      ? (item.lawyer?.user?.profile?.fullName?.trim() ||
          item.firm?.legalName ||
          labels.notYetAssigned)
      : item.client.profile?.fullName?.trim() || item.client.email;

  return (
    <Card as="li" className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-500">{item.reference}</p>
          <h3 className="mt-0.5 font-medium text-slate-900">
            {item.title}
            {unreadCount > 0 ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-brand-700 px-2 py-0.5 align-middle text-[11px] font-semibold text-white">
                {(unreadCount === 1 ? labels.newMessage : labels.newMessages).replace(
                  '{count}',
                  String(unreadCount),
                )}
              </span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {legalAreaLabel(t, item.caseType)} ·{' '}
            {perspective === 'client' ? labels.with : labels.client}: {counterpartyName}
          </p>
        </div>
        <CaseStatusChip status={item.status} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div>
          <dt className="font-medium text-slate-600">{labels.submitted}</dt>
          <dd>{formatDateTime(item.submittedAt)}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-600">{labels.lastActivity}</dt>
          <dd>{formatDateTime(item.updatedAt)}</dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {item._count ? (
          <span className="text-xs text-slate-500">
            {item._count.messages === 0
              ? labels.noMessagesYet
              : (item._count.messages === 1 ? labels.oneMessage : labels.manyMessages).replace(
                  '{count}',
                  String(item._count.messages),
                )}
          </span>
        ) : (
          <span />
        )}
        <Link href={action?.href ?? `/cases/${item.id}`} className={buttonClasses('secondary', 'sm')}>
          {action?.label ?? labels.openCase}
        </Link>
      </div>
    </Card>
  );
}
