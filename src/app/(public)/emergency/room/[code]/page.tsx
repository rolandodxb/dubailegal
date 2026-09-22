import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoomForGuest } from '@/server/services/room-service';
import { guestEmergencyByRoom } from '@/server/services/emergency-service';
import { LEGAL_AREA_LABEL } from '@/lib/constants';
import { env } from '@/lib/env';
import { ConferenceRoom } from '@/components/rooms/ConferenceRoom';
import { CancelGuestEmergencyForm } from '@/components/forms/EmergencyForms';
import { listRecordingsForRoom } from '@/server/services/room-recording-service';
import { formatFileSize } from '@/lib/format';
import { BrandLockup } from '@/components/layout/Logo';
import { formatUaeDateTime, minutesLabel } from '@/lib/time';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Urgent call',
  robots: { index: false, follow: false },
};

/**
 * The emergency room, reached without an account.
 *
 * Somebody being detained should not have to remember an email and a password.
 * The token in their link is the only credential, and this page sits deliberately
 * outside the signed-in area so nothing redirects them to a login screen.
 */
export default async function GuestEmergencyRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ code }, { t }] = await Promise.all([params, searchParams]);

  const access = await resolveRoomForGuest(code, t ?? '');
  if (!access) notFound();

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
          Urgent call
        </span>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          {lawyerName ? 'A lawyer has joined' : 'Waiting for a lawyer to join'}
        </h1>
        {request ? (
          <p className="mt-1 text-sm text-slate-600">
            {LEGAL_AREA_LABEL[request.caseType] ?? request.caseType} · raised{' '}
            {minutesLabel(request.createdAt)} · answered by the first lawyer to join
          </p>
        ) : null}
      </header>

      {lawyerName ? (
        <Alert tone="success" title="You are connected to a lawyer">
          {lawyerName} has answered your emergency and is in the room below.
        </Alert>
      ) : (
        <Alert tone="info" title="Your request has gone to every lawyer on emergency call">
          Press <strong>Join the call</strong> below and stay on this page. The first lawyer to
          answer appears here. Keep this tab open.
        </Alert>
      )}

      <div className="mt-6">
        <ConferenceRoom
          roomCode={code}
          role={access.role}
          otherPartyName={access.otherPartyName}
          providerUrl={env.videoProviderUrl}
          guestToken={t}
          context="This is an urgent call. Stay on the page — a lawyer on emergency call will join shortly."
        />
      </div>

      {/* A call made by mistake has to be cancellable by the person who made it,
          from the room, without an account. */}
      <Card className="mt-6">
        <h2 className="font-semibold text-slate-900">No longer need this?</h2>
        <p className="mt-1 mb-3 text-sm text-slate-600">
          Withdrawing closes the room and tells every lawyer who saw the request that it is over.
        </p>
        <CancelGuestEmergencyForm roomCode={code} token={t ?? ''} />
      </Card>

      {recordings.length > 0 ? (
        <Card className="mt-6">
          <h2 className="font-semibold text-slate-900">
            Recordings of this call ({recordings.length})
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            The lawyer&rsquo;s recording of your call, kept for you as well. It is encrypted and only
            the two of you can play it.
          </p>
          <ul className="mt-3 space-y-3">
            {recordings.map((recording) => (
              <li key={recording.id}>
                <p className="text-xs text-slate-500">
                  {formatUaeDateTime(recording.createdAt)} · {formatFileSize(recording.sizeBytes)}
                </p>
                <video
                  controls
                  preload="none"
                  src={`/api/room-recordings/${recording.id}?t=${encodeURIComponent(t ?? '')}`}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-900"
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mt-6">
        <h2 className="font-semibold text-slate-900">If nobody joins</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
          <li>
            Call emergency services if you are in danger. In the UAE, that is <strong>999</strong>.
          </li>
          <li>
            Keep this page open — it is your only link to the room. Copy the address before you close
            the tab.
          </li>
          <li>
            If the video will not connect, stay in the room: the lawyer can see that you are waiting
            and can call the number you gave.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/emergency" className={buttonClasses('secondary', 'md')}>
            Raise another request
          </Link>
          <Link href="/register" className={buttonClasses('ghost', 'md')}>
            Create an account for next time
          </Link>
        </div>
      </Card>
    </div>
  );
}
