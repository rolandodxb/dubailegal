// ─────────────────────────────────────────────────────────────────────────────
// Shared domain constants.
//
// Reference data (emirates, practice areas, document types) is allowed to be
// static: it describes the world, not a user. No record of a person or firm is
// ever defined here.
// ─────────────────────────────────────────────────────────────────────────────

import type { AccountType, DocumentKind, Emirate, LegalArea } from '@prisma/client';

export const ACCOUNT_TYPES: AccountType[] = ['USER', 'LAWYER', 'FIRM'];

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  USER: 'Individual',
  LAWYER: 'Lawyer',
  FIRM: 'Legal firm',
};

export const ACCOUNT_TYPE_DESCRIPTION: Record<AccountType, string> = {
  USER: 'Looking for legal help, or managing your own legal matters.',
  LAWYER:
    'A licensed legal professional providing legal representation in the UAE.',
  FIRM: 'A licensed law firm or legal consultancy registered in the UAE.',
};

// ── Emirates ────────────────────────────────────────────────────────────────

export const EMIRATES: { value: Emirate; label: string; labelAr: string }[] = [
  { value: 'ABU_DHABI', label: 'Abu Dhabi', labelAr: 'أبوظبي' },
  { value: 'DUBAI', label: 'Dubai', labelAr: 'دبي' },
  { value: 'SHARJAH', label: 'Sharjah', labelAr: 'الشارقة' },
  { value: 'AJMAN', label: 'Ajman', labelAr: 'عجمان' },
  { value: 'UMM_AL_QUWAIN', label: 'Umm Al Quwain', labelAr: 'أم القيوين' },
  { value: 'RAS_AL_KHAIMAH', label: 'Ras Al Khaimah', labelAr: 'رأس الخيمة' },
  { value: 'FUJAIRAH', label: 'Fujairah', labelAr: 'الفجيرة' },
];

export const EMIRATE_VALUES = EMIRATES.map((e) => e.value);

export const EMIRATE_LABEL: Record<Emirate, string> = Object.fromEntries(
  EMIRATES.map((e) => [e.value, e.label]),
) as Record<Emirate, string>;

// ── Practice areas ("legal type") ───────────────────────────────────────────

export const LEGAL_AREAS: { value: LegalArea; label: string; labelAr: string }[] = [
  { value: 'CRIMINAL_PENAL', label: 'Criminal (Penal)', labelAr: 'الجزائي' },
  { value: 'CIVIL', label: 'Civil', labelAr: 'المدني' },
  { value: 'COMMERCIAL', label: 'Commercial', labelAr: 'التجاري' },
  { value: 'FAMILY_PERSONAL_STATUS', label: 'Family & Personal Status', labelAr: 'الأحوال الشخصية' },
  { value: 'LABOUR_EMPLOYMENT', label: 'Labour & Employment', labelAr: 'العمل' },
  { value: 'REAL_ESTATE_PROPERTY', label: 'Real Estate & Property', labelAr: 'العقاري' },
  { value: 'IMMIGRATION_RESIDENCY', label: 'Immigration & Residency', labelAr: 'الهجرة والإقامة' },
  { value: 'ARBITRATION', label: 'Arbitration', labelAr: 'التحكيم' },
  { value: 'INTELLECTUAL_PROPERTY', label: 'Intellectual Property', labelAr: 'الملكية الفكرية' },
  { value: 'BANKING_FINANCE', label: 'Banking & Finance', labelAr: 'المصرفي والمالي' },
  { value: 'TAX', label: 'Tax', labelAr: 'الضرائب' },
  { value: 'ADMINISTRATIVE', label: 'Administrative', labelAr: 'الإداري' },
  { value: 'MARITIME', label: 'Maritime', labelAr: 'البحري' },
  { value: 'CYBERCRIME', label: 'Cybercrime', labelAr: 'الجرائم الإلكترونية' },
  { value: 'OTHER', label: 'Other', labelAr: 'أخرى' },
];

export const LEGAL_AREA_VALUES = LEGAL_AREAS.map((a) => a.value);

export const LEGAL_AREA_LABEL: Record<LegalArea, string> = Object.fromEntries(
  LEGAL_AREAS.map((a) => [a.value, a.label]),
) as Record<LegalArea, string>;

// ── Documents ───────────────────────────────────────────────────────────────

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  EMIRATES_ID: 'Emirates ID',
  PASSPORT: 'Passport',
  PROFILE_PHOTO: 'Profile photo',
  LAWYER_LICENSE: 'Legal representation permit / licence',
  FIRM_TRADE_LICENSE: 'Firm trade licence',
  POWER_OF_ATTORNEY: 'Power of attorney',
  PROFESSIONAL_INDEMNITY_INSURANCE: 'Professional indemnity insurance',
  BRAND_LOGO: 'Billing receipt mark',
  OTHER: 'Other supporting document',
  NATIONAL_ID: 'National identity card',
  RESIDENCE_PERMIT: 'Residence permit',
  PRACTICE_AUTHORISATION: 'Permission to practise law',
};

export const DOCUMENT_KIND_HINT: Record<DocumentKind, string> = {
  EMIRATES_ID: 'Front and back of your Emirates ID.',
  NATIONAL_ID: 'Front and back of your national identity card.',
  PASSPORT: 'The page with your photograph and the machine-readable strip.',
  RESIDENCE_PERMIT: 'The permit that lets you live where you live, or the page in your passport that records it.',
  LAWYER_LICENSE: 'The licence issued by the authority that admitted you to practise.',
  PRACTICE_AUTHORISATION: 'Permission to practise in the country where you work, if that is not where you qualified.',
  FIRM_TRADE_LICENSE: 'The registration of the firm where it operates.',
  POWER_OF_ATTORNEY: 'The authority of the person opening the account for the firm.',
  PROFESSIONAL_INDEMNITY_INSURANCE: 'Optional. Your professional indemnity cover, where you hold it.',
  PROFILE_PHOTO: 'Optional. Shown on your profile and directory listing.',
  BRAND_LOGO: 'Optional. The mark printed on your own billing receipts.',
  OTHER: 'Anything else that supports your request. Say what it is.',
};

