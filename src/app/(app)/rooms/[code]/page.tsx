import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireActiveUser } from '@/lib/auth';
import { env } from '@/lib/env';
import { resolveRoomForUser } from '@/server/services/room-service';
import { formatUaeDateTime } from '@/lib/time';
import { ConferenceRoom } from '@/components/rooms/ConferenceRoom';
import { BrandLockup } from '@/components/layout/Logo';
import { CancelCallButton } from '@/components/forms/AppointmentButtons';
import { listRecordingsForRoom } from '@/server/services/room-recording-service';
import { formatFileSize } from '@/lib/format';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Conference room' };

/**
 * A conference room, reached from the meeting it belongs to.
 *
 * Only the professional on the appointment and the client may enter. An
 * administrator cannot, deliberately: a conversation between a lawyer and their
 * client is not something a platform operator should be able to sit in on.
 */
export default async function ConferenceRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const user = await requireActiveUser();
  const { code } = await params;

  const access = await resolveRoomForUser(code, user.id);
  if (!access) notFound();

  const { appointment, emergency } = access;
  const recordings = await listRecordingsForRoom(code);
  const notYet =
    appointment !== null && appointment.startsAt.getTime() - Date.now() > 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label="Breadcrumb">
        <Link href="/cases" className="text-brand-700 hover:underline">
          ← Back to my cases
        </Link>
      </nav>

      <div className="border-b border-slate-200 pb-4">
        <BrandLockup markSize={40} />
      </div>

      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          {emergency ? 'Emergency call' : 'Conference room'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Your {emergency ? 'urgent call with' : 'meeting with'}{' '}
          <strong className="text-slate-900">{access.otherPartyName}</strong>
          {appointment ? `, scheduled for ${formatUaeDateTime(appointment.startsAt)}` : ''}.
        </p>
      </header>

      {emergency ? (
        <Alert tone="warning" title="You are answering an emergency">
          {emergency.guestName ?? 'A person needing urgent help'} raised this{' '}
          {emergency.title ? `about “${emergency.title}”` : ''}. Joining the room records you as the
          lawyer who answered.
        </Alert>
      ) : null}

      {notYet && appointment ? (
        <Alert tone="info" title="This meeting is not due yet">
          It is scheduled for {formatUaeDateTime(appointment.startsAt)}. You can join the room early
          — it stays open — but the other person may not be there yet.
        </Alert>
      ) : null}

      <ConferenceRoom
        roomCode={code}
        role={access.role}
        otherPartyName={access.otherPartyName}
        startsAt={appointment ? appointment.startsAt.toISOString() : undefined}
        providerUrl={env.videoProviderUrl}
      />

      {appointment?.source === 'CASE_REQUEST' ? (
        <Card>
          <h2 className="font-semibold text-slate-900">
            {access.role === 'CLIENT' ? 'End this call' : 'Finish up'}
          </h2>
          <p className="mt-1 mb-3 text-sm text-slate-600">
            Leaving the room keeps it open so the other person can join. Ending the call closes it
            for both of you and tells them it is over — press this if the call was a mistake, or
            once you have said what you needed to.
          </p>
          <CancelCallButton appointmentId={appointment.id} />
        </Card>
      ) : null}

      <Card>
        <h2 className="font-semibold text-slate-900">
          Recordings of this call ({recordings.length})
        </h2>
        {recordings.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">
            Nothing has been recorded in this room yet. A call is recorded from the moment either
            person joins, and the recording is saved when they leave.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recordings.map((recording) => (
              <li key={recording.id} className="py-3">
                <p className="text-sm font-medium text-slate-900">
                  {recording.recordedBy.profile?.fullName?.trim() || recording.recordedBy.email}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {recording.recordedById === user.id ? 'your recording' : 'their recording'}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  {formatUaeDateTime(recording.createdAt)} · {formatFileSize(recording.sizeBytes)}
                  {recording.durationMs
                    ? ` · ${Math.max(1, Math.round(recording.durationMs / 1000))} seconds`
                    : ''}
                </p>
                <video
                  controls
                  preload="none"
                  src={`/api/room-recordings/${recording.id}`}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-900"
                />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <strong className="font-medium text-slate-800">Private and encrypted.</strong> These
          recordings are encrypted on disk, available to the two people on the call and to nobody
          else. An administrator cannot play them. They are deleted with the meeting they belong to.
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-900">Before you start</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
          <li>Allow camera and microphone access when the browser asks.</li>
          <li>The call is direct between the two of you; nothing is recorded.</li>
          <li>
            If the connection fails, your network is likely blocking a direct link. Use the backup
            room below, or continue in the case chat.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          {access.caseId ? (
            <Link href={`/cases/${access.caseId}`} className={buttonClasses('secondary', 'md')}>
              Open the case chat
            </Link>
          ) : null}
          <Link href="/cases" className={buttonClasses('ghost', 'md')}>
            My meetings
          </Link>
        </div>
      </Card>
    </div>
  );
}
