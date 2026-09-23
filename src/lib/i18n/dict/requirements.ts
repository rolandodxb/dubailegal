import type { Translated } from '../translated';

/**
 * The sentences that explain which documents are asked for, and why.
 *
 * These are built by `lib/document-requirements.ts` from three facts about a
 * member — where they were born, whose nationality they hold, where they live —
 * so they cannot be stored as fixed sentences. Instead each *kind* of requirement
 * has a template here, and the rule carries a code plus the two country codes the
 * sentence needs. `{country}`, `{origin}`, `{residence}` and `{card}` are filled
 * at render time, in the reader's language, from the same dictionary.
 *
 * The templates are deliberately word-for-word identical to what the English
 * build produced before, because a test suite asserts on some of them.
 */
export const requirementsEn = {
  /** The Emirates ID is identity and residence in one. */
  emiratesId: {
    label: 'Emirates ID',
    why: 'The Emirates ID is both the identity document and the residence permit in the United Arab Emirates.',
  },

  /** Nothing is known about where the member is from yet. */
  unknownOrigin: {
    label: 'Passport, or the identity card you hold',
    why: 'Tell us where you were born and which nationality you hold, and this becomes the exact document for your country. Until then, a passport or a national identity card is accepted.',
  },

  /** A country whose national card is known to exist. */
  originIdentity: {
    labelWithCard: '{country}: {card} or passport',
    labelPassport: '{country}: passport',
    whyWithCard:
      'To confirm that you are who you say you are. A passport is accepted from every country, so either your {card} or your passport will do.',
    whyNoCard:
      'To confirm that you are who you say you are. {country} does not issue a national identity card, so a passport is the document to provide.',
  },

  /** Living somewhere other than the country whose nationality is held. */
  residence: {
    labelWithPermit: '{country}: {permit}',
    labelGeneric: '{country}: residence permit',
    why: 'You hold the nationality of {origin} and live in {residence}, so permission to live there is what ties the two together.',
  },

  /** A member who has said they do not hold a residence permit yet. */
  residenceDeclaredMissing: {
    label: 'Noted: no {residence} residence permit yet',
    why: 'You have said you do not hold one yet. That is recorded, it does not stop your account being verified, and you can add it later — you will simply be able to do less until you do.',
  },

  /** A lawyer's or firm's licence to practise. */
  licence: {
    labelIn: 'Licence to practise law issued in {origin}',
    labelGeneric: 'Licence to practise law',
    whyIn: '{origin} issues the qualification you hold, so it is the authority that can confirm it.',
    whyGeneric:
      'The authority that admitted you is the only body that can confirm your qualification.',
  },

  /** Permission to practise where the lawyer actually works. */
  practiceAuthorisation: {
    label: 'Permission to practise in {residence}',
    why: 'You were admitted in {origin} and practise in {residence}. Practising there normally requires admission or authorisation from its own authorities as well.',
  },

  /** The firm's own registration. */
  firmRegistration: {
    labelIn: 'Registration of the firm in {residence}',
    labelGeneric: 'Registration of the firm',
    why: 'A firm is a business before it is a practice, so its registration where it operates is what proves it exists.',
  },

  /** The authority of whoever is opening the account for a firm. */
  firmAuthority: {
    label: 'Authorisation of the person registering the firm',
    why: 'The account is being opened on behalf of a firm, so the authority of the person doing it has to be shown.',
  },

  /** Photographs are never evidence and always optional. */
  photograph: {
    label: 'Profile photograph',
    why: 'Shown beside your name. It is not evidence of anything, and it is never required.',
  },

  /** A document issued in one country and read in another. */
  legalisation: {
    apostille:
      'Issued in {origin}, read in {residence}: it will normally need an apostille, and a translation by a sworn translator if it is not in the local language.',
    consular:
      'Issued in {origin}, read in {residence}: it will normally need legalisation by the {residence} consulate or a sworn translation — {origin} and {residence} do not both take part in the Apostille Convention.',
  },
};

export type RequirementsDict = Translated<typeof requirementsEn>;

export const requirementsEs: RequirementsDict = {
  emiratesId: {
    label: 'Emirates ID',
    why: 'El Emirates ID es a la vez el documento de identidad y el permiso de residencia en los Emiratos Árabes Unidos.',
  },

  unknownOrigin: {
    label: 'Pasaporte o el documento de identidad que tenga',
    why: 'Indíquenos dónde nació y de qué país es nacional, y esto pasará a ser el documento exacto para su país. Hasta entonces se acepta un pasaporte o un documento nacional de identidad.',
  },

  originIdentity: {
    labelWithCard: '{country}: {card} o pasaporte',
    labelPassport: '{country}: pasaporte',
    whyWithCard:
      'Para confirmar que es quien dice ser. El pasaporte se acepta de todos los países, así que sirve tanto su {card} como su pasaporte.',
    whyNoCard:
      'Para confirmar que es quien dice ser. {country} no expide documento nacional de identidad, por lo que el documento que debe aportar es el pasaporte.',
  },

  residence: {
    labelWithPermit: '{country}: {permit}',
    labelGeneric: '{country}: permiso de residencia',
    why: 'Usted tiene la nacionalidad de {origin} y vive en {residence}, de modo que el permiso para residir allí es lo que une ambas cosas.',
  },

  residenceDeclaredMissing: {
    label: 'Anotado: aún no tiene permiso de residencia de {residence}',
    why: 'Ha indicado que todavía no lo tiene. Queda registrado, no impide que se verifique su cuenta y podrá añadirlo más adelante — simplemente podrá hacer menos cosas hasta entonces.',
  },

  licence: {
    labelIn: 'Licencia para ejercer la abogacía expedida en {origin}',
    labelGeneric: 'Licencia para ejercer la abogacía',
    whyIn: '{origin} expide la titulación que usted posee, por lo que es la autoridad que puede confirmarla.',
    whyGeneric:
      'La autoridad que le admitió a ejercer es el único organismo que puede confirmar su titulación.',
  },

  practiceAuthorisation: {
    label: 'Autorización para ejercer en {residence}',
    why: 'Usted fue admitido en {origin} y ejerce en {residence}. Ejercer allí exige normalmente también la admisión o la autorización de sus propias autoridades.',
  },

  firmRegistration: {
    labelIn: 'Registro del despacho en {residence}',
    labelGeneric: 'Registro del despacho',
    why: 'Un despacho es una empresa antes que un ejercicio profesional, de modo que su registro donde opera es lo que demuestra que existe.',
  },

  firmAuthority: {
    label: 'Autorización de la persona que registra el despacho',
    why: 'La cuenta se abre en nombre de un despacho, por lo que debe acreditarse la facultad de la persona que lo hace.',
  },

  photograph: {
    label: 'Fotografía de perfil',
    why: 'Se muestra junto a su nombre. No es prueba de nada y nunca es obligatoria.',
  },

  legalisation: {
    apostille:
      'Expedido en {origin} y presentado en {residence}: normalmente necesitará una apostilla y una traducción jurada si no está en el idioma local.',
    consular:
      'Expedido en {origin} y presentado en {residence}: normalmente necesitará legalización por el consulado de {residence} o una traducción jurada — {origin} y {residence} no son ambos parte del Convenio de La Haya sobre la apostilla.',
  },
};
