import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { listInvitationsForLawyer } from '@/server/services/firm-service';
import { EMIRATE_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import { InvitationResponseForm } from '@/components/forms/FirmForms';

export const metadata: Metadata = { title: 'Invitations' };

/**
 * A lawyer's pending invitations to join a firm. Accepting links their licence
 * to that firm, which is what lets them accept cases addressed to it.
 */
export default async function InvitationsPage() {
  const user = await requireMember();

  if (user.accountType !== 'LAWYER') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Invitations</h1>
        <Alert tone="neutral">
          Only lawyer accounts can join a firm. You are signed in as a{' '}
          {user.accountType === 'FIRM' ? 'legal firm' : 'individual'} account.
        </Alert>
      </div>
    );
  }

  const invitations = await listInvitationsForLawyer(user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Invitations</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Firms that have invited you to join as one of their registered lawyers. Accepting links
          your licence to the firm and lets you accept cases submitted to it.
        </p>
      </header>

      {invitations.length === 0 ? (
        <EmptyState
          title="No pending invitations"
          description="When a firm registers you as a professional, the invitation appears here."
          action={
            <Link href="/dashboard" className={buttonClasses('secondary', 'md')}>
              Back to my dashboard
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {invitations.map((invitation) => (
            <Card as="li" key={invitation.id}>
              <h2 className="font-semibold text-slate-900">{invitation.firm.legalName}</h2>
              <p className="mt-1 text-xs text-slate-500">
                Invited {formatDateTime(invitation.createdAt)} · trade licence{' '}
                {invitation.firm.tradeLicenseNumber}
                {invitation.firm.registeredEmirate
                  ? ` · ${EMIRATE_LABEL[invitation.firm.registeredEmirate]}`
                  : ''}
              </p>
              <div className="mt-4">
                <InvitationResponseForm
                  invitationId={invitation.id}
                  firmName={invitation.firm.legalName}
                />
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
