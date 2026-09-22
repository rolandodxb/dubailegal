import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import { listClientsForLawyer } from '@/server/services/case-service';
import { LEGAL_AREA_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { Avatar } from '@/components/Avatar';
import { CaseStatusChip } from '@/components/cases/CaseStatusChip';
import { buttonClasses, Card, EmptyState } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Clients' };

/**
 * One card per client, with every case they have with this practice. This is
 * the contact book behind the calendar, which only offers clients who appear
 * here.
 */
export default async function ClientsPage() {
  const user = await requireProfessional();
  const clients = await listClientsForLawyer(user.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Everyone you have an accepted case with. Open a client to see their details and the cases
          you share, or book a meeting from the calendar.
        </p>
      </header>

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="A client appears here once you accept a case from them."
          action={
            <Link href="/pending" className={buttonClasses('primary', 'md')}>
              Cases pending review
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {clients.map((entry) => {
            const name = entry.client.profile?.fullName?.trim() || entry.client.email;
            return (
              <Card as="li" key={entry.client.id}>
                <div className="flex items-start gap-3">
                  <Avatar
                    userId={entry.client.id}
                    name={name}
                    hasPhoto={Boolean(entry.client.profile?.avatarDocumentId)}
                    size={48}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-900">{name}</h2>
                    <p className="text-xs text-slate-500">{entry.client.email}</p>
                    {entry.client.profile?.phone ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Phone {entry.client.profile.phone}
                      </p>
                    ) : null}
                    {entry.client.profile?.countryOfResidence ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Resident in {entry.client.profile.countryOfResidence}
                      </p>
                    ) : null}
                  </div>
                </div>

                {entry.client.profile?.workDescription ? (
                  <p className="mt-3 text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Work: </span>
                    {entry.client.profile.workDescription}
                  </p>
                ) : null}

                <h3 className="mt-4 text-xs font-medium text-slate-700">
                  Cases ({entry.cases.length})
                </h3>
                <ul className="mt-2 divide-y divide-slate-100">
                  {entry.cases.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-slate-800">{item.title}</span>
                        <span className="block text-xs text-slate-500">
                          {item.reference} ·{' '}
                          {LEGAL_AREA_LABEL[item.caseType as keyof typeof LEGAL_AREA_LABEL] ??
                            item.caseType}{' '}
                          · updated {formatDateTime(item.updatedAt)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <CaseStatusChip status={item.status} />
                        <Link
                          href={`/cases/${item.id}`}
                          className="text-xs font-medium text-brand-700 hover:underline"
                        >
                          Open
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
