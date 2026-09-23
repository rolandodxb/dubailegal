import { z } from 'zod';
import { ALL_COUNTRIES } from './countries';

const ALL_COUNTRY_CODES = new Set(ALL_COUNTRIES.map((country) => country.code));
import { AccountType, Emirate, LegalArea } from '@prisma/client';
import { MIN_PASSWORD_LENGTH } from './constants';
import {
  hasValidEmiratesIdFormat,
  normaliseEmiratesId,
  normaliseIdentityNumber,
} from './emirates-id';
import { parseDateInput } from './format';

// ── Primitives ───────────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .trim()
  .min(3, 'Enter your email address.')
  .max(254, 'That email address is too long.')
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(200, 'That password is too long.')
  .refine((value) => /[A-Za-z]/.test(value), 'Include at least one letter.')
  .refine((value) => /\d/.test(value), 'Include at least one number.');

/** Form inputs arrive as strings, '' or null; normalise all of them to string|null. */
function optionalString(max: number, label = 'This field') {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .refine(
      (value) => value === null || value.length <= max,
      `${label} must be ${max} characters or fewer.`,
    );
}

function requiredString(min: number, max: number, label: string) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (typeof value === 'string' ? value.trim() : ''))
    .refine((value) => value.length >= min, `${label} is required.`)
    .refine((value) => value.length <= max, `${label} must be ${max} characters or fewer.`);
}

