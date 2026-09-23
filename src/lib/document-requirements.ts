import type { AccountType, DocumentKind } from '@prisma/client';
import { countryByCode, sameCountry, type Country } from './countries';

/**
 * Which documents to ask for, and why.
 *
 * The platform is used by people who were born in one country and live in
 * another, so a fixed list of documents cannot be right for everybody. The rule
 * is built from three facts about the member — where they were born, whose
 * nationality they hold, and where they live — plus what they are here to do.
 *
 * Three principles run through it:
 *
 *   1. **Never ask for something a country does not issue.** Where a national
 *      identity card is not known to exist, a passport is asked for instead. A
 *      passport is the one document every country issues, so there is always a
 *      way to satisfy the requirement.
 *   2. **A document issued in another country is noted as such.** An Argentine
 *      DNI presented in Spain generally needs an apostille and a sworn
 *      translation before a Spanish authority will read it, so the member is told
 *      that up front rather than after a rejection.
 *   3. **A residence permit can be declared missing.** Somebody who holds the
 *      documents of their own country but has not yet been granted residency
 *      where they live can say so, and that is recorded rather than held against
 *      them. It is the ordinary situation of somebody who has just moved.
 */

/**
 * Which sentence describes a requirement.
 *
 * The words themselves live in the dictionary, because they have to be readable
 * in more than one language; the rule only says which sentence applies and what
 * it has to be told. Keeping the two apart is what stops a country's name and a
 * document's name being frozen into English the moment a rule is built.
 */
export type RequirementCode =
  | 'emiratesId'
  | 'unknownOrigin'
  | 'originIdentity'
  | 'residence'
  | 'residenceDeclaredMissing'
  | 'licence'
  | 'practiceAuthorisation'
  | 'firmRegistration'
  | 'firmAuthority'
  | 'photograph';

/** One thing the member is asked for, with the words shown to them. */
export type DocumentRequest = {
  /** Which dictionary sentence describes this. */
  code: RequirementCode;
  /** Any one of these satisfies the requirement. */
  kinds: DocumentKind[];
  /** The English wording, kept for tests and for anything that needs no locale. */
  label: string;
  why: string;
  /**
   * What the sentence interpolates: country codes for the countries being named,
   * and the plain names of the identity card and residence permit involved, which
   * are data rather than prose.
   */
  vars?: { origin?: string; residence?: string; card?: string; permit?: string };
  /** Shown when the document must come from outside the country of residence. */
  legalisationNote?: string;
  /** True when the member may declare they do not hold it yet. */
  mayBeDeclaredMissing?: boolean;
};

export type DocumentRules = {
  requests: DocumentRequest[];
  /** True when the member lives outside the country whose nationality they hold. */
  crossBorder: boolean;
  /** The country their identity documents come from. */
  origin: Country | null;
  residence: Country | null;
  /** What the member declared about a residence permit. */
  declaredNoResidencePermit: boolean;
};

export type MemberCountries = {
  accountType: AccountType;
  countryOfBirthCode?: string | null;
  nationalityCode?: string | null;
  countryOfResidenceCode?: string | null;
  declaresNoResidencePermit?: boolean;
};

/**
 * Documents issued in one country and read in another nearly always need an
 * apostille, and often a translation by a sworn translator. This is the note that
 * says so.
 */
function legalisationNoteFor(origin: Country | null, residence: Country | null): string | undefined {
  if (!origin || !residence || origin.code === residence.code) return undefined;

  const bothApostille = origin.apostille && residence.apostille;
  return bothApostille
    ? `Issued in ${origin.name}, read in ${residence.name}: it will normally need an apostille, and a translation by a sworn translator if it is not in the local language.`
    : `Issued in ${origin.name}, read in ${residence.name}: it will normally need legalisation by the ${residence.name} consulate or a sworn translation — ${origin.name} and ${residence.name} do not both take part in the Apostille Convention.`;
}

/**
 * The documents this member must provide.
 *
 * `countryOfBirthCode` drives which identity document is asked for; a residence
 * permit follows from living somewhere other than the country of nationality,
 * and a second practising authorisation from a lawyer qualified in one country
 * and working in another.
 */
