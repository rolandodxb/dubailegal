import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { emergencyOverview } from '@/server/services/admin-service';
import { getI18n } from '@/lib/i18n';
import { legalAreaLabel } from '@/lib/i18n/labels';
import { formatDateTime } from '@/lib/format';
import { Alert, Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.emergencies };
}

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
  const [{ t }, overview] = await Promise.all([getI18n(), emergencyOverview()]);

  const statusLabel: Record<string, string> = t.admin.emergency.status;

  const answered = overview.accepted;
  const total = answered + overview.expired + overview.open;
  const answerRate = total === 0 ? null : Math.round((answered / total) * 100);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.emergencies}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.emergency.intro}</p>
      </header>

      {overview.availableLawyers === 0 && overview.designatedContacts === 0 ? (
        <Alert tone="warning" title={t.admin.emergency.alertTitle}>
          {t.admin.emergency.alertBody}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: t.admin.emergency.stats.open, value: overview.open },
          { label: t.admin.emergency.stats.taken, value: overview.accepted },
          { label: t.admin.emergency.stats.expired, value: overview.expired },
          { label: t.admin.emergency.stats.lawyersOnCall, value: overview.availableLawyers },
          { label: t.admin.emergency.stats.firmContacts, value: overview.designatedContacts },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {answerRate !== null ? (
        <Card>
          <p className="text-sm text-slate-600">{t.admin.emergency.answerRate}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{answerRate}%</p>
          <p className="mt-1 text-xs text-slate-500">
            {(total === 1 ? t.admin.emergency.answerRateOne : t.admin.emergency.answerRateMany)
              .replace('{total}', String(total))
              .replace('{answered}', String(answered))}
          </p>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.admin.emergency.recentRequests.replace('{count}', String(overview.recent.length))}
        </h2>
        {overview.recent.length === 0 ? (
          <p className="text-sm text-slate-600">{t.admin.emergency.empty}</p>
        ) : (
          <ul className="space-y-3">
            {overview.recent.map((item) => (
              <Card as="li" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">{item.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {legalAreaLabel(t, item.caseType)} · {t.admin.emergency.raised}{' '}
                      {formatDateTime(item.createdAt)} · {t.admin.emergency.callBack}{' '}
                      {maskPhone(item.contactPhone)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {t.admin.emergency.by}{' '}
                      {item.client
                        ? item.client.profile?.fullName?.trim() || item.client.email
                        : `${item.guestName ?? t.admin.emergency.memberOfPublic} ${t.admin.emergency.noAccount}`}
                      {item.acceptedBy
                        ? ` · ${t.admin.emergency.takenBy} ${
                            item.acceptedBy.profile?.fullName?.trim() || item.acceptedBy.email
                          } ${t.admin.emergency.at} ${formatDateTime(item.acceptedAt)}`
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
                      {statusLabel[item.status] ?? item.status.toLowerCase()}
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
