import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, homePathFor } from '@/lib/auth';
import { describeInvitationToken } from '@/server/services/firm-service';
import { getAvailability, isEnabled } from '@/lib/availability';
import { getI18n } from '@/lib/i18n';
import { accountTypeDescription, accountTypeLabel } from '@/lib/i18n/labels';
import { ACCOUNT_TYPES } from '@/lib/constants';
import { RegisterForm } from '@/components/forms/RegisterForm';
import { Alert, Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.createAccount };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; invite?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(user.emailVerifiedAt ? homePathFor(user) : '/verify-email');

  const [{ t }, { type, invite }] = await Promise.all([getI18n(), searchParams]);
  const auth = t.publicPages.auth;
  const rf = t.publicPages.registerForm;

  const availability = await getAvailability();
  if (!isEnabled(availability.settings, 'feature.registration')) {
    return (
      <Card className="p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900">{auth.registerClosedTitle}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {auth.registerClosedLead}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            {t.nav.signIn}
          </Link>
          {auth.registerClosedTail}
        </p>
      </Card>
    );
  }
  const defaultAccountType = type && ['USER', 'LAWYER', 'FIRM'].includes(type) ? type : undefined;

  // Arriving through a firm's invitation link names the firm and pins the
  // address the invitation was issued to.
  const invitation = invite ? await describeInvitationToken(invite) : null;

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">
        {invitation ? auth.registerInviteTitle : auth.registerTitle}
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">{auth.registerIntro}</p>

      {invite && !invitation ? (
        <Alert tone="warning" className="mb-5">
          {auth.invalidInvite}
        </Alert>
      ) : null}

      <RegisterForm
        defaultAccountType={invitation ? 'LAWYER' : defaultAccountType}
        inviteToken={invitation ? invite : undefined}
        invitedByFirm={invitation?.firm.legalName}
        lockedEmail={invitation?.email}
        labels={{
          invitedTitle: rf.invitedTitle,
          invitedLead: rf.invitedLead,
          invitedTail: rf.invitedTail,
          failedTitle: rf.failedTitle,
          accountTypeLegend: t.auth.accountType,
          accountTypeHint: t.auth.accountTypeHint,
          accountTypes: ACCOUNT_TYPES.map((accountType) => ({
            value: accountType,
            label:
              accountType === 'USER'
                ? rf.userOption
                : accountType === 'LAWYER'
                  ? rf.lawyerOption
                  : rf.firmOption,
            description: accountTypeDescription(t, accountType),
          })),
          fullName: t.auth.fullName,
          fullNameHint: t.auth.fullNameHint,
          phone: t.auth.phone,
          phoneHint: t.auth.phoneHint,
          email: t.auth.email,
          password: t.auth.password,
          passwordHint: rf.passwordHint,
          confirmPassword: rf.confirmPassword,
          terms: rf.terms,
          pending: rf.pending,
          submit: t.nav.createAccount,
          haveAccount: t.auth.haveAccount,
          signIn: t.nav.signIn,
          emiratesIdNote: rf.emiratesIdNote
            .replace('{user}', accountTypeLabel(t, 'USER'))
            .replace('{lawyer}', accountTypeLabel(t, 'LAWYER'))
            .replace('{firm}', accountTypeLabel(t, 'FIRM')),
        }}
      />
    </Card>
  );
}