export function documentRulesFor(member: MemberCountries): DocumentRules {
  const originCountry =
    countryByCode(member.nationalityCode) ?? countryByCode(member.countryOfBirthCode);
  const residenceCountry = countryByCode(member.countryOfResidenceCode);

  const crossBorder =
    Boolean(residenceCountry) &&
    Boolean(originCountry) &&
    !sameCountry(originCountry?.code, residenceCountry?.code);

  const requests: DocumentRequest[] = [];

  // ── Identity ──────────────────────────────────────────────────────────────
  //
  // The United Arab Emirates is where the platform began, so its Emirates ID is
  // the identity document and the residence permit in one; a member whose country
  // is not yet recorded is treated the same way, which also means an existing
  // account is never asked for something new. Anywhere else, the national card is
  // offered as an alternative to the passport, and a passport is always accepted.
  const isEmirates = sameCountry(originCountry?.code, 'AE') || sameCountry(residenceCountry?.code, 'AE');

  if (isEmirates) {
    requests.push({
      code: 'emiratesId',
      kinds: ['EMIRATES_ID'],
      label: 'Emirates ID',
      why: 'The Emirates ID is both the identity document and the residence permit in the United Arab Emirates.',
    });
  } else if (!originCountry) {
    requests.push({
      code: 'unknownOrigin',
      kinds: ['EMIRATES_ID', 'PASSPORT', 'NATIONAL_ID'],
      label: 'Passport, or the identity card you hold',
      why: 'Tell us where you were born and which nationality you hold, and this becomes the exact document for your country. Until then, a passport or a national identity card is accepted.',
    });
  } else {
    requests.push({
      code: 'originIdentity',
      vars: {
        origin: originCountry.code,
        ...(originCountry.nationalId ? { card: originCountry.nationalId } : {}),
      },
      kinds: originCountry.nationalId ? ['NATIONAL_ID', 'PASSPORT'] : ['PASSPORT'],
      label: originCountry.nationalId
        ? `${originCountry.name}: ${originCountry.nationalId} or passport`
        : `${originCountry.name}: passport`,
      why: `To confirm that you are who you say you are. ${
        originCountry.nationalId
          ? `A passport is accepted from every country, so either your ${originCountry.nationalId} or your passport will do.`
          : `${originCountry.name} does not issue a national identity card, so a passport is the document to provide.`
      }`,
    });
  }

  // ── Residence ─────────────────────────────────────────────────────────────
  if (crossBorder && residenceCountry) {
    const declared = member.declaresNoResidencePermit === true;
    requests.push({
      code: 'residence',
      vars: {
        origin: originCountry?.code,
        residence: residenceCountry.code,
        ...(residenceCountry.residencePermit ? { permit: residenceCountry.residencePermit } : {}),
      },
      kinds: ['RESIDENCE_PERMIT'],
      label: residenceCountry.residencePermit
        ? `${residenceCountry.name}: ${residenceCountry.residencePermit}`
        : `${residenceCountry.name}: residence permit`,
      why: `You hold the nationality of ${originCountry?.name ?? 'one country'} and live in ${residenceCountry.name}, so permission to live there is what ties the two together.`,
      // A residence permit is the one document a member may simply not have yet,
      // which is the ordinary situation of somebody who has just moved. Declaring
      // it waives the requirement rather than failing it.
      mayBeDeclaredMissing: member.accountType === 'USER',
      legalisationNote: undefined,
    });
    if (declared && member.accountType === 'USER') {
      requests.push({
        code: 'residenceDeclaredMissing',
        vars: { residence: residenceCountry.code },
        kinds: [],
        label: `Noted: no ${residenceCountry.name} residence permit yet`,
        why: 'You have said you do not hold one yet. That is recorded, it does not stop your account being verified, and you can add it later — you will simply be able to do less until you do.',
      });
    }
  }

  // ── Practising law ────────────────────────────────────────────────────────
  if (member.accountType === 'LAWYER' || member.accountType === 'FIRM') {
    requests.push({
      code: 'licence',
      vars: { origin: originCountry?.code },
      kinds: ['LAWYER_LICENSE'],
      label: originCountry
        ? `Licence to practise law issued in ${originCountry.name}`
        : 'Licence to practise law',
      why: originCountry
        ? `${originCountry.name} issues the qualification you hold, so it is the authority that can confirm it.`
        : 'The authority that admitted you is the only body that can confirm your qualification.',
      legalisationNote: legalisationNoteFor(originCountry, residenceCountry),
    });

    if (crossBorder && residenceCountry) {
      requests.push({
        code: 'practiceAuthorisation',
        vars: { origin: originCountry?.code, residence: residenceCountry.code },
        kinds: ['PRACTICE_AUTHORISATION'],
        label: `Permission to practise in ${residenceCountry.name}`,
        why: `You were admitted in ${originCountry?.name ?? 'another country'} and practise in ${residenceCountry.name}. Practising there normally requires admission or authorisation from its own authorities as well.`,
        legalisationNote: legalisationNoteFor(originCountry, residenceCountry),
      });
    }
  }

  if (member.accountType === 'FIRM') {
    requests.push({
      code: 'firmRegistration',
      vars: { residence: residenceCountry?.code },
      kinds: ['FIRM_TRADE_LICENSE'],
      label: residenceCountry
        ? `Registration of the firm in ${residenceCountry.name}`
        : 'Registration of the firm',
      why: 'A firm is a business before it is a practice, so its registration where it operates is what proves it exists.',
      legalisationNote: legalisationNoteFor(residenceCountry, residenceCountry),
    });
    requests.push({
      code: 'firmAuthority',
      kinds: ['POWER_OF_ATTORNEY'],
      label: 'Authorisation of the person registering the firm',
      why: 'The account is being opened on behalf of a firm, so the authority of the person doing it has to be shown.',
    });
  }

  // Photographs are never evidence and always optional.
  requests.push({
    code: 'photograph',
    kinds: ['PROFILE_PHOTO'],
    label: 'Profile photograph',
    why: 'Shown beside your name. It is not evidence of anything, and it is never required.',
  });

  return {
    requests,
    crossBorder,
    origin: originCountry,
    residence: residenceCountry,
    declaredNoResidencePermit: member.declaresNoResidencePermit === true,
  };
}

