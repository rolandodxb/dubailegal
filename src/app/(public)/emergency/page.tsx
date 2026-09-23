import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getI18n } from '@/lib/i18n';
import { legalAreaLabel } from '@/lib/i18n/labels';
import { LEGAL_AREAS } from '@/lib/constants';
import { PublicEmergencyForm } from '@/components/forms/PublicEmergencyForm';
import { CancelEmergencyForm, EmergencyRequestForm } from '@/components/forms/EmergencyForms';
import { listMyEmergencies } from '@/server/services/emergency-service';
import { formatDateTime } from '@/lib/format';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';
import { BrandLockup } from '@/components/layout/BrandLockup';
import { Icon } from '@/components/icons';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.publicPages.emergency.metaTitle,
    description: t.publicPages.emergency.metaDescription,
  };
}

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
  const [{ t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  const emergency = t.publicPages.emergency;
  const form = t.publicPages.emergencyForm;

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
          {emergency.pill}
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          {t.landing.emergencyPageTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">{emergency.intro}</p>
      </header>

      <Alert tone="error" title={emergency.dangerTitle}>
        {emergency.dangerBody}
      </Alert>

      <Card className="mt-6">
        {/* A signed-in client gets the form that knows who they are: the request
            is filed against their account and they can follow it afterwards.
            Everybody else gets the form that needs no account at all, because an
            emergency is the worst possible moment to ask somebody to sign in. */}
        {user ? (
          <>
            <h2 className="font-semibold text-slate-900">{emergency.yourRequest}</h2>
            <p className="mt-1 mb-4 text-sm text-slate-600">{emergency.yourRequestBody}</p>
            <EmergencyRequestForm
              defaultPhone={user.profile?.phone ?? ''}
              labels={{
                ...t.emergency.request,
                areaOptions: LEGAL_AREAS.map((area) => ({
                  value: area.value,
                  label: legalAreaLabel(t, area.value),
                })),
              }}
            />
          </>
        ) : (
          <PublicEmergencyForm
            labels={{
              failedTitle: form.failedTitle,
              name: form.name,
              nameHint: form.nameHint,
              phone: form.phone,
              phoneHint: form.phoneHint,
              description: form.description,
              descriptionHint: form.descriptionHint,
              areaOfLaw: form.areaOfLaw,
              areaOptions: LEGAL_AREAS.map((area) => ({
                value: area.value,
                label: legalAreaLabel(t, area.value),
              })),
              email: t.common.email,
              emailHint: form.emailHint,
              pending: form.pending,
              submit: t.landing.emergencyPageTitle,
              note: form.note,
            }}
          />
        )}
      </Card>

      {/* ── Their own urgent requests ────────────────────────────────────── */}
      {user && mine.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            {emergency.yourRequestsCount.replace('{count}', String(mine.length))}
          </h2>
          <ul className="space-y-3">
            {mine.map((item) => (
              <Card as="li" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">{item.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {emergency.raised
                        .replace('{date}', formatDateTime(item.createdAt))
                        .replace('{phone}', item.contactPhone)}
                    </p>
                    {item.acceptedBy ? (
                      <p className="mt-2 text-sm text-green-800">
                        {emergency.takenBy.replace(
                          '{name}',
                          item.acceptedBy.profile?.fullName?.trim() || item.acceptedBy.email,
                        )}
                        {item.legalCase
                          ? emergency.caseReference.replace('{reference}', item.legalCase.reference)
                          : ''}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">{emergency.offered}</p>
                    )}
                    {item.roomCode ? (
                      <Link
                        href={`/emergency/room/${item.roomCode}`}
                        className={buttonClasses('primary', 'sm', 'mt-3')}
                      >
                        {emergency.joinRoom}
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
                    {item.status === 'OPEN'
                      ? emergency.statusOpen
                      : item.status === 'ACCEPTED'
                        ? emergency.statusTaken
                        : emergency.statusClosed}
                  </span>
                </div>
                {item.status === 'OPEN' ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <CancelEmergencyForm requestId={item.id} labels={t.emergency.cancel} />
                  </div>
                ) : null}
              </Card>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { title: emergency.noSignUp, body: emergency.noSignUpBody },
          {
            title: emergency.realLawyer,
            body: (onCall === 1 ? emergency.realLawyerOne : emergency.realLawyerOther).replace(
              '{count}',
              String(onCall),
            ),
          },
          { title: emergency.videoAndVoice, body: emergency.videoAndVoiceBody },
        ].map((item) => (
          <div key={item.title}>
            <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{item.body}</p>
          </div>
        ))}
      </div>

      <Card className="mt-8">
        <h2 className="font-semibold text-slate-900">{emergency.notEmergency}</h2>
        <p className="mt-1 text-sm text-slate-600">{emergency.notEmergencyBody}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {user ? (
            <Link href="/dashboard" className={buttonClasses('secondary', 'md')}>
              {emergency.backToDashboard}
            </Link>
          ) : (
            <>
              <Link href="/register" className={buttonClasses('primary', 'md')}>
                {t.nav.createAccount}
              </Link>
              <Link href="/enquiry" className={buttonClasses('secondary', 'md')}>
                {t.publicPages.enquiry.title}
              </Link>
            </>
          )}
          <Link href="/directory" className={buttonClasses('ghost', 'md')}>
            {t.publicPages.shell.browseDirectory}
          </Link>
        </div>
      </Card>
    </div>
  );
}
