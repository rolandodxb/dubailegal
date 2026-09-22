import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import { firmCaseOversight } from '@/server/services/firm-service';
import { LEGAL_AREA_LABEL } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/format';
import { formatUaeDateTime } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import { CaseStatusChip } from '@/components/cases/CaseStatusChip';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Practice oversight' };

/**
 * What a firm administrator oversees: every case the firm holds, which lawyer
 * is on it, how far each has got, and the firm's diary.
 *
 * Read-only with respect to the case lifecycle — acceptance and progress belong
 * to the lawyer who took the case.
 */
export default async function FirmOversightPage() {
  const user = await requireProfessional();

  if (user.accountType !== 'FIRM') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Practice oversight</h1>
        <Card>
          <p className="text-sm text-slate-700">
            This page is for legal-firm administrator accounts. Your own cases are under{' '}
            <Link href="/portfolio" className="font-medium text-brand-700 hover:underline">
              My portfolio
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  const oversight = await firmCaseOversight(user.id);
  if (!oversight) {
    return (
      <Alert tone="error" title="Firm record missing">
        Your firm registration details could not be loaded. Please add them under Legal details.
      </Alert>
    );
  }

  const { firm, cases, perLawyer, upcoming, unassigned } = oversight;

  const openTotal = perLawyer.reduce((total, entry) => total + entry.open.length, 0);
  const completedTotal = perLawyer.reduce((total, entry) => total + entry.completed.length, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Practice oversight</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every case {firm.legalName} holds, which lawyer is working it, how far each has got, and the
          firm&rsquo;s diary. Supervision only — accepting and progressing a case stays with the
          lawyer who took it.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Lawyers registered', value: perLawyer.length },
          { label: 'Cases in progress', value: openTotal },
          { label: 'Completed cases', value: completedTotal },
          { label: 'Awaiting a lawyer', value: unassigned.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {unassigned.length > 0 ? (
        <Alert tone="warning" title={`${unassigned.length} case(s) still need a lawyer`}>
          A firm account cannot accept a case — one of your registered lawyers must. They are listed
          under{' '}
          <Link href="/firm/lawyers" className="font-medium underline">
            Lawyers registered
          </Link>
          .
        </Alert>
      ) : null}

      {/* ── Per lawyer ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Your lawyers and their caseload</h2>
        {perLawyer.length === 0 ? (
          <EmptyState
            title="No lawyers registered yet"
            description="Register your professionals so they can take cases submitted to the firm."
            action={
              <Link href="/firm/lawyers" className={buttonClasses('primary', 'md')}>
                Register a professional
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {perLawyer.map((entry) => {
              const name =
                entry.lawyer.user.profile?.fullName?.trim() || entry.lawyer.user.email;
              return (
                <Card as="li" key={entry.lawyer.id}>
                  <div className="flex items-start gap-3">
                    <Avatar
                      userId={entry.lawyer.user.id}
                      name={name}
                      hasPhoto={Boolean(entry.lawyer.user.profile?.avatarDocumentId)}
                      size={48}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900">{name}</h3>
                      <p className="text-xs text-slate-500">{entry.lawyer.user.email}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Licence {entry.lawyer.licenseNumber}
                        {entry.lawyer.licenseExpiresOn
                          ? ` · valid until ${formatDate(entry.lawyer.licenseExpiresOn)}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-xs">
                    <div>
                      <dt className="text-slate-600">Open</dt>
                      <dd className="text-lg font-semibold text-slate-900">{entry.open.length}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-600">Completed</dt>
                      <dd className="text-lg font-semibold text-slate-900">
                        {entry.completed.length}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-600">Meetings ahead</dt>
                      <dd className="text-lg font-semibold text-slate-900">{entry.meetings}</dd>
                    </div>
                  </dl>

                  {entry.open.length > 0 ? (
                    <ul className="mt-3 divide-y divide-slate-100">
                      {entry.open.slice(0, 4).map((item) => (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-slate-800">
                              {item.title}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {item.reference} ·{' '}
                              {item.client.profile?.fullName?.trim() || item.client.email}
                            </span>
                          </span>
                          <CaseStatusChip status={item.status} />
                        </li>
                      ))}
                      {entry.open.length > 4 ? (
                        <li className="pt-2 text-xs text-slate-500">
                          +{entry.open.length - 4} more open case(s)
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">No open cases right now.</p>
                  )}
                </Card>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Diary ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Firm diary</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-600">No meetings are booked across the firm.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {upcoming.map((appointment) => (
              <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {formatUaeDateTime(appointment.startsAt)}
                  </p>
                  <p className="text-xs text-slate-600">
                    {appointment.client.profile?.fullName?.trim() || appointment.client.email} with{' '}
                    {appointment.lawyer.user.profile?.fullName?.trim() || 'a lawyer'}
                    {appointment.case ? ` · ${appointment.case.reference}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">
          A lawyer books into their own diary from{' '}
          <Link href="/calendar" className="font-medium text-brand-700 hover:underline">
            the calendar
          </Link>
          . This list is for supervision.
        </p>
      </section>

      {/* ── All cases ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">All cases at the firm ({cases.length})</h2>
        {cases.length === 0 ? (
          <p className="text-sm text-slate-600">
            No cases have been submitted to {firm.legalName} yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-3xl text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Reference</th>
                  <th className="px-3 py-2 font-medium">Case</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Lawyer</th>
                  <th className="px-3 py-2 font-medium">Progress</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">
                      {item.reference}
                    </td>
                    <td className="max-w-56 px-3 py-2">
                      <span className="block truncate text-slate-800">{item.title}</span>
                      <span className="block text-xs text-slate-500">
                        {LEGAL_AREA_LABEL[item.caseType] ?? item.caseType} ·{' '}
                        {item._count.files} file(s) · {item._count.messages} message(s)
                      </span>
                    </td>
                    <td className="max-w-40 truncate px-3 py-2 text-xs text-slate-600">
                      {item.client.profile?.fullName?.trim() || item.client.email}
                    </td>
                    <td className="max-w-40 truncate px-3 py-2 text-xs text-slate-600">
                      {item.lawyer
                        ? item.lawyer.user.profile?.fullName?.trim() || item.lawyer.user.email
                        : item.status === 'DECLINED'
                          ? '—'
                          : 'Awaiting a lawyer'}
                    </td>
                    <td className="px-3 py-2">
                      <CaseStatusChip status={item.status} />
                      {item.assignedAt ? (
                        <span className="mt-1 block text-xs text-slate-500">
                          assigned {formatDate(item.assignedAt)}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                      {formatDateTime(item.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
