import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoomForGuest, resolveRoomForUser } from '@/server/services/room-service';
import { getSessionUser } from '@/lib/auth';
import { guestEmergencyByRoom } from '@/server/services/emergency-service';
import { legalAreaLabel } from '@/lib/i18n/labels';
import { env } from '@/lib/env';
import { ConferenceRoom } from '@/components/rooms/ConferenceRoom';
import { getI18n } from '@/lib/i18n';
import { iceServersForClient } from '@/lib/webrtc';
import { CancelEmergencyForm, CancelGuestEmergencyForm } from '@/components/forms/EmergencyForms';
import { listRecordingsForRoom } from '@/server/services/room-recording-service';
import { formatFileSize } from '@/lib/format';
import { BrandLockup } from '@/components/layout/Logo';
import { formatUaeDateTime } from '@/lib/time';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';
import { relativeTime } from '@/lib/i18n/format';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.publicPages.emergencyRoom.metaTitle,
    robots: { index: false, follow: false },
  };
}

/**
 * The emergency room.
 *
 * One page for everybody in the call, because there is one room. Somebody being
 * detained reaches it with the token in their link and no account at all; a member
 * who raised a request, and the lawyer on emergency call who took it, are admitted
 * by their session instead. It used to be guest-only, which is why a signed-in
 * member opening the link from their own request was shown a 404 while the lawyer
 * sat in the room on another page — the two halves of one call on two surfaces,
 * neither able to see the other.
 */
export default async function GuestEmergencyRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  // `t` on this page is the guest's token, which is not to be confused with the
  // dictionary, so the dictionary keeps its own name.
  const [{ code }, { t }, viewer, { t: dict }] = await Promise.all([
    params,
    searchParams,
    getSessionUser(),
    getI18n(),
  ]);
  const room = dict.publicPages.emergencyRoom;

  // Either credential admits: the token from the link, or the session of somebody
  // who belongs in this room.
  const access =
    (await resolveRoomForGuest(code, t ?? '')) ??
    (viewer ? await resolveRoomForUser(code, viewer.id) : null);
  if (!access) notFound();

  const isGuest = access.role === 'CLIENT' && !viewer;

  const [request, recordings] = await Promise.all([
    guestEmergencyByRoom(code),
    listRecordingsForRoom(code),
  ]);
  const lawyerName = request?.acceptedBy
    ? request.acceptedBy.profile?.fullName?.trim() || request.acceptedBy.email
    : null;

  return (
    <div className="dl-container max-w-4xl py-8">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <BrandLockup markSize={40} />
      </div>

      <header className="mb-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-800 ring-1 ring-inset ring-red-200">
          <Icon name="alert" size={14} />
          {room.pill}
        </span>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          {lawyerName ? room.lawyerJoined : room.waiting}
        </h1>
        {request ? (
          <p className="mt-1 text-sm text-slate-600">
            {legalAreaLabel(dict, request.caseType)} ·{' '}
            {room.raised.replace('{time}', relativeTime(dict, request.createdAt))} ·{' '}
            {room.answeredByFirst}
          </p>
        ) : null}
      </header>

      {lawyerName ? (
        <Alert tone="success" title={room.connectedTitle}>
          {room.connectedBody.replace('{name}', lawyerName)}
        </Alert>
      ) : (
        <Alert tone="info" title={room.goneTitle}>
          {room.goneBodyLead}
          <strong>{room.goneBodyStrong}</strong>
          {room.goneBodyTail}
        </Alert>
      )}

      <div className="mt-6">
        <ConferenceRoom
          labels={{
            you: dict.room.you,
            recording: dict.room.recording,
            recordingNow: dict.room.recordingNow,
          }}
          iceServers={iceServersForClient()}
          roomCode={code}
          role={access.role}
          otherPartyName={access.otherPartyName}
          providerUrl={env.videoProviderUrl}
          guestToken={t}
          context={room.callContext}
        />
      </div>

      {/* A call made by mistake has to be cancellable by the person who made it,
          from the room, without an account. */}
      {access.role === 'CLIENT' ? (
        <Card className="mt-6">
          <h2 className="font-semibold text-slate-900">{room.noLongerNeed}</h2>
          <p className="mt-1 mb-3 text-sm text-slate-600">{room.noLongerNeedBody}</p>
          {/*
            A guest withdraws with the token in their link; a member withdraws the
            request on their own account. Rendering the guest form for a member
            posted an empty token, so it was refused and the button looked dead.
          */}
          {isGuest || !request ? (
            <CancelGuestEmergencyForm
              roomCode={code}
              token={t ?? ''}
              labels={dict.emergency.cancelGuest}
            />
          ) : (
            <CancelEmergencyForm requestId={request.id} labels={dict.emergency.cancel} />
          )}
        </Card>
      ) : null}

      {recordings.length > 0 ? (
        <Card className="mt-6">
          <h2 className="font-semibold text-slate-900">
            {room.recordingsTitle.replace('{count}', String(recordings.length))}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{room.recordingsBody}</p>
          <ul className="mt-3 space-y-3">
            {recordings.map((recording) => (
              <li key={recording.id}>
                <p className="text-xs text-slate-500">
                  {formatUaeDateTime(recording.createdAt)} · {formatFileSize(recording.sizeBytes)}
                </p>
                <video
                  controls
                  preload="none"
                  src={`/api/room-recordings/${recording.id}${t ? `?t=${encodeURIComponent(t)}` : ''}`}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-900"
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mt-6">
        <h2 className="font-semibold text-slate-900">{room.ifNobodyJoins}</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
          <li>
            {room.emergencyLead}
            <strong>{room.emergencyStrong}</strong>
            {room.emergencyTail}
          </li>
          <li>{room.keepOpen}</li>
          <li>{room.videoFails}</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/emergency" className={buttonClasses('secondary', 'md')}>
            {room.raiseAnother}
          </Link>
          <Link href="/register" className={buttonClasses('ghost', 'md')}>
            {room.createAccountNextTime}
          </Link>
        </div>
      </Card>
    </div>
  );
}
