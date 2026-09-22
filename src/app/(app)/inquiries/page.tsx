import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { listInquiriesReceived, listInquiriesSent } from '@/server/services/inquiry-service';
import { formatDateTime } from '@/lib/format';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import {
  CloseInquiryButton,
  InquiryReplyForm,
  MarkInquiryReadButton,
} from '@/components/forms/InquiryReplyForm';

export const metadata: Metadata = { title: 'Inquiries' };

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-brand-50 text-brand-800 ring-brand-200',
  READ: 'bg-slate-100 text-slate-700 ring-slate-200',
  RESPONDED: 'bg-green-50 text-green-800 ring-green-200',
  CLOSED: 'bg-slate-100 text-slate-500 ring-slate-200',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  READ: 'Read',
  RESPONDED: 'Replied',
  CLOSED: 'Closed',
};

const NOTICES: Record<string, string> = {
  'inquiry-sent': 'Your inquiry has been sent.',
};

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; notice?: string }>;
}) {
  const user = await requireMember();
  const params = await searchParams;
  const tab = params.tab === 'sent' ? 'sent' : 'received';

  const [received, sent] = await Promise.all([
    listInquiriesReceived(user.id),
    listInquiriesSent(user.id),
  ]);

  const rows = tab === 'received' ? received : sent;
  const notice = params.notice ? NOTICES[params.notice] : undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Inquiries</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Messages sent through the directory. Replies stay here as a record, and a copy of each
          message is recorded for the recipient&rsquo;s email address.
        </p>
      </header>

      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="flex gap-2 border-b border-slate-200" role="tablist">
        <Link
          href="/inquiries?tab=received"
          role="tab"
          aria-selected={tab === 'received'}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
            tab === 'received'
              ? 'border-brand-700 text-brand-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Received ({received.length})
        </Link>
        <Link
          href="/inquiries?tab=sent"
          role="tab"
          aria-selected={tab === 'sent'}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
            tab === 'sent'
              ? 'border-brand-700 text-brand-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Sent ({sent.length})
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={tab === 'received' ? 'No inquiries received yet' : 'You have not sent any inquiries'}
          description={
            tab === 'received'
              ? user.accountType === 'USER'
                ? 'Nobody has contacted you through Dubai Legal.'
                : 'When someone contacts you from your directory listing, their message appears here.'
              : 'Find a lawyer or firm in the directory and send them a message.'
          }
          action={
            <Link href="/directory" className={buttonClasses('primary', 'md')}>
              Browse the directory
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((inquiry) => {
            const counterparty =
              tab === 'received'
                ? ('fromUser' in inquiry ? inquiry.fromUser : null)
                : ('toUser' in inquiry ? inquiry.toUser : null);
            const name =
              counterparty?.profile?.fullName?.trim() || counterparty?.email || 'Unknown member';

            return (
              <Card as="li" key={inquiry.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium text-slate-900">{inquiry.subject}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {tab === 'received' ? `From ${name}` : `To ${name}`} ·{' '}
                      {formatDateTime(inquiry.createdAt)} · listing: {inquiry.listing.displayName}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[inquiry.status]}`}
                  >
                    {STATUS_LABELS[inquiry.status]}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
                  {inquiry.message}
                </p>

                {inquiry.replyBody ? (
                  <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-xs font-medium text-green-900">
                      {tab === 'received' ? 'Your reply' : 'Reply from the professional'}
                      {inquiry.repliedAt ? ` · ${formatDateTime(inquiry.repliedAt)}` : ''}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-green-900">
                      {inquiry.replyBody}
                    </p>
                  </div>
                ) : null}

                {tab === 'received' ? (
                  <>
                    {!inquiry.replyBody ? <InquiryReplyForm inquiryId={inquiry.id} /> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      {inquiry.status === 'NEW' ? (
                        <MarkInquiryReadButton inquiryId={inquiry.id} />
                      ) : null}
                      {inquiry.status !== 'CLOSED' ? (
                        <CloseInquiryButton inquiryId={inquiry.id} />
                      ) : null}
                    </div>
                  </>
                ) : null}
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
