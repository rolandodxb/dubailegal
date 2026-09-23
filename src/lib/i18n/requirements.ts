import type { DocumentRequest, DocumentRules } from '@/lib/document-requirements';
import { countryByCode } from '@/lib/countries';
import type { Dictionary } from './en';
import type { Locale } from './locales';
import { countryName } from './country-names';
import { messageTranslator } from './messages';

/**
 * The document requirements, said in the reader's language.
 *
 * `lib/document-requirements.ts` decides *which* documents a member is asked for
 * and records why, as a code plus the country codes the sentence needs. This turns
 * that into the words — including the country names, which come from a separate
 * per-language list so that a Spanish reader is told "Alemania" rather than
 * "Germany" inside an otherwise Spanish sentence.
 *
 * Every English sentence produced here is character-for-character what the module
 * produced before the sentences were moved into the dictionary, because a test
 * suite asserts on several of them.
 */

/** Fills `{name}` placeholders, leaving an unknown one visible rather than blank. */
function fill(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => vars[key] ?? whole);
}

/** The country's name in this language, given only its code. */
function nameFor(locale: Locale, code: string | undefined): string | undefined {
  if (!code) return undefined;
  const country = countryByCode(code);
  return countryName(locale, code, country?.name ?? code);
}

export type RequirementText = {
  label: string;
  why: string;
  legalisationNote?: string;
};

export function requirementText(
  t: Dictionary,
  locale: Locale,
  request: DocumentRequest,
  rules: DocumentRules,
): RequirementText {
  const r = t.requirements;
  const origin = nameFor(locale, request.vars?.origin);
  const residence = nameFor(locale, request.vars?.residence);
  // The country whose document is being asked for is the origin for an identity
  // document and the residence for a residence permit, which is why the dictionary
  // takes both and the rule says which one it means.
  const country = origin ?? residence;
  const vars = {
    origin,
    residence,
    country,
    card: request.vars?.card,
    permit: request.vars?.permit,
  };

  let label: string;
  let why: string;

  switch (request.code) {
    case 'emiratesId':
      label = r.emiratesId.label;
      why = r.emiratesId.why;
      break;

    case 'unknownOrigin':
      label = r.unknownOrigin.label;
      why = r.unknownOrigin.why;
      break;

    case 'originIdentity':
      label = fill(
        request.vars?.card ? r.originIdentity.labelWithCard : r.originIdentity.labelPassport,
        vars,
      );
      why = fill(request.vars?.card ? r.originIdentity.whyWithCard : r.originIdentity.whyNoCard, vars);
      break;

    case 'residence':
      label = fill(
        request.vars?.permit ? r.residence.labelWithPermit : r.residence.labelGeneric,
        vars,
      );
      why = fill(r.residence.why, vars);
      break;

    case 'residenceDeclaredMissing':
      label = fill(r.residenceDeclaredMissing.label, vars);
      why = r.residenceDeclaredMissing.why;
      break;

    case 'licence':
      label = origin ? fill(r.licence.labelIn, vars) : r.licence.labelGeneric;
      why = origin ? fill(r.licence.whyIn, vars) : r.licence.whyGeneric;
      break;

    case 'practiceAuthorisation':
      label = fill(r.practiceAuthorisation.label, vars);
      why = fill(r.practiceAuthorisation.why, vars);
      break;

    case 'firmRegistration':
      label = residence ? fill(r.firmRegistration.labelIn, vars) : r.firmRegistration.labelGeneric;
      why = r.firmRegistration.why;
      break;

    case 'firmAuthority':
      label = r.firmAuthority.label;
      why = r.firmAuthority.why;
      break;

    case 'photograph':
      label = r.photograph.label;
      why = r.photograph.why;
      break;
  }

  return {
    label,
    why,
    legalisationNote: legalisationNote(t, locale, request, rules),
  };
}

/**
 * The note that warns a document issued abroad will need an apostille or a sworn
 * translation. Only the two identity requests ever carry one.
 */
function legalisationNote(
  t: Dictionary,
  locale: Locale,
  request: DocumentRequest,
  rules: DocumentRules,
): string | undefined {
  if (!request.legalisationNote) return undefined;

  const origin = rules.origin;
  const residence = rules.residence;
  if (!origin || !residence) return request.legalisationNote;

  const vars = {
    origin: countryName(locale, origin.code, origin.name),
    residence: countryName(locale, residence.code, residence.name),
  };
  const template =
    origin.apostille && residence.apostille
      ? t.requirements.legalisation.apostille
      : t.requirements.legalisation.consular;

  return fill(template, vars);
}

/**
 * What is still missing, said in the reader's language.
 *
 * `missingRequirements` in `lib/document-requirements.ts` answers the same
 * question but can only hand back the English label it stored. This walks the
 * same rules with the same three filters and renders each missing one properly,
 * so the two cannot drift: both skip a request whose alternatives are already
 * uploaded, and both skip a residence permit the member has declared they do not
 * hold yet.
 */
export function missingRequirementTexts(
  t: Dictionary,
  locale: Locale,
  rules: DocumentRules,
  uploaded: string[],
): { label: string; kinds: DocumentRequest['kinds'] }[] {
  const present = new Set(uploaded);
  return rules.requests
    .filter((request) => request.kinds.length > 0 && request.kinds[0] !== 'PROFILE_PHOTO')
    .filter((request) => !(request.mayBeDeclaredMissing && rules.declaredNoResidencePermit))
    .filter((request) => !request.kinds.some((kind) => present.has(kind)))
    .map((request) => ({ label: requirementText(t, locale, request, rules).label, kinds: request.kinds }));
}

/**
 * One thing standing between a member and verification, in their language.
 *
 * Most blockers are a fixed sentence, which the message catalogue already knows.
 * The one about documents is not: it names the documents this particular member
 * still owes, and those names depend on where they were born, what nationality
 * they hold and where they live. So it travels as a code with the requests
 * attached, and is composed here.
 */
export type VerificationBlocker =
  | { kind: 'text'; text: string }
  | { kind: 'documents'; requests: DocumentRequest[] };

/** Renders one blocker in the reader's language. */
export function blockerText(
  t: Dictionary,
  locale: Locale,
  blocker: VerificationBlocker,
  rules: DocumentRules,
): string {
  if (blocker.kind === 'text') return messageTranslator(locale)(blocker.text);

  const items = blocker.requests
    .map((request) => requirementText(t, locale, request, rules).label)
    .join('; ');

  return fill(t.requirements.blockerDocuments.text, { items });
}

/** The whole list, in the reader's language. */
export function blockerTexts(
  t: Dictionary,
  locale: Locale,
  blockers: VerificationBlocker[],
  rules: DocumentRules,
): string[] {
  return blockers.map((blocker) => blockerText(t, locale, blocker, rules));
}
