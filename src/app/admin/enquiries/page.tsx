import type { Metadata } from 'next';
import { requireReviewer } from '@/lib/auth';
import { enquiryOverview } from '@/server/services/enquiry-service';
import { LEGAL_AREA_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { minutesLabel } from '@/lib/time';
import { Alert, Card } from '@/components/ui/primitives';
import { DOMAINS, domainChip } from '@/lib/domains';
import { Icon } from '@/components/icons';

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
  await requireReviewer();
  const overview = await enquiryOverview();

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <span className={domainChip('enquiry')}>
            <Icon name="inbox" size={20} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-domain-enquiry">
              {DOMAINS.enquiry.label}
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Enquiry pool</h1>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          General enquiries sent from the landing page by people who did not create an account. They
          are not addressed to anyone: every registered lawyer and firm sees the same pool and
          whoever claims one takes it on.
        </p>
      </header>

      {overview.open > 5 ? (
        <Alert tone="warning" title={`${overview.open} enquiries are still unclaimed`}>
          The pool is filling up. Enquiries that nobody picks up are the clearest signal that
          professionals are not watching it.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Open in the pool', value: String(overview.open) },
          { label: 'Claimed', value: String(overview.claimed) },
          { label: 'Closed', value: String(overview.closed) },
          {
            label: 'Claim rate',
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
        <h2 className="mb-3 font-semibold text-slate-900">Recent enquiries ({overview.recent.length})</h2>
        {overview.recent.length === 0 ? (
          <p className="text-sm text-slate-600">No general enquiries have been sent.</p>
        ) : (
          <ul className="space-y-3">
            {overview.recent.map((enquiry) => (
              <Card as="li" key={enquiry.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">{enquiry.subject}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {enquiry.caseType
                        ? `${LEGAL_AREA_LABEL[enquiry.caseType] ?? enquiry.caseType} · `
                        : ''}
                      {minutesLabel(enquiry.createdAt)} · {maskEmail(enquiry.email)} ·{' '}
                      {maskPhone(enquiry.phone)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {enquiry.claimedBy
                        ? `Claimed by ${
                            enquiry.claimedBy.profile?.fullName?.trim() || enquiry.claimedBy.email
                          } at ${formatDateTime(enquiry.claimedAt)}`
                        : 'Nobody has claimed it yet'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                      STATUS_STYLE[enquiry.status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
                    }`}
                  >
                    {enquiry.status.toLowerCase()}
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
