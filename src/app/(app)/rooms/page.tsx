import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { listRoomsForClient, listRoomsForProfessional } from '@/server/services/room-service';
import { formatUaeDateTime } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import { RequestUrgentCallButton } from '@/components/forms/UrgentCallButton';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';
import { DOMAINS } from '@/lib/domains';

export const metadata: Metadata = { title: 'Conference rooms' };

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
  const user = await requireMember();
  const isClient = user.accountType === 'USER';

  if (!isClient && (user.accountType === 'LAWYER' || user.accountType === 'FIRM')) {
    const rooms = await listRoomsForProfessional(user.id);

    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-slate-900">Conference rooms</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Rooms that are open on your cases: meetings that have not finished, and urgent calls a
            client has asked you for. Join one and the other person is told you have arrived.
          </p>
        </header>

        {rooms.length === 0 ? (
          <EmptyState
            title="No rooms are open"
            description="A video meeting you book, or an urgent call a client asks for from their case, appears here with a link to join."
            action={
              <Link href="/calendar" className={buttonClasses('primary', 'md')}>
                Open the calendar
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rooms.map((room) => {
              const clientName =
                room.client.profile?.fullName?.trim() || room.client.email || 'The client';
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
                      {urgent ? 'Urgent call requested' : 'Scheduled meeting'}
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
                          : 'No case linked'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {urgent
                          ? `Asked ${formatUaeDateTime(room.startsAt)}`
                          : formatUaeDateTime(room.startsAt)}
                        {' · with '}
                        {room.lawyer.user.profile?.fullName?.trim() || 'your firm'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/rooms/${room.roomCode}`}
                      className={buttonClasses(urgent ? 'primary' : 'secondary', 'md')}
                    >
                      Join the room
                    </Link>
                    {room.case ? (
                      <Link href={`/cases/${room.case.id}`} className={buttonClasses('ghost', 'md')}>
                        Open the case
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
        <h1 className="text-2xl font-semibold text-slate-900">Conference rooms</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          The professional handling each of your cases, and a room to talk in. Ask for an urgent call
          and you go straight into the room while they are alerted.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No case has a professional on it yet"
          description="A conference room opens once a lawyer or firm has accepted your case. Until then, everything about the case is on its own page."
          action={
            <Link href="/cases" className={buttonClasses('primary', 'md')}>
              My cases
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const lawyerName =
              row.lawyer?.user.profile?.fullName?.trim() || row.lawyer?.user.email || null;
            const professionalName = row.firm?.legalName ?? lawyerName ?? 'the professional';
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
                    {row.status === 'IN_PROGRESS' ? 'In progress' : 'Assigned'}
                  </span>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  {row.lawyer ? (
                    <Avatar
                      userId={row.lawyer.user.id}
                      name={lawyerName ?? 'Your lawyer'}
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
                        {lawyerName} · registered with {row.firm.legalName}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {row.firm ? 'Handling firm' : 'Your lawyer on this case'}
                      </p>
                    )}
                  </div>
                </div>

                {urgent ? (
                  <div className="mt-4 rounded-lg border border-domain-emergency/25 bg-domain-emergency/5 p-3">
                    <p className="text-xs text-slate-700">
                      You asked for an urgent call about this case and the room is still open.
                    </p>
                    <Link
                      href={`/rooms/${urgent.roomCode}`}
                      className={buttonClasses('primary', 'sm', 'mt-2')}
                    >
                      Join the room now
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4">
                    <RequestUrgentCallButton caseId={row.id} professionalName={professionalName} />
                  </div>
                )}

                {scheduled.length > 0 ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Meetings booked
                    </p>
                    <ul className="mt-2 space-y-2">
                      {scheduled.map((room) => (
                        <li key={room.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm text-slate-700">
                            {formatUaeDateTime(room.startsAt)}
                          </span>
                          <Link
                            href={`/rooms/${room.roomCode}`}
                            className="text-xs font-medium text-brand-700 hover:underline"
                          >
                            Join the room
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Link href={`/cases/${row.id}`} className={buttonClasses('secondary', 'sm')}>
                    Open the case
                  </Link>
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      {rows.length > 0 ? (
        <Alert tone="info" title="If this is a real emergency">
          Call 999. Dubai Legal connects you to a lawyer and cannot send police, an ambulance or the
          fire service. For an emergency with no account at all, use the{' '}
          <Link href="/emergency" className="font-medium underline">
            public emergency page
          </Link>
          .
        </Alert>
      ) : null}
    </div>
  );
}