function optionalDate(label: string) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (typeof value !== 'string' || value.trim().length === 0) return null;
      const parsed = parseDateInput(value);
      if (!parsed) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a valid date.` });
        return z.NEVER;
      }
      return parsed;
    });
}

/**
 * The member's identity document number.
 *
 * Required, because a reviewer has to be able to check identity, but not
 * necessarily an Emirates ID: the platform is used worldwide, so a passport or
 * national card number is accepted. A number that begins 784 *is* an Emirates ID,
 * and that one is held to the exact 15-digit form — the requirement follows the
 * document rather than the other way round.
 */
export const emiratesIdSchema = z
  .string()
  .trim()
  .min(1, 'Your identity document number is required.')
  .transform((value) => normaliseEmiratesId(value) ?? normaliseIdentityNumber(value) ?? value)
  .refine(
    (value) => !value.startsWith('784') || hasValidEmiratesIdFormat(value),
    'A number beginning 784 is an Emirates ID. Enter all 15 digits, e.g. 784-1990-1234567-1.',
  )
  .refine(
    (value) => normaliseIdentityNumber(value) !== null,
    'Enter the number exactly as printed on the document.',
  );

function optionalWebsite() {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (trimmed.length === 0) return null;
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    })
    .refine((value) => {
      if (value === null) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, 'Enter a valid website address, e.g. https://example.ae.');
}

function optionalPhone() {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .refine(
      (value) => value === null || /^\+?[\d\s()-]{7,20}$/.test(value),
      'Enter a valid phone number, e.g. +971 50 123 4567.',
    );
}

/** A phone number that must be given — what the account form asks for. */
/** A country code that must exist in the list the picker offers. */
function optionalCountryCode(label: string) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) return null;
      const trimmed = String(value).trim().toUpperCase();
      return trimmed.length === 0 ? null : trimmed;
    })
    .refine(
      (code) => code === null || ALL_COUNTRY_CODES.has(code),
      `${label}: choose a country from the list.`,
    );
}

const phoneSchema = z
  .string({ required_error: 'Enter a phone number.' })
  .trim()
  .min(7, 'Enter a valid phone number, e.g. +971 50 123 4567.')
  .max(20, 'That phone number is too long.')
  .refine(
    (value) => /^\+?[\d\s()-]{7,20}$/.test(value),
    'Enter a valid phone number, e.g. +971 50 123 4567.',
  );

function optionalYearCount(label: string, max: number) {
  return z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
      if (Number.isNaN(parsed)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a number.` });
        return z.NEVER;
      }
      if (parsed < 0 || parsed > max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be between 0 and ${max}.` });
        return z.NEVER;
      }
      return parsed;
    });
}

// ── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Creating an account asks for the least it can.
 *
 * A name, an email address and a phone number are enough to open an account and
 * to be reachable about it. Everything else — date and place of birth, country of
 * residence, nationality, the Emirates ID, the work and education history, and
 * the documents themselves — is asked for in the verification tab, where it has
 * a purpose and where a reviewer is waiting to read it. Asking for an identity
 * document in the same breath as a password is how a form becomes a wall.
 */
export const registerSchema = z
  .object({
    accountType: z.nativeEnum(AccountType, {
      errorMap: () => ({ message: 'Choose how you will use Legal Dash.' }),
    }),
    fullName: requiredString(2, 120, 'Full name'),
    phone: phoneSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z
      .union([z.string(), z.boolean(), z.undefined()])
      .transform((value) => value === true || value === 'on' || value === 'true')
      .refine((value) => value === true, 'You must accept the terms to create an account.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match.',
  })
  .refine((data) => data.password.toLowerCase() !== data.email.toLowerCase(), {
    path: ['password'],
    message: 'Your password cannot be the same as your email address.',
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, 'This reset link is not valid.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match.',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match.',
  });

// ── Profile ──────────────────────────────────────────────────────────────────

export const profileSchema = z
  .object({
    fullName: requiredString(2, 120, 'Full name'),
    /**
     * The three countries that decide which documents are asked for. Stored as
     * ISO codes, because "United Arab Emirates", "UAE" and "Emiratos Árabes"
     * are the same country and rules cannot be written against free text.
     */
    countryOfBirthCode: optionalCountryCode('Country of birth'),
    nationalityCode: optionalCountryCode('Nationality'),
    countryOfResidenceCode: optionalCountryCode('Country of residence'),
    declaresNoResidencePermit: z
      .union([z.string(), z.boolean(), z.undefined()])
      .transform((value) => value === true || value === 'on' || value === 'true'),
    dateOfBirth: optionalDate('Date of birth'),
    placeOfBirth: optionalString(120, 'Place of birth'),
    countryOfResidence: optionalString(80, 'Country of residence'),
    nationality: optionalString(80, 'Nationality'),
    phone: optionalPhone(),
    emiratesIdNumber: emiratesIdSchema,
    emiratesIdExpiry: optionalDate('Emirates ID expiry'),
    workDescription: optionalString(2000, 'Work description'),
    educationBackground: optionalString(2000, 'Education background'),
  })
  .superRefine((data, ctx) => {
    if (data.dateOfBirth) {
      const now = new Date();
      if (data.dateOfBirth > now) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateOfBirth'], message: 'Date of birth cannot be in the future.' });
      } else {
        const earliest = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
        if (data.dateOfBirth < earliest) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateOfBirth'], message: 'Please check the date of birth.' });
        }
      }
    }
    if (data.emiratesIdExpiry) {
      const earliest = new Date(2000, 0, 1);
      if (data.emiratesIdExpiry < earliest) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['emiratesIdExpiry'], message: 'Please check the expiry date.' });
      }
    }

    // The identity document is the one the member's own country issues, so the
    // rule follows the country of nationality (or birth, where nationality is not
    // given). A country that has not been recorded yet is treated as the United
    // Arab Emirates, which is the same forgiving-but-strict default the document
    // rules use — so an account that has said nothing is never waved through.
    const issuingCountry = data.nationalityCode ?? data.countryOfBirthCode ?? null;
    if (issuingCountry === null || issuingCountry === 'AE') {
      if (!hasValidEmiratesIdFormat(data.emiratesIdNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['emiratesIdNumber'],
          message:
            'Enter the 15-digit Emirates ID exactly as printed, e.g. 784-1990-1234567-1. Choose your nationality above if your identity document is from another country.',
        });
      }
    }
  });

// ── Credentials ──────────────────────────────────────────────────────────────

export const lawyerCredentialSchema = z.object({
  licenseNumber: requiredString(2, 80, 'Licence number'),
  licensingAuthority: requiredString(2, 160, 'Licensing authority'),
  licenseIssuedOn: optionalDate('Issue date'),
  licenseExpiresOn: optionalDate('Expiry date'),
  yearsOfExperience: optionalYearCount('Years of experience', 80),
  barAssociationNumber: optionalString(80, 'Bar association number'),
  // Where a client sends a fee. Optional here so an existing profile can still
  // be saved; a fee request cannot be raised until the four that matter are set.
  bankAccountName: optionalString(160, 'Account holder name'),
  bankName: optionalString(160, 'Bank name'),
  bankIban: optionalString(40, 'IBAN'),
  bankAccountNumber: optionalString(40, 'Account number'),
  bankSwift: optionalString(20, 'SWIFT / BIC'),
  bankBranch: optionalString(160, 'Branch'),
  bankInstructions: optionalString(1000, 'Transfer instructions'),
});

export const firmCredentialSchema = z.object({
  legalName: requiredString(2, 200, 'Registered legal name'),
  tradeLicenseNumber: requiredString(2, 80, 'Trade licence number'),
  tradeLicenseAuthority: requiredString(2, 160, 'Licensing authority'),
  tradeLicenseIssuedOn: optionalDate('Issue date'),
  tradeLicenseExpiresOn: optionalDate('Expiry date'),
  legalStructure: optionalString(80, 'Legal structure'),
  registeredEmirate: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (typeof value !== 'string' || value.trim().length === 0) return null;
      if (!(value in Emirate)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose a UAE emirate.' });
        return z.NEVER;
      }
      return value as Emirate;
    }),
  registeredAddress: optionalString(300, 'Registered address'),
  website: optionalWebsite(),
  firmSize: optionalYearCount('Number of lawyers', 5000),
  authorisedSignatory: optionalString(160, 'Authorised signatory'),
  // Where a client sends a fee. Optional here so an existing profile can still
  // be saved; a fee request cannot be raised until the four that matter are set.
  bankAccountName: optionalString(160, 'Account holder name'),
  bankName: optionalString(160, 'Bank name'),
  bankIban: optionalString(40, 'IBAN'),
  bankAccountNumber: optionalString(40, 'Account number'),
  bankSwift: optionalString(20, 'SWIFT / BIC'),
  bankBranch: optionalString(160, 'Branch'),
  bankInstructions: optionalString(1000, 'Transfer instructions'),
});

// ── Directory listing ────────────────────────────────────────────────────────

export const listingSchema = z
  .object({
    displayName: requiredString(2, 160, 'Display name'),
    headline: optionalString(160, 'Headline'),
    bio: optionalString(3000, 'About'),
    /**
     * Where the professional works, in the worldwide model.
     *
     * A place is described either as an emirate — which is what every listing in the
     * United Arab Emirates does, and what every filter written before the platform
     * went worldwide expects — or as a country and one of its divisions. The two are
     * reconciled below, so a form only ever has to send one of them and the stored
     * row always has both.
     */
    primaryCountryCode: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => {
        const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
        return /^[A-Z]{2}$/.test(code) ? code : null;
      }),
    primaryDivisionCode: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => {
        const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
        return code.length === 0 ? null : code;
      }),
    primaryDistrictCode: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => {
        const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
        return code.length === 0 ? null : code;
      }),
    primaryLocality: optionalString(160, 'Locality'),
    /** Every emirate the professional or firm covers. */
    primaryEmirate: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => (typeof value === 'string' && value in Emirate ? (value as Emirate) : null)),
    emirates: z
      .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
      .transform((value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string' && value.length > 0) return [value];
        return [];
      })
      .refine(
        (values) => values.every((value) => value in Emirate),
        'One of the selected emirates is not recognised.',
      )
      .transform((values) => values as Emirate[]),
    areas: z
      .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
      .transform((value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string' && value.length > 0) return [value];
        return [];
      })
      .refine((values) => values.length > 0, 'Select at least one area of law.')
      .refine(
        (values) => values.every((value) => value in LegalArea),
        'One of the selected areas of law is not recognised.',
      )
      .transform((values) => values as LegalArea[]),
    languages: z
      .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
      .transform((value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return value.split(',');
        return [];
      })
      .transform((values) =>
        values.map((value) => value.trim()).filter((value) => value.length > 0).slice(0, 20),
      )
      .refine((values) => values.length > 0, 'List at least one language you work in.'),
    yearsOfExperience: optionalYearCount('Years of experience', 80),
    acceptsNewClients: z
      .union([z.string(), z.boolean(), z.undefined()])
      .transform((value) => value === true || value === 'on' || value === 'true'),
    published: z
      .union([z.string(), z.boolean(), z.undefined()])
      .transform((value) => value === true || value === 'on' || value === 'true'),
    contactEmail: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim().toLowerCase();
        return trimmed.length === 0 ? null : trimmed;
      })
      .refine(
        (value) => value === null || z.string().email().safeParse(value).success,
        'Enter a valid contact email address.',
      ),
    contactPhone: optionalPhone(),
    website: optionalWebsite(),
    addressLine: optionalString(300, 'Practice address'),
  })
  .refine(
    (data) => data.primaryEmirate === null || data.emirates.includes(data.primaryEmirate),
    {
      path: ['emirates'],
      message: 'The main emirate must also be selected in the list of emirates you cover.',
    },
  )
  .refine(
    (data) =>
      data.primaryCountryCode !== null ||
      data.primaryDivisionCode !== null ||
      data.primaryEmirate !== null ||
      data.emirates.length > 0,
    {
      path: ['primaryCountryCode'],
      message: 'Choose the country you work in.',
    },
  )
  .refine(
    (data) => data.primaryDistrictCode === null || data.primaryDivisionCode === null ||
      data.primaryDistrictCode.startsWith(`${data.primaryDivisionCode}.`),
    {
      path: ['primaryDistrictCode'],
      message: 'That district is not in the province you chose.',
    },
  )
  .refine(
    (data) => data.primaryDivisionCode === null || data.primaryCountryCode === null ||
      data.primaryDivisionCode.startsWith(`${data.primaryCountryCode}.`),
    {
      path: ['primaryDivisionCode'],
      message: 'That province is not in the country you chose.',
    },
  );

// ── Inquiries ────────────────────────────────────────────────────────────────

export const inquirySchema = z.object({
  listingId: z.string().min(1, 'Choose a profile to contact.'),
  subject: requiredString(3, 160, 'Subject'),
  message: requiredString(20, 4000, 'Message'),
});

export const inquiryReplySchema = z.object({
  inquiryId: z.string().min(1),
  replyBody: requiredString(5, 4000, 'Reply'),
});

// ── Reviewer decisions ───────────────────────────────────────────────────────

export const verificationDecisionSchema = z
  .object({
    caseId: z.string().min(1, 'Missing verification case.'),
    decision: z.enum(['APPROVED', 'REJECTED'], {
      errorMap: () => ({ message: 'Choose whether to approve or reject.' }),
    }),
    notes: optionalString(2000, 'Notes'),
  })
  .refine((data) => data.decision !== 'REJECTED' || (data.notes !== null && data.notes.length >= 10), {
    path: ['notes'],
    message: 'Explain what is missing or wrong so the applicant can fix it.',
  });

// ── Directory filters ────────────────────────────────────────────────────────

export const directoryFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  kind: z.union([z.nativeEnum(AccountType), z.literal('ALL')]).optional(),
  areas: z.array(z.nativeEnum(LegalArea)).optional(),
  emirates: z.array(z.nativeEnum(Emirate)).optional(),
  verifiedOnly: z.boolean().optional(),
  acceptsNewClients: z.boolean().optional(),
  page: z.number().int().min(1).max(500).optional(),
});

export type DirectoryFilters = z.infer<typeof directoryFilterSchema>;

/** Collects a zod error into a { field: message } map for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
