import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { emirateLabel } from '@/lib/i18n/labels';
import { listFirmLawyers } from '@/server/services/firm-service';
import { MIN_PASSWORD_LENGTH } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/format';
import { Avatar } from '@/components/Avatar';
import { VerificationStatusPill } from '@/components/VerificationBadge';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import {
  CreateLawyerForm,
  InviteLawyerForm,
  RemoveLawyerButton,
  RevokeInvitationButton,
} from '@/components/forms/FirmForms';
import { FirmEmergencyForm } from '@/components/forms/EmergencyForms';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.firmLawyers };
}

/**
 * The firm's roster.
 *
 * A firm account is not itself a lawyer, so it cannot accept cases: it supplies
 * the lawyers who can. Invitations carry a shareable link because this
 * installation cannot send email.
 */
export default async function FirmLawyersPage() {
  const [{ t }, user] = await Promise.all([getI18n(), requireProfessional()]);

  if (user.accountType !== 'FIRM') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.firmLawyers}</h1>
        <Card>
          <p className="text-sm text-slate-700">{t.memberPro.firmLawyers.wrongAccountBody}</p>
          <Link href="/invitations" className={buttonClasses('secondary', 'md', 'mt-4')}>
            {t.memberPro.firmLawyers.myInvitations}
          </Link>
        </Card>
      </div>
    );
  }

  const { firm, lawyers, invitations } = await listFirmLawyers(user.id);

  if (!firm) {
    return (
      <Alert tone="error" title={t.memberPro.firm.recordTitle}>
        {t.memberPro.firm.recordBody}
      </Alert>
    );
  }

  const emergencyContact = lawyers.find((row) => row.isFirmEmergency);

  return (
    <div className="space-y-8">
      {lawyers.some((row) => row.isFirmEmergency) ? (
        <Alert tone="info" title={t.memberPro.firmLawyers.emergencyContactTitle}>
          {t.memberPro.firmLawyers.emergencyContactBody.replace(
            '{name}',
            emergencyContact?.user.profile?.fullName?.trim() || emergencyContact?.user.email || '',
          )}
        </Alert>
      ) : null}

      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.firmLawyers}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {t.memberPro.firmLawyers.intro.replace('{firm}', firm.legalName)}
        </p>
      </header>

      <Card>
        <h2 className="font-semibold text-slate-900">{t.memberPro.firmLawyers.createTitle}</h2>
        <p className="mt-1 mb-4 max-w-2xl text-sm text-slate-600">
          {t.memberPro.firmLawyers.createBody.replace('{firm}', firm.legalName)}
        </p>
        <CreateLawyerForm
          labels={{
            createdTitle: t.memberPro.firmForms.createdTitle,
            notCreatedTitle: t.memberPro.firmForms.notCreatedTitle,
            fullName: t.memberPro.firmForms.fullName,
            emailAddress: t.memberPro.firmForms.emailAddress,
            emailHint: t.memberPro.firmForms.emailHint,
            tempPassword: t.memberPro.firmForms.tempPassword,
            tempPasswordHint: t.memberPro.firmForms.tempPasswordHint.replace(
              '{min}',
              String(MIN_PASSWORD_LENGTH),
            ),
            phone: t.common.phone,
            licenceNumber: t.memberPro.credentials.licenceNumber,
            licensingAuthority: t.memberPro.credentials.licensingAuthority,
            licenceExpires: t.memberPro.firmForms.licenceExpires,
            yearsOfExperience: t.memberPro.credentials.yearsOfExperience,
            whereAppearsTitle: t.memberPro.firmForms.whereAppearsTitle,
            whereAppearsBefore: t.memberPro.firmForms.whereAppearsBefore,
            lawyersAtThisFirm: t.memberPro.firm.lawyersAtThisFirm,
            whereAppearsAfter: t.memberPro.firmForms.whereAppearsAfter,
            creatingAccount: t.memberPro.firmForms.creatingAccount,
            createLawyerAccount: t.memberPro.firmForms.createLawyerAccount,
            createLawyerNote: t.memberPro.firmForms.createLawyerNote,
          }}
        />
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            {t.memberPro.firmLawyers.inviteSummary}
          </summary>
          <p className="mt-2 mb-4 max-w-2xl text-sm text-slate-600">
            {t.memberPro.firmLawyers.inviteBody}
          </p>
          <InviteLawyerForm
            labels={{
              lawyerEmail: t.memberPro.firmForms.lawyerEmail,
              inviting: t.memberPro.firmForms.inviting,
              registerProfessional: t.memberPro.firmForms.registerProfessional,
            }}
          />
        </details>
      </Card>

      {invitations.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            {t.memberPro.firmLawyers.pendingInvitations.replace(
              '{count}',
              String(invitations.length),
            )}
          </h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{invitation.email}</p>
                  <p className="text-xs text-slate-500">
                    {t.memberPro.firmLawyers.invitedBy
                      .replace('{date}', formatDateTime(invitation.createdAt))
                      .replace('{email}', invitation.invitedBy.email)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {t.memberPro.firmLawyers.shareLink}{' '}
                    <span className="font-mono">/register?type=LAWYER&amp;invite=…</span>
                  </span>
                  <RevokeInvitationButton
                    invitationId={invitation.id}
                    labels={{ withdraw: t.memberPro.firmForms.withdraw }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.memberPro.firmLawyers.registeredLawyers.replace('{count}', String(lawyers.length))}
        </h2>
        {lawyers.length === 0 ? (
          <EmptyState
            title={t.memberPro.firm.noLawyersTitle}
            description={t.memberPro.firmLawyers.noLawyersDescription}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {lawyers.map((lawyer) => {
              const name =
                lawyer.user.profile?.fullName?.trim() ||
                lawyer.user.email ||
                t.memberPro.firmLawyers.unnamedLawyer;
              return (
                <Card as="li" key={lawyer.id}>
                  <div className="flex items-start gap-3">
                    <Avatar
                      userId={lawyer.user.id}
                      name={name}
                      hasPhoto={Boolean(lawyer.user.profile?.avatarDocumentId)}
                      size={48}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{name}</h3>
                        <VerificationStatusPill
                          accountType="LAWYER"
                          status={lawyer.user.verificationStatus}
                          label={t.badges.LAWYER}
                          statusLabel={t.verificationStatus[lawyer.user.verificationStatus]}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{lawyer.user.email}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {lawyer.createdByFirmId
                          ? t.memberPro.firmLawyers.createdByFirm
                          : t.memberPro.firmLawyers.joinedByInvitation}
                      </p>
                      {lawyer.user.profile?.phone ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {t.common.phone} {lawyer.user.profile.phone}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <dt className="font-medium text-slate-700">
                        {t.memberPro.firmLawyers.licence}
                      </dt>
                      <dd>{lawyer.licenseNumber}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-700">
                        {t.memberPro.firmLawyers.authority}
                      </dt>
                      <dd>{lawyer.licensingAuthority}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-700">
                        {t.memberPro.firmLawyers.validUntil}
                      </dt>
                      <dd>
                        {lawyer.licenseExpiresOn
                          ? formatDate(lawyer.licenseExpiresOn)
                          : t.memberPro.credentials.notStated}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-700">
                        {t.memberPro.firmLawyers.casesWithFirm}
                      </dt>
                      <dd>{lawyer._count.cases}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href="/calendar"
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        {t.items.calendar}
                      </Link>
                      <FirmEmergencyForm
                        lawyerProfileId={lawyer.id}
                        lawyerName={name}
                        active={lawyer.isFirmEmergency}
                        labels={t.emergency.firm}
                      />
                    </div>
                    <RemoveLawyerButton
                      lawyerProfileId={lawyer.id}
                      name={name}
                      labels={{
                        confirm: t.memberPro.firmForms.removeConfirm,
                        removeFromFirm: t.memberPro.firmForms.removeFromFirm,
                        removing: t.memberPro.firmForms.removing,
                      }}
                    />
                  </div>
                </Card>
              );
            })}
          </ul>
        )}
      </section>

      {firm.registeredEmirate ?? 'DUBAI' ? (
        <p className="text-xs text-slate-500">
          {t.memberPro.firmLawyers.firmRegisteredIn
            .replace('{emirate}', emirateLabel(t, firm.registeredEmirate ?? 'DUBAI'))
            .replace('{number}', firm.tradeLicenseNumber)}
        </p>
      ) : null}
    </div>
  );
}
