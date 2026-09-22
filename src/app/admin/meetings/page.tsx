import type { Metadata } from 'next';
import { requireReviewer } from '@/lib/auth';
import { appointmentOverview } from '@/server/services/admin-service';
import { roomOverview } from '@/server/services/room-service';
import { recordingOverview } from '@/server/services/room-recording-service';
import { formatUaeDateTime } from '@/lib/time';
import { Alert, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Meetings' };

const MODE_LABEL: Record<string, string> = {
  VIDEO_CALL: 'Video call',
  OFFICE_VISIT: 'Office visit',
  PHONE_CALL: 'Phone call',
};

/**
 * Meetings and conference rooms, for oversight.
 *
 * An operator can see that meetings were arranged and whether the client answered
 * an office request. They cannot join a room: a conference between a lawyer and
 * their client is exactly what an administrator must not be able to sit in on.
 */
export default async function AdminMeetingsPage() {
  await requireReviewer();
  const [meetings, rooms, recordings] = await Promise.all([
    appointmentOverview(),
    roomOverview(),
    recordingOverview(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Meetings and rooms</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Meetings booked by professionals, how each one is held, and whether the client agreed to
          come to the office.
        </p>
      </header>

      <Alert tone="info" title="Administrators cannot join a conference room">
        A video call between a lawyer and their client may be privileged. You can see that a room
        exists and who it is for; you cannot enter it, and the media never passes through this
        server.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Meetings recorded', value: meetings.rows.length },
          { label: 'Video calls', value: meetings.videoCalls },
          { label: 'Office visits', value: meetings.officeVisits },
          { label: 'Awaiting the client', value: meetings.awaitingAnswer },
          { label: 'Rooms with someone in', value: rooms.activeRooms },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">All meetings ({meetings.rows.length})</h2>
        {meetings.rows.length === 0 ? (
          <p className="text-sm text-slate-600">No meetings have been arranged.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-5xl text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Professional</th>
                  <th className="px-3 py-2 font-medium">How</th>
                  <th className="px-3 py-2 font-medium">Client answer</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meetings.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                      {formatUaeDateTime(row.startsAt)}
                    </td>
                    <td className="max-w-40 truncate px-3 py-2 text-xs text-slate-600">
                      {row.client.profile?.fullName?.trim() || row.client.email}
                    </td>
                    <td className="max-w-40 truncate px-3 py-2 text-xs text-slate-600">
                      {row.firm?.legalName ??
                        row.lawyer.user.profile?.fullName?.trim() ??
                        row.lawyer.user.email}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {MODE_LABEL[row.mode] ?? row.mode}
                      {row.mode === 'OFFICE_VISIT' && row.officeAddress ? (
                        <span className="mt-0.5 block max-w-48 truncate text-slate-500">
                          {row.officeAddress}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {row.confirmation === 'PENDING' ? (
                        <span className="font-medium text-amber-800">Awaiting answer</span>
                      ) : row.confirmation === 'ACCEPTED' ? (
                        <span className="font-medium text-green-800">Accepted</span>
                      ) : row.confirmation === 'DECLINED' ? (
                        <span className="font-medium text-red-800">Declined</span>
                      ) : (
                        <span className="text-slate-400">Not required</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.status.toLowerCase()}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">
                      {row.roomCode ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Signalling traffic</h2>
        <Card>
          <p className="text-sm text-slate-600">
            {rooms.signalCount} connection message{rooms.signalCount === 1 ? '' : 's'} relayed across
            all rooms, and {rooms.presenceCount} participant{rooms.presenceCount === 1 ? '' : 's'}{' '}
            currently marked present. These carry only connection details — never audio, video or
            anything either side said — and they are deleted automatically within the hour.
          </p>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Call recordings</h2>
        <Card>
          <p className="text-sm text-slate-600">
            {recordings.count} recording{recordings.count === 1 ? '' : 's'} exist
            {recordings.rooms > 0
              ? ` across ${recordings.rooms} room${recordings.rooms === 1 ? '' : 's'}`
              : ''}
            .
          </p>
          <p className="mt-2 text-sm text-slate-600">
            <strong className="text-slate-800">You cannot play them.</strong> A call between a lawyer
            and their client may be privileged, so recordings follow the same rule as the rooms
            themselves: the two people on the call can watch them back, and an administrator of this
            platform cannot. There is no control here that opens one, deliberately.
          </p>
        </Card>
      </section>
    </div>
  );
}