/** The kinds a submission must contain at least one approved document of. */
export function requiredKinds(rules: DocumentRules): DocumentKind[] {
  return rules.requests
    .filter((request) => request.kinds.length > 0 && request.kinds[0] !== 'PROFILE_PHOTO')
    .filter((request) => !(request.mayBeDeclaredMissing && rules.declaredNoResidencePermit))
    .flatMap((request) => request.kinds);
}

/** The kinds that are accepted but not demanded. */
export function optionalKinds(rules: DocumentRules): DocumentKind[] {
  return ['PROFILE_PHOTO', 'PASSPORT', 'PROFESSIONAL_INDEMNITY_INSURANCE', 'BRAND_LOGO', 'OTHER'];
}

/**
 * The requests a set of uploaded kinds does not yet satisfy.
 *
 * Whole requests rather than their labels: the caller that only wants to name them
 * reads `.label`, and the caller that has to *say* them in the reader's language
 * needs the code and the country codes the sentence is built from. A request with
 * alternatives is satisfied by any one of them, which is what lets a country that
 * issues no identity card be verified with a passport alone.
 */
export function missingRequirements(
  rules: DocumentRules,
  uploaded: DocumentKind[],
): DocumentRequest[] {
  const present = new Set(uploaded);
  return rules.requests
    .filter((request) => request.kinds.length > 0 && request.kinds[0] !== 'PROFILE_PHOTO')
    .filter((request) => !(request.mayBeDeclaredMissing && rules.declaredNoResidencePermit))
    .filter((request) => !request.kinds.some((kind) => present.has(kind)));
}

/**
 * The same answer as `DOCUMENT_REQUIREMENTS`, but for a particular member.
 *
 * `DOCUMENT_REQUIREMENTS` in `lib/constants.ts` answers "what does a lawyer need
 * in the United Arab Emirates" — it is the platform's original, single-country
 * answer and it says EMIRATES_ID for everybody. A member in Argentina needs a DNI
 * or a passport; asking them for an Emirates ID is asking for a document their
 * country does not issue, which is what the rules above exist to prevent. This is
 * the drop-in that uses them.
 */
export function documentRequirementsFor(member: MemberCountries): {
  required: DocumentKind[];
  optional: DocumentKind[];
} {
  const rules = documentRulesFor(member);
  const required = rules.requests
    .filter((request) => request.kinds.length > 0 && request.kinds[0] !== 'PROFILE_PHOTO')
    .filter((request) => !(request.mayBeDeclaredMissing && rules.declaredNoResidencePermit))
    .flatMap((request) => request.kinds);

  return { required: [...new Set(required)], optional: optionalKinds(rules) };
}
