import type { Metadata } from 'next';
import { requireReviewer } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { appointmentOverview } from '@/server/services/admin-service';
import { roomOverview } from '@/server/services/room-service';
import { recordingOverview } from '@/server/services/room-recording-service';
import { formatUaeDateTime } from '@/lib/time';
import { Alert, Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.labels.domain.meeting };
}

/**
 * Meetings and conference rooms, for oversight.
 *
 * An operator can see that meetings were arranged and whether the client answered
 * an office request. They cannot join a room: a conference between a lawyer and
 * their client is exactly what an administrator must not be able to sit in on.
 */
export default async function AdminMeetingsPage() {
  const [{ t, effectiveLocale }] = await Promise.all([getI18n(), requireReviewer()]);
  const [meetings, rooms, recordings] = await Promise.all([
    appointmentOverview(),
    roomOverview(),
    recordingOverview(),
  ]);

  const modeLabel: Record<string, string> = t.admin.meetings.mode;
  const confirmationLabel: Record<string, string> = t.admin.meetings.confirmation;
  const statusLabel: Record<string, string> = t.admin.meetings.status;

  const signalPhrase =
    rooms.signalCount === 1
      ? t.admin.meetings.signalling.signalsOne.replace('{count}', String(rooms.signalCount))
      : t.admin.meetings.signalling.signalsMany.replace('{count}', String(rooms.signalCount));
  const presencePhrase =
    rooms.presenceCount === 1
      ? t.admin.meetings.signalling.participantsOne.replace('{count}', String(rooms.presenceCount))
      : t.admin.meetings.signalling.participantsMany.replace(
          '{count}',
          String(rooms.presenceCount),
        );

  const recordingCountPhrase =
    recordings.count === 1
      ? t.admin.meetings.callRecordings.countOne.replace('{count}', String(recordings.count))
      : t.admin.meetings.callRecordings.countMany.replace('{count}', String(recordings.count));
  const recordingRoomsPhrase =
    recordings.rooms > 0
      ? (recordings.rooms === 1
          ? t.admin.meetings.callRecordings.roomsOne
          : t.admin.meetings.callRecordings.roomsMany
        ).replace('{count}', String(recordings.rooms))
      : '';

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.meetings}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.meetings.subtitle}</p>
      </header>

      <Alert tone="info" title={t.admin.meetings.alert.title}>
        {t.admin.meetings.alert.body}
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: t.admin.meetings.stats.meetingsRecorded, value: meetings.rows.length },
          { label: t.admin.meetings.stats.videoCalls, value: meetings.videoCalls },
          { label: t.admin.meetings.stats.officeVisits, value: meetings.officeVisits },
          { label: t.admin.meetings.stats.awaitingClient, value: meetings.awaitingAnswer },
          { label: t.admin.meetings.stats.activeRooms, value: rooms.activeRooms },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.admin.meetings.allMeetings.replace('{count}', String(meetings.rows.length))}
        </h2>
        {meetings.rows.length === 0 ? (
          <p className="text-sm text-slate-600">{t.admin.meetings.empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-5xl text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.admin.meetings.columns.when}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.meetings.columns.client}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.meetings.columns.professional}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.meetings.columns.how}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.meetings.columns.clientAnswer}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.meetings.columns.state}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.meetings.columns.room}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meetings.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                      {formatUaeDateTime(row.startsAt, effectiveLocale)}
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
                      {modeLabel[row.mode] ?? row.mode}
                      {row.mode === 'OFFICE_VISIT' && row.officeAddress ? (
                        <span className="mt-0.5 block max-w-48 truncate text-slate-500">
                          {row.officeAddress}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {row.confirmation === 'PENDING' ? (
                        <span className="font-medium text-amber-800">
                          {confirmationLabel.PENDING}
                        </span>
                      ) : row.confirmation === 'ACCEPTED' ? (
                        <span className="font-medium text-green-800">
                          {confirmationLabel.ACCEPTED}
                        </span>
                      ) : row.confirmation === 'DECLINED' ? (
                        <span className="font-medium text-red-800">
                          {confirmationLabel.DECLINED}
                        </span>
                      ) : (
                        <span className="text-slate-400">{confirmationLabel.NOT_REQUIRED}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {statusLabel[row.status] ?? row.status.toLowerCase()}
                    </td>
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
        <h2 className="mb-3 font-semibold text-slate-900">{t.admin.meetings.signalling.title}</h2>
        <Card>
          <p className="text-sm text-slate-600">
            {signalPhrase} {presencePhrase}. {t.admin.meetings.signalling.body}
          </p>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.admin.meetings.callRecordings.title}
        </h2>
        <Card>
          <p className="text-sm text-slate-600">
            {recordingCountPhrase}
            {recordingRoomsPhrase}.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            <strong className="text-slate-800">
              {t.admin.meetings.callRecordings.cannotPlayLead}
            </strong>{' '}
            {t.admin.meetings.callRecordings.cannotPlayBody}
          </p>
        </Card>
      </section>
    </div>
  );
}
