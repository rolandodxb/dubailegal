import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { firmCredentialSchema, lawyerCredentialSchema } from '@/lib/validation';
import { fromZodError, failure, success, type ServiceResult } from './result';
import { invalidateVerification } from './verification-service';
import { notify } from './notification-service';

/**
 * Saves the legal information a lawyer account must supply.
 *
 * Changing a licence on an already-approved account withdraws the approval:
 * the badge attested to the credentials that were reviewed.
 */
export async function saveLawyerCredential(
  userId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ verificationReset: boolean; joinedFirm: string | null }>> {
  const parsed = lawyerCredentialSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountType: true, verificationStatus: true, lawyerProfile: { select: { licenseNumber: true } } },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });
  if (user.accountType !== 'LAWYER') {
    return failure('Only lawyer accounts hold legal credentials.', { status: 403 });
  }

  const data = parsed.data;
  if (data.licenseIssuedOn && data.licenseExpiresOn && data.licenseExpiresOn <= data.licenseIssuedOn) {
    return failure('The licence expiry date must be after the issue date.', {
      fieldErrors: { licenseExpiresOn: 'Expiry must be after the issue date.' },
    });
  }

  const changed = user.lawyerProfile?.licenseNumber !== data.licenseNumber;

  await prisma.lawyerProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: { ...data },
  });

  let verificationReset = false;
  if (changed && user.lawyerProfile && user.verificationStatus === 'APPROVED') {
    await invalidateVerification(userId, 'Legal licence changed after approval', meta.ip ?? null);
    verificationReset = true;
  }

  await recordAudit({
    actorUserId: userId,
    action: 'credential.lawyer_saved',
    entityType: 'lawyer_profile',
    entityId: userId,
    metadata: { licence: data.licenseNumber, verificationReset },
    ip: meta.ip ?? null,
  });

  // A firm invitation carried through registration is claimed now, because the
  // affiliation needs the lawyer profile that was just created.
  const joinedFirm = await claimPendingFirmInvitation(userId);

  return success({ verificationReset, joinedFirm });
}

/**
 * Links this lawyer to the firm whose invitation link they registered through.
 * Returns the firm's name when a link was made, otherwise null.
 */
async function claimPendingFirmInvitation(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, pendingFirmInviteHash: true, lawyerProfile: { select: { id: true } } },
  });
  if (!user?.pendingFirmInviteHash || !user.lawyerProfile) return null;

  const invitation = await prisma.firmInvitation.findFirst({
    where: { tokenHash: user.pendingFirmInviteHash, email: user.email, status: 'PENDING' },
    select: { id: true, firm: { select: { id: true, legalName: true, userId: true } } },
  });
  if (!invitation) {
    await prisma.user.update({ where: { id: userId }, data: { pendingFirmInviteHash: null } });
    return null;
  }

  await prisma.$transaction([
    prisma.lawyerProfile.update({
      where: { id: user.lawyerProfile.id },
      data: { affiliatedFirmId: invitation.firm.id },
    }),
    prisma.firmInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', respondedAt: new Date(), lawyerUserId: userId },
    }),
    prisma.user.update({ where: { id: userId }, data: { pendingFirmInviteHash: null } }),
  ]);

  await notify({
    userId: invitation.firm.userId,
    kind: 'firm.invitation_accepted',
    title: `A lawyer joined ${invitation.firm.legalName}`,
    body: `${user.email} completed registration through your invitation link and is now registered with your firm.`,
    link: '/firm/lawyers',
  });

  return invitation.firm.legalName;
}

/** Saves the legal information a firm account must supply. */
export async function saveFirmCredential(
  userId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ verificationReset: boolean }>> {
  const parsed = firmCredentialSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountType: true, verificationStatus: true, firmProfile: { select: { tradeLicenseNumber: true } } },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });
  if (user.accountType !== 'FIRM') {
    return failure('Only legal-firm accounts hold firm credentials.', { status: 403 });
  }

  const data = parsed.data;
  if (
    data.tradeLicenseIssuedOn &&
    data.tradeLicenseExpiresOn &&
    data.tradeLicenseExpiresOn <= data.tradeLicenseIssuedOn
  ) {
    return failure('The licence expiry date must be after the issue date.', {
      fieldErrors: { tradeLicenseExpiresOn: 'Expiry must be after the issue date.' },
    });
  }

  const changed = user.firmProfile?.tradeLicenseNumber !== data.tradeLicenseNumber;

  await prisma.firmProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: { ...data },
  });

  let verificationReset = false;
  if (changed && user.firmProfile && user.verificationStatus === 'APPROVED') {
    await invalidateVerification(userId, 'Trade licence changed after approval', meta.ip ?? null);
    verificationReset = true;
  }

  await recordAudit({
    actorUserId: userId,
    action: 'credential.firm_saved',
    entityType: 'firm_profile',
    entityId: userId,
    metadata: { tradeLicence: data.tradeLicenseNumber, verificationReset },
    ip: meta.ip ?? null,
  });

  return success({ verificationReset });
}

export async function getCredentials(userId: string, accountType: 'USER' | 'LAWYER' | 'FIRM') {
  if (accountType === 'LAWYER') {
    return { lawyer: await prisma.lawyerProfile.findUnique({ where: { userId } }), firm: null };
  }
  if (accountType === 'FIRM') {
    return { lawyer: null, firm: await prisma.firmProfile.findUnique({ where: { userId } }) };
  }
  return { lawyer: null, firm: null };
}
