import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { listRoomsForClient, listRoomsForProfessional } from '@/server/services/room-service';
import { formatUaeDateTime } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import { RequestUrgentCallButton } from '@/components/forms/UrgentCallButton';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';
import { DOMAINS } from '@/lib/domains';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.rooms };
}

/**
 * Conference rooms.
 *
 * A client sees one row per case with a professional on it: who is handling the
 * matter, the room if one is already open, and a button to ask for a call now.
 * That last part matters — a client should be able to reach the lawyer who has
 * their case without waiting for a meeting to be booked for them.
 *
 * A professional sees the rooms waiting on them: video meetings that have not
 * finished, and urgent calls their clients have asked for.
 */
export default async function RoomsPage() {
  const [{ t, effectiveLocale }, user] = await Promise.all([getI18n(), requireMember()]);
  const labels = t.memberCases.rooms;
  const isClient = user.accountType === 'USER';

  if (!isClient && (user.accountType === 'LAWYER' || user.accountType === 'FIRM')) {
    const rooms = await listRoomsForProfessional(user.id);

    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-slate-900">{labels.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{labels.professionalIntro}</p>
        </header>

        {rooms.length === 0 ? (
          <EmptyState
            title={labels.noRoomsOpen}
            description={labels.noRoomsOpenBody}
            action={
              <Link href="/calendar" className={buttonClasses('primary', 'md')}>
                {labels.openCalendar}
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rooms.map((room) => {
              const clientName =
                room.client.profile?.fullName?.trim() || room.client.email || labels.theClient;
              const urgent = room.source === 'CASE_REQUEST';
              return (
                <Card as="li" key={room.id} className={urgent ? 'border-domain-emergency/30' : undefined}>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={
                        urgent
                          ? 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-domain-emergency/10 text-domain-emergency'
                          : `inline-flex h-9 w-9 items-center justify-center rounded-full ${DOMAINS.meeting.surface} ${DOMAINS.meeting.text}`
                      }
                    >
                      <Icon name={urgent ? 'phoneCall' : 'video'} size={18} />
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                        urgent
                          ? 'bg-domain-emergency/5 text-domain-emergency ring-domain-emergency/25'
                          : 'bg-slate-100 text-slate-600 ring-slate-200'
                      }`}
                    >
                      {urgent ? labels.urgentRequested : labels.scheduledMeeting}
                    </span>
                  </div>

                  <div className="mt-3 flex items-start gap-3">
                    <Avatar
                      userId={room.client.id}
                      name={clientName}
                      hasPhoto={Boolean(room.client.profile?.avatarDocumentId)}
                      size={38}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{clientName}</p>
                      <p className="text-xs text-slate-500">
                        {room.case
                          ? `${room.case.reference} — ${room.case.title}`
                          : labels.noCaseLinked}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {urgent
                          ? labels.asked.replace('{date}', formatUaeDateTime(room.startsAt, effectiveLocale))
                          : formatUaeDateTime(room.startsAt, effectiveLocale)}
                        {labels.withSuffix}
                        {room.lawyer.user.profile?.fullName?.trim() || labels.yourFirm}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/rooms/${room.roomCode}`}
                      className={buttonClasses(urgent ? 'primary' : 'secondary', 'md')}
                    >
                      {labels.joinRoom}
                    </Link>
                    {room.case ? (
                      <Link href={`/cases/${room.case.id}`} className={buttonClasses('ghost', 'md')}>
                        {labels.openCase}
                      </Link>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  const rows = await listRoomsForClient(user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{labels.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{labels.clientIntro}</p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title={labels.noProfessionalOnCase}
          description={labels.noProfessionalOnCaseBody}
          action={
            <Link href="/cases" className={buttonClasses('primary', 'md')}>
              {t.items.myCases}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const lawyerName =
              row.lawyer?.user.profile?.fullName?.trim() || row.lawyer?.user.email || null;
            const professionalName = row.firm?.legalName ?? lawyerName ?? labels.theProfessional;
            const urgent = row.rooms.find((room) => room.source === 'CASE_REQUEST');
            const scheduled = row.rooms.filter((room) => room.source === 'SCHEDULED');

            return (
              <Card as="li" key={row.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-slate-500">{row.reference}</p>
                    <h2 className="mt-0.5 font-semibold text-slate-900">{row.title}</h2>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                      row.status === 'IN_PROGRESS'
                        ? 'bg-domain-case/5 text-domain-case ring-domain-case/25'
                        : 'bg-slate-100 text-slate-600 ring-slate-200'
                    }`}
                  >
                    {row.status === 'IN_PROGRESS' ? labels.inProgress : labels.assigned}
                  </span>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  {row.lawyer ? (
                    <Avatar
                      userId={row.lawyer.user.id}
                      name={lawyerName ?? labels.yourLawyer}
                      hasPhoto={Boolean(row.lawyer.user.profile?.avatarDocumentId)}
                      size={40}
                    />
                  ) : (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <Icon name="building" size={18} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{professionalName}</p>
                    {lawyerName && row.firm ? (
                      <p className="text-xs text-slate-500">
                        {labels.registeredWith
                          .replace('{name}', lawyerName)
                          .replace('{firm}', row.firm.legalName)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {row.firm ? labels.handlingFirm : labels.yourLawyerOnCase}
                      </p>
                    )}
                  </div>
                </div>

                {urgent ? (
                  <div className="mt-4 rounded-lg border border-domain-emergency/25 bg-domain-emergency/5 p-3">
                    <p className="text-xs text-slate-700">{labels.urgentStillOpen}</p>
                    <Link
                      href={`/rooms/${urgent.roomCode}`}
                      className={buttonClasses('primary', 'sm', 'mt-2')}
                    >
                      {labels.joinRoomNow}
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4">
                    <RequestUrgentCallButton
                      caseId={row.id}
                      professionalName={professionalName}
                      labels={t.memberCases.urgentCall}
                    />
                  </div>
                )}

                {scheduled.length > 0 ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {labels.meetingsBooked}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {scheduled.map((room) => (
                        <li key={room.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm text-slate-700">
                            {formatUaeDateTime(room.startsAt, effectiveLocale)}
                          </span>
                          <Link
                            href={`/rooms/${room.roomCode}`}
                            className="text-xs font-medium text-brand-700 hover:underline"
                          >
                            {labels.joinRoom}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Link href={`/cases/${row.id}`} className={buttonClasses('secondary', 'sm')}>
                    {labels.openCase}
                  </Link>
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      {rows.length > 0 ? (
        <Alert tone="info" title={labels.emergencyTitle}>
          {labels.emergencyBodyBefore}
          <Link href="/emergency" className="font-medium underline">
            {labels.publicEmergencyPage}
          </Link>
          {labels.emergencyBodyAfter}
        </Alert>
      ) : null}
    </div>
  );
}
