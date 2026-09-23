import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
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
  const [{ t }, user] = await Promise.all([getI18n(), requireMember()]);
  const labels = t.memberCases.cases;

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
        <h1 className="text-2xl font-semibold text-slate-900">{labels.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{labels.intro}</p>
      </header>

      {upcoming.length > 0 ? (
        <Card>
          <h2 className="font-semibold text-slate-900">{labels.meetingsAndRequests}</h2>
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
                        {labels.withProfessional.replace('{name}', professional)}
                        {appointment.case
                          ? labels.caseReference.replace('{reference}', appointment.case.reference)
                          : ''}
                      </p>

                      {appointment.mode === 'OFFICE_VISIT' ? (
                        <p className="mt-1 text-xs text-slate-600">
                          {labels.atTheOffice.replace(
                            '{address}',
                            appointment.officeAddress ?? labels.addressNotGiven,
                          )}
                        </p>
                      ) : appointment.mode === 'VIDEO_CALL' ? (
                        <p className="mt-1 text-xs text-slate-600">{labels.videoCall}</p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-600">{labels.phoneCall}</p>
                      )}

                      {appointment.note ? (
                        <p className="mt-1 text-xs text-slate-500">{appointment.note}</p>
                      ) : null}
                    </div>

                    <div className="shrink-0">
                      {appointment.status === 'CANCELLED' ? (
                        <span className="text-xs text-slate-500">{labels.cancelled}</span>
                      ) : awaitingAnswer ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                          {labels.awaitingYourAnswer}
                        </span>
                      ) : appointment.confirmation === 'DECLINED' ? (
                        <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200">
                          {labels.youDeclined}
                        </span>
                      ) : appointment.confirmation === 'ACCEPTED' ? (
                        <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 ring-1 ring-inset ring-green-200">
                          {labels.youConfirmed}
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
                        {labels.joinConferenceRoom}
                      </Link>
                    ) : null}
                    {appointment.status === 'BOOKED' ? (
                      <CancelAppointmentButton
                        appointmentId={appointment.id}
                        labels={t.memberCases.appointment}
                      />
                    ) : null}
                  </div>

                  {awaitingAnswer ? (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs text-amber-900">
                        {labels.officeRequest.replace('{name}', professional)}
                      </p>
                      <OfficeRequestActions
                        appointmentId={appointment.id}
                        labels={t.memberCore.officeRequest}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {labels.submittedHeading.replace('{count}', String(cases.length))}
        </h2>
        {cases.length === 0 ? (
          <EmptyState
            title={t.dashboard.noCasesYet}
            description={labels.emptyDescription}
            action={
              <Link href="/directory" className={buttonClasses('primary', 'md')}>
                {t.dashboard.browseDirectory}
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
          <h2 className="mb-3 font-semibold text-slate-900">{labels.sentToMe}</h2>
          {lawyerCases.pending.length + lawyerCases.reviewing.length + lawyerCases.portfolio.length === 0 ? (
            <p className="text-sm text-slate-600">
              {labels.noCasesSent}{' '}
              <Link href="/pending" className="font-medium text-brand-700 hover:underline">
                {t.items.pending}
              </Link>{' '}
              {labels.pendingWillList}
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
