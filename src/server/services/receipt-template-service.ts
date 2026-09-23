import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { deleteUpload, storeUpload, UploadRejected } from '@/lib/storage';
import { notify } from './notification-service';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * Billing receipts, and whose letterhead they carry.
 *
 * A fee request produces a receipt. What that receipt looks like is the
 * professional's decision: the standard Legal Dash layout, or a letterhead of
 * their own with their name, their mark and their colour. Either way the
 * platform mark stays on the document — a receipt is issued through Legal Dash,
 * and the person holding it should be able to see where it came from.
 *
 * A new account has no template, which means the standard layout. Nothing has to
 * be configured for a receipt to be correct, and nothing about the standard
 * layout can be broken.
 */

/** Where the platform mark and the standard wording live. */
export const PLATFORM_BRAND = {
  name: 'Legal Dash',
  tagline: 'Verified lawyers and legal firms, worldwide',
  logo: '/logo.svg',
} as const;

const HEX = /^#[0-9a-fA-F]{6}$/;

const templateSchema = z.object({
  layout: z.enum(['STANDARD', 'CUSTOM'], {
    errorMap: () => ({ message: 'Choose one of the two layouts.' }),
  }),
  brandName: z
    .string()
    .trim()
    .max(120, 'Keep the name under 120 characters.')
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  headerLine: z
    .string()
    .trim()
    .max(160, 'Keep the strapline under 160 characters.')
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  footerNote: z
    .string()
    .trim()
    .max(600, 'Keep the footer under 600 characters.')
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  accentColor: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine((value) => value === null || HEX.test(value), 'Use a hex colour such as #132E4C.'),
  showLicence: z.coerce.boolean().default(true),
  showFirm: z.coerce.boolean().default(true),
  showContact: z.coerce.boolean().default(true),
  removeLogo: z.coerce.boolean().default(false),
});

export type ReceiptTemplateInput = unknown;

/** The stored template, or null when the account uses the standard layout. */
export async function getReceiptTemplate(userId: string) {
  return prisma.receiptTemplate.findUnique({
    where: { userId },
    include: { user: { select: { email: true, profile: { select: { fullName: true } } } } },
  });
}

/**
 * What a receipt should look like, for the payment being viewed.
 *
 * The letterhead belongs to the professional who raised the fee — the person
 * being paid — not to whoever happens to be looking at the receipt.
 */
export async function receiptPresentationForPayment(payment: {
  requestedById: string;
  case: {
    firm: { legalName: string; registeredAddress: string | null } | null;
    lawyer: {
      licenseNumber: string;
      licensingAuthority: string;
    } | null;
  };
  requestedBy: { email: string; profile: { fullName: string } | null };
}) {
  const template = await prisma.receiptTemplate.findUnique({
    where: { userId: payment.requestedById },
    select: {
      layout: true,
      brandName: true,
      headerLine: true,
      footerNote: true,
      accentColor: true,
      logoDocumentId: true,
      showLicence: true,
      showFirm: true,
      showContact: true,
    },
  });

  const professionalName =
    payment.requestedBy.profile?.fullName?.trim() || payment.requestedBy.email;

  if (!template || template.layout !== 'CUSTOM') {
    return {
      mode: 'STANDARD' as const,
      brandName: PLATFORM_BRAND.name,
      tagline: PLATFORM_BRAND.tagline,
      logoUrl: PLATFORM_BRAND.logo,
      accentColor: null as string | null,
      footerNote: null as string | null,
      showLicence: true,
      showFirm: true,
      showContact: false,
      professionalName,
    };
  }

  return {
    mode: 'CUSTOM' as const,
    brandName: template.brandName?.trim() || professionalName,
    tagline: template.headerLine?.trim() || null,
    logoUrl: template.logoDocumentId ? `/api/documents/${template.logoDocumentId}` : null,
    accentColor: template.accentColor,
    footerNote: template.footerNote,
    showLicence: template.showLicence,
    showFirm: template.showFirm,
    showContact: template.showContact,
    professionalName,
  };
}

/**
 * Saves a professional's letterhead, and optionally a new mark for it.
 *
 * An administrator has no letterhead and cannot be given one: the platform mark
 * is theirs by definition, and the console has no way to change it. That is
 * enforced here rather than only in the interface.
 */
