import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n';
import { legalAreaLabel } from '@/lib/i18n/labels';
import { requireReviewer } from '@/lib/auth';
import { enquiryOverview } from '@/server/services/enquiry-service';
import { formatDateTime } from '@/lib/format';
import { Alert, Card } from '@/components/ui/primitives';
import { domainChip } from '@/lib/domains';
import { Icon } from '@/components/icons';
import { relativeTime } from '@/lib/i18n/format';

export const metadata: Metadata = { title: 'Enquiries' };

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-domain-enquiry/10 text-domain-enquiry ring-domain-enquiry/25',
  CLAIMED: 'bg-green-50 text-green-800 ring-green-200',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/**
 * The public enquiry pool, for oversight.
 *
 * These are enquiries from people without accounts: nobody is obliged to answer
 * one, so the number worth watching is how many are still open. The contact
 * details are masked — an operator has no reason to hold them.
 */
export default async function AdminEnquiriesPage() {
  const [{ t }] = await Promise.all([getI18n(), requireReviewer()]);
  const overview = await enquiryOverview();

  const statusLabel: Record<string, string> = t.admin.enquiries.status;

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <span className={domainChip('enquiry')}>
            <Icon name="inbox" size={20} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-domain-enquiry">
              {t.labels.domain.enquiry}
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">{t.items.enquiryPool}</h1>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{t.admin.enquiries.intro}</p>
      </header>

      {overview.open > 5 ? (
        <Alert
          tone="warning"
          title={t.admin.enquiries.unclaimedAlert.replace('{count}', String(overview.open))}
        >
          {t.admin.enquiries.unclaimedBody}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t.admin.enquiries.statOpen, value: String(overview.open) },
          { label: t.admin.enquiries.statClaimed, value: String(overview.claimed) },
          { label: t.admin.enquiries.statClosed, value: String(overview.closed) },
          {
            label: t.admin.enquiries.statClaimRate,
            value: overview.claimRate === null ? '—' : `${overview.claimRate}%`,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.admin.enquiries.recent.replace('{count}', String(overview.recent.length))}
        </h2>
        {overview.recent.length === 0 ? (
          <p className="text-sm text-slate-600">{t.admin.enquiries.empty}</p>
        ) : (
          <ul className="space-y-3">
            {overview.recent.map((enquiry) => (
              <Card as="li" key={enquiry.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">{enquiry.subject}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {enquiry.caseType ? `${legalAreaLabel(t, enquiry.caseType)} · ` : ''}
                      {relativeTime(t, enquiry.createdAt)} · {maskEmail(enquiry.email)} ·{' '}
                      {maskPhone(enquiry.phone)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {enquiry.claimedBy
                        ? t.admin.enquiries.claimedBy
                            .replace(
                              '{name}',
                              enquiry.claimedBy.profile?.fullName?.trim() || enquiry.claimedBy.email,
                            )
                            .replace('{date}', formatDateTime(enquiry.claimedAt))
                        : t.admin.enquiries.unclaimed}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                      STATUS_STYLE[enquiry.status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
                    }`}
                  >
                    {statusLabel[enquiry.status] ?? enquiry.status.toLowerCase()}
                  </span>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** An operator has no reason to hold a member of the public's contact details. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '•••';
  const head = local.slice(0, 2);
  return `${head}${'•'.repeat(Math.max(0, local.length - 2))}@${domain}`;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '•••';
  return `${'•'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}
