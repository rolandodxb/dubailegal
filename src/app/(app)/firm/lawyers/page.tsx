import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth';
import { listFirmLawyers } from '@/server/services/firm-service';
import { EMIRATE_LABEL } from '@/lib/constants';
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

export const metadata: Metadata = { title: 'Lawyers registered' };

/**
 * The firm's roster.
 *
 * A firm account is not itself a lawyer, so it cannot accept cases: it supplies
 * the lawyers who can. Invitations carry a shareable link because this
 * installation cannot send email.
 */
export default async function FirmLawyersPage() {
  const user = await requireProfessional();

  if (user.accountType !== 'FIRM') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Lawyers registered</h1>
        <Card>
          <p className="text-sm text-slate-700">
            This page belongs to legal-firm accounts. If you are a lawyer and want to join a firm,
            check your invitations.
          </p>
          <Link href="/invitations" className={buttonClasses('secondary', 'md', 'mt-4')}>
            My invitations
          </Link>
        </Card>
      </div>
    );
  }

  const { firm, lawyers, invitations } = await listFirmLawyers(user.id);

  if (!firm) {
    return (
      <Alert tone="error" title="Firm record missing">
        Your firm registration details could not be loaded. Please add them under Legal details.
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {lawyers.some((row) => row.isFirmEmergency) ? (
        <Alert tone="info" title="Emergency contact designated">
          Urgent requests that reach your firm are assigned directly to{' '}
          {lawyers.find((row) => row.isFirmEmergency)?.user.profile?.fullName?.trim() ||
            lawyers.find((row) => row.isFirmEmergency)?.user.email}
          . You can change this under any lawyer below.
        </Alert>
      ) : null}

      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Lawyers registered</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          The professionals who may act for {firm.legalName}. Only a lawyer registered here can
          review and accept a case submitted to the firm.
        </p>
      </header>

      <Card>
        <h2 className="font-semibold text-slate-900">Create a lawyer account</h2>
        <p className="mt-1 mb-4 max-w-2xl text-sm text-slate-600">
          Use this when you are hiring and want the lawyer on your roster now. The account is created
          active and affiliated to {firm.legalName} immediately, and can be listed in the public
          directory straight away. You are given a password once to pass on.
        </p>
        <CreateLawyerForm />
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            Or invite an existing lawyer by email
          </summary>
          <p className="mt-2 mb-4 max-w-2xl text-sm text-slate-600">
            Use this when the lawyer already has a Dubai Legal account. If they do, the invitation
            appears in their dashboard to accept. If they do not, you are given a registration link
            to send them, because this installation cannot send email itself.
          </p>
          <InviteLawyerForm />
        </details>
      </Card>

      {invitations.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            Pending invitations ({invitations.length})
          </h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{invitation.email}</p>
                  <p className="text-xs text-slate-500">
                    Invited {formatDateTime(invitation.createdAt)} by {invitation.invitedBy.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    Share link: <span className="font-mono">/register?type=LAWYER&amp;invite=…</span>
                  </span>
                  <RevokeInvitationButton invitationId={invitation.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Registered lawyers ({lawyers.length})</h2>
        {lawyers.length === 0 ? (
          <EmptyState
            title="No lawyers registered yet"
            description="Until a lawyer joins, cases submitted to your firm will sit unaccepted, because a firm account cannot accept them itself."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {lawyers.map((lawyer) => {
              const name =
                lawyer.user.profile?.fullName?.trim() || lawyer.user.email || 'Unnamed lawyer';
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
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{lawyer.user.email}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {lawyer.createdByFirmId
                          ? 'Account created by your firm'
                          : 'Joined through an invitation'}
                      </p>
                      {lawyer.user.profile?.phone ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Phone {lawyer.user.profile.phone}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <dt className="font-medium text-slate-700">Licence</dt>
                      <dd>{lawyer.licenseNumber}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-700">Authority</dt>
                      <dd>{lawyer.licensingAuthority}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-700">Valid until</dt>
                      <dd>
                        {lawyer.licenseExpiresOn ? formatDate(lawyer.licenseExpiresOn) : 'Not stated'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-700">Cases with the firm</dt>
                      <dd>{lawyer._count.cases}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href="/calendar"
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        Calendar
                      </Link>
                      <FirmEmergencyForm
                        lawyerProfileId={lawyer.id}
                        lawyerName={name}
                        active={lawyer.isFirmEmergency}
                      />
                    </div>
                    <RemoveLawyerButton lawyerProfileId={lawyer.id} name={name} />
                  </div>
                </Card>
              );
            })}
          </ul>
        )}
      </section>

      {EMIRATE_LABEL[firm.registeredEmirate ?? 'DUBAI'] ? (
        <p className="text-xs text-slate-500">
          Firm registered in {EMIRATE_LABEL[firm.registeredEmirate ?? 'DUBAI']} · trade licence{' '}
          {firm.tradeLicenseNumber}
        </p>
      ) : null}
    </div>
  );
}
