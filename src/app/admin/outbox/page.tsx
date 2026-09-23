import type { Metadata } from 'next';
import { requireReviewer } from '@/lib/auth';
import { getAuditTrail, listOutbox } from '@/server/services/admin-service';
import { env } from '@/lib/env';
import { formatDateTime } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { Alert, Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.outbox.title };
}

export default async function OutboxPage() {
  const [{ t }] = await Promise.all([getI18n(), requireReviewer()]);
  const [{ rows, counts }, auditTrail] = await Promise.all([listOutbox(50), getAuditTrail(40)]);

  const statusLabel: Record<string, string> = t.admin.outbox.status;
  const purposeLabel: Record<string, string> = t.admin.outbox.purpose;
  const actionLabel: Record<string, string> = t.admin.traffic.action;

  const queued = counts.find((entry) => entry.status === 'QUEUED')?._count._all ?? 0;
  const sent = counts.find((entry) => entry.status === 'SENT')?._count._all ?? 0;
  const failed = counts.find((entry) => entry.status === 'FAILED')?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.admin.outbox.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.outbox.intro}</p>
      </header>

      <Alert tone="warning" title={`${t.admin.outbox.deliveryProvider}: ${env.emailProvider}`}>
        {env.emailProvider === 'outbox'
          ? t.admin.outbox.noProviderBody
          : t.admin.outbox.transportBody.replace('{provider}', env.emailProvider)}
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t.admin.outbox.stats.recordedNotSent, value: queued },
          { label: t.admin.outbox.stats.sent, value: sent },
          { label: t.admin.outbox.stats.failed, value: failed },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.admin.outbox.messagesHeading} ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">{t.admin.outbox.noMessages}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((message) => (
              <Card as="li" key={message.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">{message.subject}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.admin.outbox.to} {message.toEmail} ·{' '}
                      {purposeLabel[message.purpose] ??
                        message.purpose.replace(/_/g, ' ').toLowerCase()}{' '}
                      · {formatDateTime(message.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      message.status === 'SENT'
                        ? 'bg-green-50 text-green-800 ring-green-200'
                        : message.status === 'FAILED'
                          ? 'bg-red-50 text-red-800 ring-red-200'
                          : 'bg-amber-50 text-amber-900 ring-amber-200'
                    }`}
                  >
                    {statusLabel[message.status] ?? message.status.toLowerCase()}
                  </span>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-brand-700">
                    {t.admin.outbox.showFullMessage}
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                    {message.bodyText}
                  </pre>
                </details>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">{t.admin.outbox.auditTrailHeading}</h2>
        <p className="mb-3 text-sm text-slate-600">{t.admin.outbox.auditTrailIntro}</p>
        {auditTrail.length === 0 ? (
          <p className="text-sm text-slate-600">{t.admin.outbox.noAudit}</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {auditTrail.map((entry) => (
              <li key={entry.id} className="px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-900">
                    <span className="font-mono text-xs">
                      {actionLabel[entry.action] ?? entry.action}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">
                      {entry.entityType}
                      {entry.entityId ? ` ${entry.entityId.slice(0, 10)}…` : ''}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {entry.actor?.email ?? t.admin.outbox.system} · {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
