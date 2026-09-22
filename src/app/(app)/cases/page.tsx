import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { listCasesForClient, listCasesForLawyer, unreadMessageCountsByCase } from '@/server/services/case-service';
import { listAppointmentsForClient } from '@/server/services/appointment-service';
import { formatUaeDateTime } from '@/lib/time';
import { buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import { CaseCard } from '@/components/cases/CaseCard';
import { CancelAppointmentButton } from '@/components/forms/AppointmentButtons';
import { OfficeRequestActions } from '@/components/forms/OfficeRequestActions';

export const metadata: Metadata = { title: 'My cases' };

/**
 * What a client sees: every case they have sent, its current state, and the
 * meetings booked with them.
 */
export default async function CasesPage() {
  const user = await requireMember();

  const isProfessional = user.accountType === 'LAWYER' || user.accountType === 'FIRM';

  const [cases, appointments, lawyerCases, unread] = await Promise.all([
    listCasesForClient(user.id),
    listAppointmentsForClient(user.id),
    isProfessional ? listCasesForLawyer(user.id) : Promise.resolve(null),
    unreadMessageCountsByCase(user.id),
  ]);

  const upcoming = appointments.filter(
    (item) => item.status === 'BOOKED' && item.startsAt.getTime() >= Date.now(),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">My cases</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Every case you have sent through the directory, with its current status. Open one to read
          the description you sent, share files and message the professional.
        </p>
      </header>

      {upcoming.length > 0 ? (
        <Card>
          <h2 className="font-semibold text-slate-900">Meetings and requests</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {upcoming.map((appointment) => {
              const professional =
                appointment.lawyer.user.profile?.fullName?.trim() ||
                appointment.firm?.legalName ||
                appointment.lawyer.user.email;
              const awaitingAnswer =
                appointment.mode === 'OFFICE_VISIT' && appointment.confirmation === 'PENDING';

              return (
                <li key={appointment.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {formatUaeDateTime(appointment.startsAt)}
                      </p>
                      <p className="text-xs text-slate-600">
                        With {professional}
                        {appointment.case ? ` · case ${appointment.case.reference}` : ''}
                      </p>

                      {appointment.mode === 'OFFICE_VISIT' ? (
                        <p className="mt-1 text-xs text-slate-600">
                          At the office: {appointment.officeAddress ?? 'address not given'}
                        </p>
                      ) : appointment.mode === 'VIDEO_CALL' ? (
                        <p className="mt-1 text-xs text-slate-600">Video call</p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-600">Phone call</p>
                      )}

                      {appointment.note ? (
                        <p className="mt-1 text-xs text-slate-500">{appointment.note}</p>
                      ) : null}
                    </div>

                    <div className="shrink-0">
                      {appointment.status === 'CANCELLED' ? (
                        <span className="text-xs text-slate-500">Cancelled</span>
                      ) : awaitingAnswer ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                          Awaiting your answer
                        </span>
                      ) : appointment.confirmation === 'DECLINED' ? (
                        <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200">
                          You declined
                        </span>
                      ) : appointment.confirmation === 'ACCEPTED' ? (
                        <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 ring-1 ring-inset ring-green-200">
                          You confirmed
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {appointment.mode === 'VIDEO_CALL' && appointment.roomCode ? (
                      <Link
                        href={`/rooms/${appointment.roomCode}`}
                        className={buttonClasses('primary', 'sm')}
                      >
                        Join the conference room
                      </Link>
                    ) : null}
                    {appointment.status === 'BOOKED' ? (
                      <CancelAppointmentButton appointmentId={appointment.id} />
                    ) : null}
                  </div>

                  {awaitingAnswer ? (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs text-amber-900">
                        {professional} has asked you to come to the office. Let them know whether you
                        can attend.
                      </p>
                      <OfficeRequestActions appointmentId={appointment.id} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Cases I submitted ({cases.length})</h2>
        {cases.length === 0 ? (
          <EmptyState
            title="You have not sent a case yet"
            description="Find a lawyer or legal firm in the directory, open their profile and choose “Get in touch” to send your first case."
            action={
              <Link href="/directory" className={buttonClasses('primary', 'md')}>
                Browse the directory
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {cases.map((item) => (
              <CaseCard key={item.id} item={item} perspective="client" unreadCount={unread.get(item.id) ?? 0} />
            ))}
          </ul>
        )}
      </section>

      {isProfessional && lawyerCases ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">Cases sent to me</h2>
          {lawyerCases.pending.length + lawyerCases.reviewing.length + lawyerCases.portfolio.length === 0 ? (
            <p className="text-sm text-slate-600">
              No cases have been sent to you yet.{' '}
              <Link href="/pending" className="font-medium text-brand-700 hover:underline">
                Cases pending review
              </Link>{' '}
              will list them as they arrive.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {[...lawyerCases.pending, ...lawyerCases.reviewing, ...lawyerCases.portfolio].map(
                (item) => (
                  <CaseCard
                    key={item.id}
                    item={item}
                    perspective="professional"
                    unreadCount={unread.get(item.id) ?? 0}
                  />
                ),
              )}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
