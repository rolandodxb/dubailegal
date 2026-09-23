import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { emirateLabel } from '@/lib/i18n/labels';
import { listInvitationsForLawyer } from '@/server/services/firm-service';
import { formatDateTime } from '@/lib/format';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import { InvitationResponseForm } from '@/components/forms/FirmForms';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.memberCore.invitations.title };
}

/**
 * A lawyer's pending invitations to join a firm. Accepting links their licence
 * to that firm, which is what lets them accept cases addressed to it.
 */
export default async function InvitationsPage() {
  const [{ t }, user] = await Promise.all([getI18n(), requireMember()]);

  if (user.accountType !== 'LAWYER') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t.memberCore.invitations.title}</h1>
        <Alert tone="neutral">
          {t.memberCore.invitations.onlyLawyers.replace(
            '{type}',
            user.accountType === 'FIRM'
              ? t.memberCore.invitations.legalFirm
              : t.memberCore.invitations.individual,
          )}
        </Alert>
      </div>
    );
  }

  const invitations = await listInvitationsForLawyer(user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.memberCore.invitations.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {t.memberCore.invitations.intro}
        </p>
      </header>

      {invitations.length === 0 ? (
        <EmptyState
          title={t.memberCore.invitations.emptyTitle}
          description={t.memberCore.invitations.emptyBody}
          action={
            <Link href="/dashboard" className={buttonClasses('secondary', 'md')}>
              {t.memberCore.invitations.backToDashboard}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {invitations.map((invitation) => (
            <Card as="li" key={invitation.id}>
              <h2 className="font-semibold text-slate-900">{invitation.firm.legalName}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {t.memberCore.invitations.invited
                  .replace('{date}', formatDateTime(invitation.createdAt))
                  .replace('{licence}', invitation.firm.tradeLicenseNumber)
                  .replace(
                    '{emirate}',
                    invitation.firm.registeredEmirate
                      ? t.memberCore.invitations.emirateSuffix.replace(
                          '{emirate}',
                          emirateLabel(t, invitation.firm.registeredEmirate),
                        )
                      : '',
                  )}
              </p>
              <div className="mt-4">
                <InvitationResponseForm
                  invitationId={invitation.id}
                  firmName={invitation.firm.legalName}
                  labels={t.memberCore.invitations.response}
                />
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
