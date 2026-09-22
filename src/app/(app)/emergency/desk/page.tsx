import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import {
  emergencyStanding,
  listOpenEmergencies,
  listTakenEmergencies,
} from '@/server/services/emergency-service';
import { LEGAL_AREA_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { Avatar } from '@/components/Avatar';
import { VerificationStatusPill } from '@/components/VerificationBadge';
import { CaseStatusChip } from '@/components/cases/CaseStatusChip';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';
import {
  AcceptEmergencyForm,
  CloseEmergencyForm,
  EmergencyAvailabilityForm,
  EmergencyNoteForm,
} from '@/components/forms/EmergencyForms';

export const metadata: Metadata = { title: 'Emergency desk' };

/**
 * The emergency desk, for lawyers and firms only.
 *
 * A professional sees the queue of people asking for urgent help and takes one,
 * which opens and assigns a real case. There is deliberately no request form on
 * this screen: raising an urgent request is something a person needing a lawyer
 * does, and a lawyer filling one in would be asking themselves for help. The two
 * sides of the emergency system are kept apart, and that is enforced here on the
 * server as well as in the navigation.
 */
export default async function EmergencyDeskPage() {
  const user = await requireProfessional();
  const isFirm = user.accountType === 'FIRM';

  const [queue, taken, standing] = await Promise.all([
    listOpenEmergencies(),
    listTakenEmergencies(user.id),
    emergencyStanding(user.id),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700">
            <Icon name="alert" size={18} />
          </span>
          <h1 className="text-2xl font-semibold text-slate-900">Emergency desk</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          People asking for urgent legal help appear here, and are pushed to every professional who
          has opted into emergencies. The first to take one has a case opened and assigned to them.
          Nothing is dispatched to the police, an ambulance or the fire service — that is 999.
        </p>
      </header>

      <Alert tone="info" title="You are seeing the professional side">
        This page shows urgent requests to answer. It is not the form for asking for help: the public
        emergency page is for people who need a lawyer, and it is open to anyone without an account.
      </Alert>

      {/* ── The queue ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          Open urgent requests ({queue.length})
        </h2>
        {queue.length === 0 ? (
          <EmptyState
            title="No open urgent requests"
            description="When somebody raises an emergency, it appears here and is pushed to the professionals who take them."
          />
        ) : (
          <ul className="space-y-3">
            {queue.map((item) => {
              // A request raised without an account has no client record; the
              // name and number they gave stand in for it.
              const clientName = item.client
                ? item.client.profile?.fullName?.trim() || item.client.email
                : `${item.guestName ?? 'A member of the public'} (no account)`;
              return (
                <Card as="li" key={item.id} className="border-red-200">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200">
                          Urgent
                        </span>
                        <h3 className="font-medium text-slate-900">{item.title}</h3>
                      </div>

                      <div className="mt-3 flex items-start gap-3">
                        {item.client ? (
                          <Avatar
                            userId={item.client.id}
                            name={clientName}
                            hasPhoto={Boolean(item.client.profile?.avatarDocumentId)}
                            size={40}
                          />
                        ) : (
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                            <Icon name="alert" size={18} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{clientName}</p>
                          <p className="text-xs text-slate-500">
                            {LEGAL_AREA_LABEL[item.caseType] ?? item.caseType}
                            {item.client?.profile?.countryOfResidence
                              ? ` · ${item.client.profile.countryOfResidence}`
                              : ''}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            Call back: {item.contactPhone}
                          </p>
                        </div>
                      </div>

                      {item.roomCode ? (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                          <p className="text-xs text-red-900">
                            They are already waiting in a video room. Joining it answers the
                            emergency and records you as the lawyer who took it.
                          </p>
                          <Link
                            href={`/rooms/${item.roomCode}`}
                            className={buttonClasses('primary', 'sm', 'mt-2')}
                          >
                            Join the call now
                          </Link>
                        </div>
                      ) : null}

                      <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
                        {item.description}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Raised {formatDateTime(item.createdAt)} · offered until{' '}
                        {formatDateTime(item.expiresAt)}
                      </p>
                    </div>

                    <div className="shrink-0 space-y-2 text-right">
                      {item.client ? (
                        <VerificationStatusPill
                          accountType={item.client.accountType}
                          status={item.client.verificationStatus}
                        />
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                          No account
                        </span>
                      )}
                      {item.roomCode ? null : <AcceptEmergencyForm requestId={item.id} />}
                    </div>
                  </div>
                </Card>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Availability ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">My emergency availability</h2>
        <Card>
          {isFirm ? (
            <>
              <p className="text-sm text-slate-600">
                A firm account does not take emergency calls itself — one of your lawyers does. Name
                a lawyer as your firm&rsquo;s emergency contact and urgent requests that reach{' '}
                {standing?.firm?.legalName} are assigned to them directly.
              </p>
              {standing?.firm?.lawyers.length ? (
                <p className="mt-3 text-sm text-slate-800">
                  Current emergency contact:{' '}
                  <strong>
                    {standing.firm.lawyers[0]!.user.profile?.fullName?.trim() ||
                      standing.firm.lawyers[0]!.user.email}
                  </strong>
                </p>
              ) : (
                <p className="mt-3 text-sm text-amber-800">
                  No emergency contact is designated. Until one is, urgent requests to your firm sit
                  in the queue like any other case.
                </p>
              )}
              <div className="mt-4">
                <Link href="/firm/lawyers" className={buttonClasses('secondary', 'md')}>
                  Manage in Lawyers registered
                </Link>
              </div>
            </>
          ) : standing?.lawyer ? (
            <>
              <p className="mb-4 text-sm text-slate-600">
                Turning this on means urgent requests are pushed to you directly, at any hour. Only do
                so if you can answer.
              </p>
              <EmergencyAvailabilityForm
                accepts={standing.lawyer.acceptsEmergency}
                note={standing.lawyer.emergencyNote}
              />
              {standing.lawyer.acceptsEmergency ? (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <EmergencyNoteForm note={standing.lawyer.emergencyNote} />
                </div>
              ) : null}
              {standing.lawyer.isFirmEmergency ? (
                <p className="mt-4 text-xs text-slate-500">
                  You are also your firm&rsquo;s designated emergency contact.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-600">
              Emergency availability is set on a lawyer profile.
            </p>
          )}
        </Card>
      </section>

      {taken.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            Urgent requests I took ({taken.length})
          </h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {taken.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.client
                      ? item.client.profile?.fullName?.trim() || item.client.email
                      : item.guestName ?? 'A member of the public'}{' '}
                    · taken {formatDateTime(item.acceptedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {item.legalCase ? <CaseStatusChip status={item.legalCase.status} /> : null}
                  {item.legalCase ? (
                    <Link
                      href={`/cases/${item.legalCase.id}`}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      Open case
                    </Link>
                  ) : null}
                  {item.status === 'ACCEPTED' ? <CloseEmergencyForm requestId={item.id} /> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
