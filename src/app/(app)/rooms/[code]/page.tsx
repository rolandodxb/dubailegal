import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireActiveUser } from '@/lib/auth';
import { env } from '@/lib/env';
import { resolveRoomForUser } from '@/server/services/room-service';
import { formatUaeDateTime } from '@/lib/time';
import { ConferenceRoom } from '@/components/rooms/ConferenceRoom';
import { getI18n } from '@/lib/i18n';
import { iceServersForClient } from '@/lib/webrtc';
import { BrandLockup } from '@/components/layout/BrandLockup';
import { CancelCallButton } from '@/components/forms/AppointmentButtons';
import { listRecordingsForRoom } from '@/server/services/room-recording-service';
import { formatFileSize } from '@/lib/format';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.memberCases.roomPage.conferenceRoom };
}

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
  const [{ t, effectiveLocale }, user] = await Promise.all([getI18n(), requireActiveUser()]);
  const labels = t.memberCases.roomPage;
  const { code } = await params;

  const access = await resolveRoomForUser(code, user.id);
  if (!access) notFound();

  const { appointment, emergency } = access;
  const recordings = await listRecordingsForRoom(code);
  const notYet =
    appointment !== null && appointment.startsAt.getTime() - Date.now() > 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label={t.memberCases.breadcrumb}>
        <Link href="/cases" className="text-brand-700 hover:underline">
          {labels.backToMyCases}
        </Link>
      </nav>

      <div className="border-b border-slate-200 pb-4">
        <BrandLockup markSize={40} />
      </div>

      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          {emergency ? labels.emergencyCall : labels.conferenceRoom}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {emergency ? labels.yourUrgentCallWith : labels.yourMeetingWith}{' '}
          <strong className="text-slate-900">{access.otherPartyName}</strong>
          {appointment
            ? labels.scheduledFor.replace('{date}', formatUaeDateTime(appointment.startsAt, effectiveLocale))
            : ''}
          .
        </p>
      </header>

      {emergency ? (
        <Alert tone="warning" title={labels.answeringEmergency}>
          {emergency.guestName ?? labels.personNeedingHelp}
          {labels.raisedThis}{' '}
          {emergency.title ? labels.aboutTitle.replace('{title}', emergency.title) : ''}
          {labels.answeringBody}
        </Alert>
      ) : null}

      {notYet && appointment ? (
        <Alert tone="info" title={labels.notDueYet}>
          {labels.notDueBody.replace('{date}', formatUaeDateTime(appointment.startsAt, effectiveLocale))}
        </Alert>
      ) : null}

      <ConferenceRoom
        labels={{
          you: t.room.you,
          recording: t.room.recording,
          recordingNow: t.room.recordingNow,
          ...t.memberCases.conference,
          recorder: t.memberCases.recorder,
        }}
        iceServers={iceServersForClient()}
        roomCode={code}
        role={access.role}
        otherPartyName={access.otherPartyName}
        startsAt={appointment ? appointment.startsAt.toISOString() : undefined}
        providerUrl={env.videoProviderUrl}
      />

      {appointment?.source === 'CASE_REQUEST' ? (
        <Card>
          <h2 className="font-semibold text-slate-900">
            {access.role === 'CLIENT' ? labels.endThisCall : labels.finishUp}
          </h2>
          <p className="mt-1 mb-3 text-sm text-slate-600">{labels.endCallBody}</p>
          <CancelCallButton
            appointmentId={appointment.id}
            labels={t.memberCases.appointment}
          />
        </Card>
      ) : null}

      <Card>
        <h2 className="font-semibold text-slate-900">
          {labels.recordingsHeading.replace('{count}', String(recordings.length))}
        </h2>
        {recordings.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">{labels.noRecordings}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recordings.map((recording) => (
              <li key={recording.id} className="py-3">
                <p className="text-sm font-medium text-slate-900">
                  {recording.recordedBy.profile?.fullName?.trim() || recording.recordedBy.email}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {recording.recordedById === user.id
                      ? labels.yourRecording
                      : labels.theirRecording}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  {formatUaeDateTime(recording.createdAt, effectiveLocale)} · {formatFileSize(recording.sizeBytes)}
                  {recording.durationMs
                    ? ` · ${labels.seconds.replace(
                        '{count}',
                        String(Math.max(1, Math.round(recording.durationMs / 1000))),
                      )}`
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
          <strong className="font-medium text-slate-800">{labels.privateEncryptedTitle}</strong>
          {labels.privateEncryptedBody}
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-900">{labels.beforeYouStart}</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
          <li>{labels.allowMedia}</li>
          <li>{labels.directCall}</li>
          <li>{labels.connectionFails}</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          {access.caseId ? (
            <Link href={`/cases/${access.caseId}`} className={buttonClasses('secondary', 'md')}>
              {labels.openCaseChat}
            </Link>
          ) : null}
          <Link href="/cases" className={buttonClasses('ghost', 'md')}>
            {labels.myMeetings}
          </Link>
        </div>
      </Card>
    </div>
  );
}