/**
 * Which evidence each account type must supply before it can be submitted for
 * verification. Enforced server-side in src/server/services/verification.ts —
 * the UI only mirrors these lists.
 *
 * FIRM requires everything LAWYER requires, plus the firm's own registration.
 */
export const DOCUMENT_REQUIREMENTS: Record<
  AccountType,
  { required: DocumentKind[]; optional: DocumentKind[] }
> = {
  USER: {
    required: ['EMIRATES_ID'],
    optional: ['PASSPORT', 'PROFILE_PHOTO'],
  },
  LAWYER: {
    required: ['EMIRATES_ID', 'LAWYER_LICENSE'],
    optional: ['PASSPORT', 'PROFESSIONAL_INDEMNITY_INSURANCE', 'PROFILE_PHOTO'],
  },
  FIRM: {
    required: ['EMIRATES_ID', 'LAWYER_LICENSE', 'FIRM_TRADE_LICENSE'],
    optional: ['POWER_OF_ATTORNEY', 'PROFESSIONAL_INDEMNITY_INSURANCE', 'PROFILE_PHOTO'],
  },
};

// ── Verification badges ─────────────────────────────────────────────────────
//
// A badge is rendered only when User.verificationStatus === 'APPROVED', which
// can only be set by a reviewer recording a decision. Colour is chosen by
// account type, per the product specification.

export const BADGE = {
  USER: { color: '#1D9BF0', label: 'Verified account' },
  LAWYER: { color: '#16A34A', label: 'Verified lawyer' },
  FIRM: { color: '#0A0A0A', label: 'Verified legal firm' },
} as const satisfies Record<AccountType, { color: string; label: string }>;

export const VERIFICATION_STATUS_LABEL = {
  UNVERIFIED: 'Not verified',
  PENDING: 'Submitted, awaiting review',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Verified',
  REJECTED: 'Not approved',
} as const;

/**
 * Labels for a *verification request* lifecycle.
 *
 * Deliberately named apart from legal cases: a verification request is an
 * account submitting documents to be checked, which is a different thing from a
 * client's case against a lawyer. The two must never share vocabulary in the UI.
 */
export const VERIFICATION_REQUEST_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted, waiting to be picked up',
  UNDER_REVIEW: 'Being reviewed',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  WITHDRAWN: 'Withdrawn',
};

// ── Legal cases (client work) ───────────────────────────────────────────────

export const LEGAL_CASE_STATUS_ORDER = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'DECLINED',
] as const;

export type LegalCaseStatusValue = (typeof LEGAL_CASE_STATUS_ORDER)[number];

export const LEGAL_CASE_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  DECLINED: 'Declined',
};

export const LEGAL_CASE_STATUS_STYLE: Record<string, string> = {
  SUBMITTED: 'bg-brand-50 text-brand-800 ring-brand-200',
  UNDER_REVIEW: 'bg-amber-50 text-amber-900 ring-amber-200',
  ASSIGNED: 'bg-green-50 text-green-800 ring-green-200',
  IN_PROGRESS: 'bg-green-50 text-green-800 ring-green-200',
  COMPLETED: 'bg-slate-100 text-slate-700 ring-slate-200',
  DECLINED: 'bg-red-50 text-red-800 ring-red-200',
};

/** Statuses that mean the professional is actively working the case. */
export const ONGOING_CASE_STATUSES = ['ASSIGNED', 'IN_PROGRESS'] as const;

// ── Appointment diary ───────────────────────────────────────────────────────

/**
 * Working hours used to build the bookable slots shown in the calendar.
 * A slot is offered only if the lawyer has nothing booked in it.
 */
export const WORKING_HOURS = { startHour: 9, endHour: 17 } as const;
export const SLOT_MINUTES = 60;
export const MAX_CASE_FILES = 8;

// ── Uploads ─────────────────────────────────────────────────────────────────

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

/**
 * What may be sent through a case conversation.
 *
 * Wider than what may be uploaded as evidence, because a client and their lawyer
 * routinely need to pass each other a bundle: a scan, a spreadsheet, a zip of
 * emails. Archives are accepted and are always served as a download, never
 * rendered, which is what makes them safe to accept. Everything is sniffed by its
 * magic bytes, so a file claiming to be a PDF but containing something else is
 * refused whatever its name says.
 */
export const MAX_CHAT_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_CHAT_ATTACHMENTS_PER_MESSAGE = 5;

export const ALLOWED_CHAT_MIME_TYPES = [
  ...ALLOWED_UPLOAD_MIME_TYPES,
  'application/zip',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Media, which is what a call recording is and what a client sometimes needs
  // to send: a video of the damage, a voice note from a meeting.
  'video/webm',
  'video/mp4',
  'video/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
] as const;

export const ALLOWED_CHAT_EXTENSIONS = [
  ...ALLOWED_UPLOAD_EXTENSIONS,
  '.zip',
  '.rar',
  '.7z',
  '.gz',
  '.tar',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.webm',
  '.mp4',
  '.m4a',
  '.ogg',
];

// ── Misc ────────────────────────────────────────────────────────────────────

export const MIN_PASSWORD_LENGTH = 10;
export const DIRECTORY_PAGE_SIZE = 12;
