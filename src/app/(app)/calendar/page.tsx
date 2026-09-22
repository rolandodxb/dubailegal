import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import {
  BOOKABLE_HOURS,
  diaryScope,
  listAppointmentsInRange,
  listBookableClients,
  listDaySlots,
  listFirmDiaries,
} from '@/server/services/appointment-service';
import {
  addDaysToKey,
  addMonthsToKey,
  formatDateKey,
  formatDateKeyShort,
  formatUaeTime,
  isSameMonth,
  monthGridKeys,
  monthLabel,
  todayKey,
  toUaeDateKey,
  toUaeHour,
  weekKeysFrom,
  startOfWeekKey,
} from '@/lib/time';
import { Alert, buttonClasses, Card, cx } from '@/components/ui/primitives';
import { getAvailability, isEnabled } from '@/lib/availability';
import { BookingForm } from '@/components/forms/BookingForm';
import {
  CancelAppointmentButton,
  DeleteAppointmentButton,
  RescheduleAppointmentForm,
} from '@/components/forms/AppointmentButtons';

export const metadata: Metadata = { title: 'Calendar' };

type View = 'month' | 'week' | 'day';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MODE_LABEL: Record<string, string> = {
  VIDEO_CALL: 'Video call',
  OFFICE_VISIT: 'Office visit',
  PHONE_CALL: 'Phone call',
};

function shell(view: View, anchorKey: string): string {
  return `/calendar?view=${view}&date=${anchorKey}`;
}

