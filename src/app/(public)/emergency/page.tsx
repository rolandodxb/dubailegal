import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PublicEmergencyForm } from '@/components/forms/PublicEmergencyForm';
import { CancelEmergencyForm, EmergencyRequestForm } from '@/components/forms/EmergencyForms';
import { listMyEmergencies } from '@/server/services/emergency-service';
import { formatDateTime } from '@/lib/format';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';
import { BrandLockup } from '@/components/layout/Logo';
import { Icon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Urgent legal help',
  description:
    'Reach a lawyer on emergency call right now. No account, no password — go straight into a video call.',
};

/**
 * Emergency help, available to anyone who needs it.
 *
 * Deliberately outside the signed-in area. The worst possible design for an
 * emergency is a login screen: somebody being detained cannot be expected to
 * remember an email and a password. Name, number, what is happening, and they are
 * in a room.
 *
 * A professional is sent to the emergency desk instead. This form raises a
 * request *for* legal help; a lawyer who filled it in would be asking themselves
 * for it. The two sides are kept apart on purpose.
 */
export default async function PublicEmergencyPage() {
  const user = await getSessionUser();

  if (user?.accountType === 'LAWYER' || user?.accountType === 'FIRM') {
    redirect('/emergency/desk');
  }

  const [onCall, mine] = await Promise.all([
    prisma.lawyerProfile.count({
      where: {
        user: { status: 'ACTIVE' },
        OR: [{ acceptsEmergency: true }, { isFirmEmergency: true }],
      },
    }),
    user ? listMyEmergencies(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="dl-container max-w-3xl py-12">
      <div className="mb-8 flex justify-center">
        <BrandLockup markSize={56} />
      </div>

      <header className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-800 ring-1 ring-inset ring-red-200">
          <Icon name="alert" size={14} />
          Urgent
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          Get a lawyer on video now
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          No account. No password. Tell us who you are and what is happening, and you go straight into
          a call with a lawyer on emergency duty.
        </p>
      </header>

      <Alert tone="error" title="If somebody is in danger, call 999 first">
        Dubai Legal connects you to a lawyer. It is not the police, an ambulance or the fire service,
        and it cannot send help to you.
      </Alert>

      <Card className="mt-6">
        {/* A signed-in client gets the form that knows who they are: the request
            is filed against their account and they can follow it afterwards.
            Everybody else gets the form that needs no account at all, because an
            emergency is the worst possible moment to ask somebody to sign in. */}
        {user ? (
          <>
            <h2 className="font-semibold text-slate-900">Your urgent request</h2>
            <p className="mt-1 mb-4 text-sm text-slate-600">
              Raised from your account, so you can follow it and the professional who takes it sees
              your history.
            </p>
            <EmergencyRequestForm defaultPhone={user.profile?.phone ?? ''} />
          </>
        ) : (
          <PublicEmergencyForm />
        )}
      </Card>

      {/* ── Their own urgent requests ────────────────────────────────────── */}
      {user && mine.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Your urgent requests ({mine.length})
          </h2>
          <ul className="space-y-3">
            {mine.map((item) => (
              <Card as="li" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">{item.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Raised {formatDateTime(item.createdAt)} · call-back number {item.contactPhone}
                    </p>
                    {item.acceptedBy ? (
                      <p className="mt-2 text-sm text-green-800">
                        Taken by{' '}
                        {item.acceptedBy.profile?.fullName?.trim() || item.acceptedBy.email}
                        {item.legalCase ? ` · case ${item.legalCase.reference}` : ''}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">
                        Offered to every professional on emergency call. The first to take it has a
                        case opened and assigned.
                      </p>
                    )}
                    {item.roomCode ? (
                      <Link
                        href={`/emergency/room/${item.roomCode}`}
                        className={buttonClasses('primary', 'sm', 'mt-3')}
                      >
                        Join the video room
                      </Link>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                      item.status === 'OPEN'
                        ? 'bg-red-50 text-red-800 ring-red-200'
                        : item.status === 'ACCEPTED'
                          ? 'bg-green-50 text-green-800 ring-green-200'
                          : 'bg-slate-100 text-slate-600 ring-slate-200'
                    }`}
                  >
                    {item.status === 'OPEN' ? 'Open' : item.status === 'ACCEPTED' ? 'Taken' : 'Closed'}
                  </span>
                </div>
                {item.status === 'OPEN' ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <CancelEmergencyForm requestId={item.id} />
                  </div>
                ) : null}
              </Card>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: 'No sign-up',
            body: 'Nothing to verify, nothing to remember. You are in a room in seconds.',
          },
          {
            title: 'A real lawyer',
            body: `${onCall} lawyer${onCall === 1 ? '' : 's'} ${onCall === 1 ? 'is' : 'are'} on emergency duty right now. The first to answer joins you.`,
          },
          {
            title: 'Video and voice',
            body: 'The call is direct between you and the lawyer. Nothing is recorded.',
          },
        ].map((item) => (
          <div key={item.title}>
            <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{item.body}</p>
          </div>
        ))}
      </div>

      <Card className="mt-8">
        <h2 className="font-semibold text-slate-900">Not an emergency?</h2>
        <p className="mt-1 text-sm text-slate-600">
          For anything that can wait, an account gives you a much better experience: you can send the
          full details, attach documents, follow the case and message your lawyer. A general enquiry
          works too, but it goes into a shared pool and is answered more slowly.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {user ? (
            <Link href="/dashboard" className={buttonClasses('secondary', 'md')}>
              Back to my dashboard
            </Link>
          ) : (
            <>
              <Link href="/register" className={buttonClasses('primary', 'md')}>
                Create an account
              </Link>
              <Link href="/enquiry" className={buttonClasses('secondary', 'md')}>
                Send a general enquiry
              </Link>
            </>
          )}
          <Link href="/directory" className={buttonClasses('ghost', 'md')}>
            Browse the directory
          </Link>
        </div>
      </Card>
    </div>
  );
}
