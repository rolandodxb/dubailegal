import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { keyedDigest } from '@/lib/tokens';
import { emiratesIdCheckDigitMatches, normaliseEmiratesId } from '@/lib/emirates-id';
import { profileSchema } from '@/lib/validation';
import { fromZodError, failure, success, type ServiceResult } from './result';
import { invalidateVerification } from './verification-service';

export type ProfileUpdateOutcome = {
  /** True when the Emirates ID changed and a previous approval was withdrawn. */
  verificationReset: boolean;
};

/**
 * Creates or updates the profile basics required of every account.
 *
 * Two integrity rules are enforced here:
 *  1. An Emirates ID may back only one account (fingerprint uniqueness).
 *  2. Changing the Emirates ID on an already-approved account withdraws the
 *     approval, because the badge was issued for different evidence.
 */
export async function updateProfile(
  userId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<ProfileUpdateOutcome>> {
  const parsed = profileSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const data = parsed.data;
  const digits = normaliseEmiratesId(data.emiratesIdNumber);
  if (!digits) {
    return failure('Enter your Emirates ID as printed on the card.', {
      fieldErrors: { emiratesIdNumber: 'Enter your 15-digit Emirates ID.' },
    });
  }
  const fingerprint = keyedDigest(`emirates-id:${digits}`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      verificationStatus: true,
      profile: { select: { id: true, emiratesIdFingerprint: true, fullName: true } },
    },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });

  const clash = await prisma.profile.findUnique({
    where: { emiratesIdFingerprint: fingerprint },
    select: { userId: true },
  });
  if (clash && clash.userId !== userId) {
    return failure('That Emirates ID is already linked to another account.', {
      fieldErrors: {
        emiratesIdNumber:
          'This Emirates ID is already linked to another Dubai Legal account. Each identity may hold one account.',
      },
    });
  }

  const previousFingerprint = user.profile?.emiratesIdFingerprint ?? null;
  const identityChanged = previousFingerprint !== null && previousFingerprint !== fingerprint;

  const checkDigitOk = emiratesIdCheckDigitMatches(digits);

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      placeOfBirth: data.placeOfBirth,
      countryOfResidence: data.countryOfResidence,
      nationality: data.nationality,
      phone: data.phone,
      emiratesIdNumber: digits,
      emiratesIdExpiry: data.emiratesIdExpiry,
      emiratesIdFingerprint: fingerprint,
      emiratesIdCheckDigitOk: checkDigitOk,
      workDescription: data.workDescription,
      educationBackground: data.educationBackground,
    },
    update: {
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      placeOfBirth: data.placeOfBirth,
      countryOfResidence: data.countryOfResidence,
      nationality: data.nationality,
      phone: data.phone,
      emiratesIdNumber: digits,
      emiratesIdExpiry: data.emiratesIdExpiry,
      emiratesIdFingerprint: fingerprint,
      emiratesIdCheckDigitOk: checkDigitOk,
      workDescription: data.workDescription,
      educationBackground: data.educationBackground,
    },
  });

  let verificationReset = false;
  if (identityChanged && user.verificationStatus === 'APPROVED') {
    await invalidateVerification(userId, 'Emirates ID changed after approval', meta.ip ?? null);
    verificationReset = true;
  }

  // Field names only — never the Emirates ID itself, and never free-text values.
  await recordAudit({
    actorUserId: userId,
    action: 'profile.updated',
    entityType: 'profile',
    entityId: userId,
    metadata: { identityChanged, verificationReset },
    ip: meta.ip ?? null,
  });

  return success({ verificationReset });
}

/** The profile form's current values, with the Emirates ID in its printed form. */
export async function getProfileForEdit(userId: string) {
  return prisma.profile.findUnique({ where: { userId } });
}