/**
 * The diary.
 *
 * A lawyer sees and manages their own. A firm sees every diary held by the
 * lawyers registered with it, because overseeing the practice means being able to
 * move a meeting when a lawyer is in court or unwell. Either way the month, week
 * and day views are plain links carrying the view and date in the URL, so the
 * calendar works without JavaScript.
 *
 * Every change here notifies the client. Deleting does not, and the button says
 * so — that is the difference between calling a meeting off and pretending it was
 * never arranged.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const user = await requireProfessional();
  const [params, availability, scope] = await Promise.all([
    searchParams,
    getAvailability(),
    diaryScope(user.id),
  ]);
  const canBook = isEnabled(availability.settings, 'feature.appointments');

  const view: View = params.view === 'week' || params.view === 'day' ? params.view : 'month';
  const today = todayKey();
  const anchorKey = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? (params.date as string) : today;

  if (scope.lawyerIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Calendar</h1>
        <Card>
          <p className="text-sm text-slate-700">
            A diary belongs to a lawyer profile. {scope.isFirm ? 'Your firm has no lawyer registered yet, so' : 'This account does not have one, so'} there is nothing
            to schedule here.{' '}
            {scope.isFirm
              ? 'Register a lawyer and their diary appears on this calendar.'
              : 'Meetings are booked by the lawyers registered with your firm.'}
          </p>
          <Link
            href={scope.isFirm ? '/firm/lawyers' : '/dashboard'}
            className={buttonClasses('secondary', 'md', 'mt-4')}
          >
            {scope.isFirm ? 'Manage lawyers registered' : 'Back to my dashboard'}
          </Link>
        </Card>
      </div>
    );
  }

  // Range depends on the view.
  const rangeStart =
    view === 'month' ? monthGridKeys(anchorKey)[0] : view === 'week' ? startOfWeekKey(anchorKey) : anchorKey;
  const rangeEnd =
    view === 'month' ? addDaysToKey(rangeStart, 41) : view === 'week' ? addDaysToKey(rangeStart, 6) : anchorKey;

  const [appointments, firmDiaries, booking] = await Promise.all([
    listAppointmentsInRange(scope.lawyerIds, rangeStart, rangeEnd),
    scope.isFirm && scope.firmId ? listFirmDiaries(scope.firmId) : Promise.resolve([]),
    scope.lawyerProfileId ? listBookableClients(user.id) : Promise.resolve(null),
  ]);

  // A firm sees one row per lawyer; a lawyer sees only their own, so the name is
  // redundant and is left out.
  const lawyerName = new Map(
    firmDiaries.map((entry) => [
      entry.id,
      entry.user.profile?.fullName?.trim() || entry.user.email,
    ]),
  );

  // Day view availability. A firm gets each of its diaries side by side.
  const slotsByLawyer =
    view === 'day'
      ? await Promise.all(
          (scope.isFirm ? scope.lawyerIds.slice(0, 25) : scope.lawyerIds).map(async (id) => ({
            lawyerId: id,
            name: lawyerName.get(id) ?? null,
            slots: await listDaySlots(id, anchorKey),
          })),
        )
      : [];

  // Grouped by UAE calendar date, never by the server's own timezone.
  const appointmentsByDay = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const key = toUaeDateKey(appointment.startsAt);
    const list = appointmentsByDay.get(key) ?? [];
    list.push(appointment);
    appointmentsByDay.set(key, list);
  }

  const selectedAppointments = appointmentsByDay.get(anchorKey) ?? [];
  // The booking form is for the signer's own diary, so its free hours come from
  // that diary even when the account also oversees a whole firm.
  const ownSlots =
    slotsByLawyer.find((entry) => entry.lawyerId === scope.lawyerProfileId)?.slots ?? [];
  const freeHours = ownSlots
    .filter((slot) => !slot.taken)
    .map((slot) => ({ hour: slot.hour, label: slot.label }));
  const takenSlots = ownSlots.filter((slot) => slot.taken);

  const heading =
    view === 'month'
      ? monthLabel(anchorKey)
      : view === 'week'
        ? `Week of ${formatDateKey(startOfWeekKey(anchorKey))}`
        : formatDateKey(anchorKey);

  const step = view === 'month' ? 1 : view === 'week' ? 7 : 1;
  const previousAnchor = view === 'month' ? addMonthsToKey(anchorKey, -1) : addDaysToKey(anchorKey, -step);
  const nextAnchor = view === 'month' ? addMonthsToKey(anchorKey, 1) : addDaysToKey(anchorKey, step);

  const clientName = (appointment: (typeof appointments)[number]) =>
    appointment.client.profile?.fullName?.trim() || appointment.client.email;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Calendar</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            {scope.isFirm
              ? `Every diary held by your firm\u2019s lawyers, in UAE time. You can move, cancel or delete any of these meetings — the client is told about everything except a deletion.`
              : 'Your diary in UAE time. Pick a day, choose a free hour and register the booking — the client is alerted straight away. You can also move, cancel or delete a meeting you already have.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Calendar view">
          {(['month', 'week', 'day'] as View[]).map((option) => (
            <Link
              key={option}
              href={shell(option, anchorKey)}
              aria-current={view === option ? 'page' : undefined}
              className={buttonClasses(view === option ? 'primary' : 'secondary', 'sm')}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </Link>
          ))}
        </div>
      </header>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href={shell(view, previousAnchor)} className={buttonClasses('secondary', 'sm')}>
              ← Previous
            </Link>
            <Link href={shell(view, today)} className={buttonClasses('ghost', 'sm')}>
              Today
            </Link>
            <Link href={shell(view, nextAnchor)} className={buttonClasses('secondary', 'sm')}>
              Next →
            </Link>
          </div>
          <h2 className="font-semibold text-slate-900">{heading}</h2>
        </div>

        {view === 'month' ? (
          <div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-2">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGridKeys(anchorKey).map((key) => {
                const items = appointmentsByDay.get(key) ?? [];
                const inMonth = isSameMonth(key, anchorKey);
                const isToday = key === today;
                const isSelected = key === anchorKey;
                return (
                  <Link
                    key={key}
                    href={shell('day', key)}
                    className={cx(
                      'min-h-20 rounded-lg border p-1.5 text-left transition-colors hover:border-brand-400',
                      inMonth ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50',
                      isSelected && 'ring-2 ring-brand-600',
                    )}
                  >
                    <span
                      className={cx(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                        isToday
                          ? 'bg-brand-700 font-semibold text-white'
                          : inMonth
                            ? 'text-slate-700'
                            : 'text-slate-400',
                      )}
                    >
                      {Number(key.slice(8, 10))}
                    </span>
                    <span className="mt-1 block space-y-0.5">
                      {items.slice(0, 2).map((appointment) => (
                        <span
                          key={appointment.id}
                          className="block truncate rounded bg-brand-50 px-1 py-0.5 text-[10px] text-brand-800"
                        >
                          {formatUaeTime(appointment.startsAt)} {clientName(appointment)}
                        </span>
                      ))}
                      {items.length > 2 ? (
                        <span className="block text-[10px] text-slate-500">
                          +{items.length - 2} more
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {view === 'week' ? (
          <div className="grid gap-2 sm:grid-cols-7">
            {weekKeysFrom(startOfWeekKey(anchorKey)).map((key, index) => {
              const items = appointmentsByDay.get(key) ?? [];
              return (
                <div key={key} className="rounded-lg border border-slate-200 p-2">
                  <Link href={shell('day', key)} className="block">
                    <p className="text-xs font-medium text-slate-500">{WEEKDAY_LABELS[index]}</p>
                    <p
                      className={cx(
                        'text-sm font-semibold',
                        key === today ? 'text-brand-700' : 'text-slate-900',
                      )}
                    >
                      {formatDateKeyShort(key)}
                    </p>
                  </Link>
                  <ul className="mt-2 space-y-1">
                    {items.length === 0 ? (
                      <li className="text-[11px] text-slate-400">Free</li>
                    ) : (
                      items.map((appointment) => (
                        <li
                          key={appointment.id}
                          className="rounded bg-brand-50 px-1.5 py-1 text-[11px] text-brand-900"
                        >
                          <span className="font-medium">{formatUaeTime(appointment.startsAt)}</span>{' '}
                          {clientName(appointment)}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : null}

        {view === 'day' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {scope.isFirm ? 'Availability by lawyer' : 'Slots'}
              </h3>

              {scope.isFirm ? (
                <div className="mt-2 space-y-3">
                  {slotsByLawyer.map((entry) => (
                    <details key={entry.lawyerId} className="rounded-lg border border-slate-200">
                      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-800">
                        {entry.name ?? 'Lawyer'} ·{' '}
                        <span className="font-normal text-slate-500">
                          {entry.slots.filter((slot) => !slot.taken).length} free
                        </span>
                      </summary>
                      <ul className="divide-y divide-slate-100 border-t border-slate-200 px-3">
                        {entry.slots.map((slot) => (
                          <li key={slot.hour} className="flex items-center justify-between gap-3 py-1.5">
                            <span className="text-sm text-slate-700">{slot.label}</span>
                            {slot.taken ? (
                              <span className="text-xs text-slate-600">
                                Booked · {slot.appointment?.clientName}
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-green-700">Available</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {ownSlots.map((slot) => (
                    <li key={slot.hour} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm text-slate-800">{slot.label}</span>
                      {slot.taken ? (
                        <span className="text-xs text-slate-600">
                          Booked · {slot.appointment?.clientName}
                          {slot.appointment?.caseReference ? ` · ${slot.appointment.caseReference}` : ''}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-green-700">Available</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-3 text-xs text-slate-500">
                Working hours {BOOKABLE_HOURS[0]}:00–{BOOKABLE_HOURS[BOOKABLE_HOURS.length - 1] + 1}:00
                UAE time.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Bookings on this day</h3>
              {selectedAppointments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">Nothing booked yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {selectedAppointments.map((appointment) => (
                    <li key={appointment.id} className="py-3">
                      <p className="text-sm font-medium text-slate-900">
                        {formatUaeTime(appointment.startsAt)} · {clientName(appointment)}
                        {scope.isFirm ? (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            with{' '}
                            {appointment.lawyer.user.profile?.fullName?.trim() ||
                              lawyerName.get(appointment.lawyer.id) ||
                              'your lawyer'}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-500">
                        {MODE_LABEL[appointment.mode] ?? appointment.mode}
                        {appointment.case
                          ? ` · ${appointment.case.reference} — ${appointment.case.title}`
                          : ' · no case linked'}
                        {appointment.status === 'CANCELLED' ? ' · cancelled' : ''}
                        {appointment.confirmation === 'PENDING' ? ' · awaiting the client’s answer' : ''}
                        {appointment.confirmation === 'DECLINED' ? ' · client declined to travel' : ''}
                      </p>

                      {appointment.status === 'BOOKED' ? (
                        <>
                          <RescheduleAppointmentForm
                            appointmentId={appointment.id}
                            defaultDateKey={toUaeDateKey(appointment.startsAt)}
                            defaultHour={toUaeHour(appointment.startsAt)}
                            defaultMode={appointment.mode}
                            defaultOfficeAddress={appointment.officeAddress}
                          />
                          <div className="mt-2 flex flex-wrap items-start gap-3">
                            <CancelAppointmentButton appointmentId={appointment.id} />
                            <DeleteAppointmentButton appointmentId={appointment.id} />
                          </div>
                        </>
                      ) : (
                        <DeleteAppointmentButton appointmentId={appointment.id} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Card>

      {view === 'day' ? (
        <Card>
          <h2 className="font-semibold text-slate-900">Register a booking</h2>
          {scope.lawyerProfileId && booking?.lawyerProfileId ? (
            <>
              <p className="mt-1 mb-4 text-sm text-slate-600">
                {formatDateKey(anchorKey)} · {freeHours.length} of {ownSlots.length} slots
                available.
                {takenSlots.length > 0 ? ` ${takenSlots.length} already booked.` : ''}
              </p>
              {canBook ? (
                <BookingForm
                  lawyerProfileId={scope.lawyerProfileId}
                  dateKey={anchorKey}
                  freeHours={freeHours}
                  clients={booking.clients}
                />
              ) : (
                <Alert tone="warning">
                  Booking new meetings is currently switched off. Meetings already booked are
                  unaffected.
                </Alert>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              A booking is made by the lawyer whose diary it goes into, so a firm account does not
              register meetings on a lawyer&rsquo;s behalf. Its lawyers book their own from their own
              accounts; you can still move, cancel or delete what they have arranged.
            </p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
