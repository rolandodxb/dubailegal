import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { emergencyOverview } from '@/server/services/admin-service';
import { LEGAL_AREA_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { Alert, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Emergencies' };

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-800 ring-red-200',
  ACCEPTED: 'bg-green-50 text-green-800 ring-green-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
  RESOLVED: 'bg-brand-50 text-brand-800 ring-brand-200',
  EXPIRED: 'bg-slate-100 text-slate-500 ring-slate-200',
};

/**
 * Emergency activity, for oversight.
 *
 * An operator can see that urgent requests are being raised, how many
 * professionals are available to take them, and how quickly they are answered.
 * The description is shown because an emergency is a safety matter — but the
 * call-back number is masked, since it is a personal contact detail an operator
 * has no reason to hold.
 */
export default async function AdminEmergencyPage() {
  await requireReviewer();
  const overview = await emergencyOverview();

  const answered = overview.accepted;
  const total = answered + overview.expired + overview.open;
  const answerRate = total === 0 ? null : Math.round((answered / total) * 100);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Emergencies</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Urgent requests raised by clients, and how they were answered. Watch the unanswered count
          and the number of professionals available: if availability drops to zero, urgent requests
          fall back to reaching every registered lawyer and firm.
        </p>
      </header>

      {overview.availableLawyers === 0 && overview.designatedContacts === 0 ? (
        <Alert tone="warning" title="Nobody is available for emergencies">
          No lawyer has turned emergency availability on and no firm has named an emergency contact.
          Urgent requests raised now are sent to every registered lawyer and firm instead.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Open, unanswered', value: overview.open },
          { label: 'Taken', value: overview.accepted },
          { label: 'Expired unanswered', value: overview.expired },
          { label: 'Lawyers on call', value: overview.availableLawyers },
          { label: 'Firm emergency contacts', value: overview.designatedContacts },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {answerRate !== null ? (
        <Card>
          <p className="text-sm text-slate-600">Answer rate</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{answerRate}%</p>
          <p className="mt-1 text-xs text-slate-500">
            Of {total} request{total === 1 ? '' : 's'} raised, {answered} were taken before they
            expired.
          </p>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Recent requests ({overview.recent.length})</h2>
        {overview.recent.length === 0 ? (
          <p className="text-sm text-slate-600">No urgent requests have been raised.</p>
        ) : (
          <ul className="space-y-3">
            {overview.recent.map((item) => (
              <Card as="li" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">{item.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {LEGAL_AREA_LABEL[item.caseType] ?? item.caseType} · raised{' '}
                      {formatDateTime(item.createdAt)} · call-back {maskPhone(item.contactPhone)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      By{' '}
                      {item.client
                        ? item.client.profile?.fullName?.trim() || item.client.email
                        : `${item.guestName ?? 'A member of the public'} (no account)`}
                      {item.acceptedBy
                        ? ` · taken by ${
                            item.acceptedBy.profile?.fullName?.trim() || item.acceptedBy.email
                          } at ${formatDateTime(item.acceptedAt)}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.legalCase ? (
                      <Link
                        href={`/admin/cases/${item.legalCase.id}`}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        {item.legalCase.reference}
                      </Link>
                    ) : null}
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                        STATUS_STYLE[item.status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
                      }`}
                    >
                      {item.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** An operator has no reason to hold somebody's full phone number. */
function maskPhone(phone: string): string {
  if (phone.length <= 4) return '•••';
  return `${'•'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}