export async function saveReceiptTemplate(
  userId: string,
  rawInput: ReceiptTemplateInput,
  logo: File | null,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ layout: string }>> {
  const parsed = templateSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      accountType: true,
      roles: true,
      profile: { select: { fullName: true } },
    },
  });
  if (!account) return failure('That account no longer exists.', { status: 404 });

  if (account.roles.includes('REVIEWER')) {
    return failure(
      'Administrator accounts use the Legal Dash letterhead, and it cannot be changed.',
      { status: 403 },
    );
  }
  if (account.accountType !== 'LAWYER' && account.accountType !== 'FIRM') {
    return failure('Only a lawyer or a legal firm raises fees, so only they have a receipt layout.', {
      status: 403,
    });
  }

  if (parsed.data.layout === 'CUSTOM' && !parsed.data.brandName) {
    return failure('Give the name that should be printed on the receipt.', {
      fieldErrors: { brandName: 'A custom layout needs a name.' },
    });
  }

  const existing = await prisma.receiptTemplate.findUnique({
    where: { userId },
    select: { logoDocumentId: true },
  });

  // A rejected upload must not leave a half-saved template behind, so the file
  // is stored before anything is written.
  let logoDocumentId = existing?.logoDocumentId ?? null;
  let uploadedDocumentId: string | null = null;

  if (logo && logo.size > 0) {
    try {
      const stored = await storeUpload(logo, userId);
      const document = await prisma.document.create({
        data: {
          userId,
          kind: 'BRAND_LOGO',
          status: 'APPROVED',
          storageKey: stored.storageKey,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          sha256: stored.sha256,
          documentNumber: 'Billing receipt mark',
        },
        select: { id: true },
      });
      uploadedDocumentId = document.id;
      logoDocumentId = document.id;
    } catch (error) {
      if (error instanceof UploadRejected) {
        return failure(error.message, { fieldErrors: { logo: error.message } });
      }
      console.error('[receipt-template] logo storage failed', error);
      return failure('The mark could not be stored. Please try again.', { status: 500 });
    }
  } else if (parsed.data.removeLogo) {
    logoDocumentId = null;
  }

  await prisma.receiptTemplate.upsert({
    where: { userId },
    create: {
      userId,
      layout: parsed.data.layout,
      brandName: parsed.data.brandName,
      headerLine: parsed.data.headerLine,
      footerNote: parsed.data.footerNote,
      accentColor: parsed.data.accentColor,
      logoDocumentId,
      showLicence: parsed.data.showLicence,
      showFirm: parsed.data.showFirm,
      showContact: parsed.data.showContact,
    },
    update: {
      layout: parsed.data.layout,
      brandName: parsed.data.brandName,
      headerLine: parsed.data.headerLine,
      footerNote: parsed.data.footerNote,
      accentColor: parsed.data.accentColor,
      logoDocumentId,
      showLicence: parsed.data.showLicence,
      showFirm: parsed.data.showFirm,
      showContact: parsed.data.showContact,
    },
  });

  // The mark that was replaced is no longer referenced by anything.
  if (uploadedDocumentId && existing?.logoDocumentId && existing.logoDocumentId !== uploadedDocumentId) {
    const previous = await prisma.document.findUnique({
      where: { id: existing.logoDocumentId },
      select: { id: true, storageKey: true },
    });
    if (previous) {
      await prisma.document.delete({ where: { id: previous.id } });
      await deleteUpload(previous.storageKey).catch(() => undefined);
    }
  }

  await recordAudit({
    actorUserId: userId,
    action: 'receipt_template.saved',
    entityType: 'receipt_template',
    entityId: userId,
    metadata: {
      layout: parsed.data.layout,
      customMark: Boolean(uploadedDocumentId),
      accentColor: parsed.data.accentColor,
    },
    ip: meta.ip ?? null,
  });

  return success({ layout: parsed.data.layout });
}

/** Returns an account to the standard layout, deleting any mark it uploaded. */
export async function resetReceiptTemplate(
  userId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const existing = await prisma.receiptTemplate.findUnique({
    where: { userId },
    select: { id: true, logoDocumentId: true },
  });
  if (!existing) return success();

  await prisma.receiptTemplate.delete({ where: { id: existing.id } });

  if (existing.logoDocumentId) {
    const document = await prisma.document.findUnique({
      where: { id: existing.logoDocumentId },
      select: { storageKey: true },
    });
    if (document) {
      await prisma.document.delete({ where: { id: existing.logoDocumentId } }).catch(() => undefined);
      await deleteUpload(document.storageKey).catch(() => undefined);
    }
  }

  await recordAudit({
    actorUserId: userId,
    action: 'receipt_template.reset',
    entityType: 'receipt_template',
    entityId: userId,
    ip: meta.ip ?? null,
  });

  return success();
}

/** Tells a professional the letterhead they chose is now in use. */
export async function announceReceiptTemplate(userId: string, layout: string): Promise<void> {
  await notify({
    userId,
    kind: 'receipt_template.saved',
    title:
      layout === 'CUSTOM'
        ? 'Your billing receipt layout is saved'
        : 'Your billing receipts use the standard layout',
    body: 'New fee receipts you raise will use this letterhead. Receipts already issued are unchanged.',
    link: '/receipt-template',
  });
}
