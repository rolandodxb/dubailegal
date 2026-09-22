/**
 * Countries, and what each one means for identity, residency and money.
 *
 * The platform is used worldwide, so the questions it asks have to follow the
 * person rather than the platform's home country. Three things depend on that:
 *
 *   · **which documents are asked for** — a national identity card exists in some
 *     countries and not others, a residence permit is needed only when somebody
 *     lives outside the country whose nationality they hold, and a lawyer
 *     practising abroad needs both their home qualification and permission to
 *     practise where they are;
 *   · **which currency a fee is quoted in** — the consultation happens somewhere,
 *     and the number should be in the money of that place;
 *   · **which bank details are required** — an IBAN is meaningless in Argentina,
 *     a CBU is meaningless in Germany, and a routing number is American.
 *
 * The identity rule is deliberately forgiving: **a passport is always accepted**,
 * so nobody is ever asked for a document their country does not issue. Where a
 * national card is known to exist it is offered as the alternative, which is what
 * people actually carry.
 *
 * Country names are English; the picker searches them, and the two-letter code is
 * what is stored.
 */

/** How a country's bank details are normally quoted, which decides the fields. */
export type BankStyle =
  | 'iban' // most of Europe, the Gulf, Turkey, Brazil…
  | 'account-swift' // an account number plus SWIFT/BIC — most of the world
  | 'routing' // the United States: ABA routing number
  | 'sort-code' // the United Kingdom and Ireland
  | 'cbu' // Argentina, Uruguay: CBU/CVU or an alias
  | 'ifsc' // India: IFSC plus account number
  | 'bsb' // Australia and New Zealand: BSB
  | 'other';

export type Country = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** ISO 4217, used to quote a fee in the money of the place. */
  currency: string;
  /** The national identity card, where one is issued. Null means passport only. */
  nationalId: string | null;
  /** The residence permit a foreign resident is normally given. */
  residencePermit: string | null;
  bankStyle: BankStyle;
  /** Party to the Hague Apostille Convention, so documents can be apostilled. */
  apostille: boolean;
};

/**
 * The countries, with the detail that matters.
 *
 * Currency and banking are given for every country listed. The identity and
 * residence columns are filled where they are known with confidence; where they
 * are `null` the platform asks for a passport — which every country issues — and
 * for a residence permit described generically. That is the honest default: it is
 * better to ask for a document everybody has than to insist on one that may not
 * exist.
 */
export const COUNTRIES: Country[] = [
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', nationalId: 'Emirates ID', residencePermit: 'Emirates ID or residence visa', bankStyle: 'iban', apostille: true },
  { code: 'AR', name: 'Argentina', currency: 'ARS', nationalId: 'DNI', residencePermit: 'Residencia precaria or permanente', bankStyle: 'cbu', apostille: true },
  { code: 'AU', name: 'Australia', currency: 'AUD', nationalId: null, residencePermit: 'Visa grant notice or ImmiCard', bankStyle: 'bsb', apostille: true },
  { code: 'AT', name: 'Austria', currency: 'EUR', nationalId: 'Personalausweis', residencePermit: 'Aufenthaltstitel', bankStyle: 'iban', apostille: true },
  { code: 'BE', name: 'Belgium', currency: 'EUR', nationalId: 'eID', residencePermit: 'Verblijfsvergunning / titre de séjour', bankStyle: 'iban', apostille: true },
  { code: 'BR', name: 'Brazil', currency: 'BRL', nationalId: 'RG / CPF', residencePermit: 'RNM', bankStyle: 'iban', apostille: true },
  { code: 'CA', name: 'Canada', currency: 'CAD', nationalId: null, residencePermit: 'Permanent Resident Card or study/work permit', bankStyle: 'account-swift', apostille: true },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', nationalId: 'Identity card', residencePermit: 'Aufenthaltsbewilligung', bankStyle: 'iban', apostille: true },
  { code: 'CL', name: 'Chile', currency: 'CLP', nationalId: 'Cédula de identidad', residencePermit: 'Cédula de identidad para extranjeros', bankStyle: 'account-swift', apostille: true },
  { code: 'CN', name: 'China', currency: 'CNY', nationalId: 'Resident Identity Card', residencePermit: 'Residence permit for foreigners', bankStyle: 'account-swift', apostille: true },
  { code: 'CO', name: 'Colombia', currency: 'COP', nationalId: 'Cédula de ciudadanía', residencePermit: 'Cédula de extranjería', bankStyle: 'account-swift', apostille: true },
  { code: 'DE', name: 'Germany', currency: 'EUR', nationalId: 'Personalausweis', residencePermit: 'Aufenthaltstitel', bankStyle: 'iban', apostille: true },
  { code: 'DK', name: 'Denmark', currency: 'DKK', nationalId: 'Sundhedskort / pas', residencePermit: 'Opholdstilladelse', bankStyle: 'iban', apostille: true },
  { code: 'EG', name: 'Egypt', currency: 'EGP', nationalId: 'National ID card', residencePermit: 'Residence permit', bankStyle: 'account-swift', apostille: false },
  { code: 'ES', name: 'Spain', currency: 'EUR', nationalId: 'DNI', residencePermit: 'TIE (Tarjeta de Identidad de Extranjero)', bankStyle: 'iban', apostille: true },
  { code: 'FI', name: 'Finland', currency: 'EUR', nationalId: 'Henkilökortti', residencePermit: 'Oleskelulupa', bankStyle: 'iban', apostille: true },
  { code: 'FR', name: 'France', currency: 'EUR', nationalId: 'Carte nationale d’identité', residencePermit: 'Titre de séjour', bankStyle: 'iban', apostille: true },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', nationalId: null, residencePermit: 'BRP or eVisa share code', bankStyle: 'sort-code', apostille: true },
  { code: 'GR', name: 'Greece', currency: 'EUR', nationalId: 'Δελτίο ταυτότητας', residencePermit: 'Άδεια διαμονής', bankStyle: 'iban', apostille: true },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', nationalId: 'Hong Kong Identity Card', residencePermit: 'Visa or entry permit', bankStyle: 'account-swift', apostille: false },
  { code: 'IE', name: 'Ireland', currency: 'EUR', nationalId: 'Passport or Public Services Card', residencePermit: 'IRP', bankStyle: 'iban', apostille: true },
  { code: 'IN', name: 'India', currency: 'INR', nationalId: 'Aadhaar', residencePermit: 'OCI card or residence permit', bankStyle: 'ifsc', apostille: true },
  { code: 'IT', name: 'Italy', currency: 'EUR', nationalId: 'Carta d’identità', residencePermit: 'Permesso di soggiorno', bankStyle: 'iban', apostille: true },
  { code: 'JO', name: 'Jordan', currency: 'JOD', nationalId: 'National ID card', residencePermit: 'Residence permit', bankStyle: 'iban', apostille: true },
  { code: 'JP', name: 'Japan', currency: 'JPY', nationalId: 'My Number Card', residencePermit: 'Residence card', bankStyle: 'account-swift', apostille: true },
  { code: 'KE', name: 'Kenya', currency: 'KES', nationalId: 'National ID card', residencePermit: 'Class permit', bankStyle: 'account-swift', apostille: true },
  { code: 'KR', name: 'South Korea', currency: 'KRW', nationalId: 'Resident registration card', residencePermit: 'Alien registration card', bankStyle: 'account-swift', apostille: true },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', nationalId: 'Civil ID', residencePermit: 'Iqama', bankStyle: 'iban', apostille: false },
  { code: 'LB', name: 'Lebanon', currency: 'LBP', nationalId: 'National ID card', residencePermit: 'Residence permit', bankStyle: 'account-swift', apostille: true },
  { code: 'MA', name: 'Morocco', currency: 'MAD', nationalId: 'Carte nationale d’identité électronique', residencePermit: 'Carte de séjour', bankStyle: 'account-swift', apostille: true },
  { code: 'MX', name: 'Mexico', currency: 'MXN', nationalId: 'INE / INE credencial', residencePermit: 'Tarjeta de residencia', bankStyle: 'account-swift', apostille: true },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', nationalId: 'MyKad', residencePermit: 'Employment or dependant pass', bankStyle: 'account-swift', apostille: true },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', nationalId: 'NIN slip or national ID card', residencePermit: 'Residence permit', bankStyle: 'account-swift', apostille: true },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', nationalId: 'Identiteitskaart', residencePermit: 'Verblijfsvergunning', bankStyle: 'iban', apostille: true },
  { code: 'NO', name: 'Norway', currency: 'NOK', nationalId: 'Nasjonalt ID-kort', residencePermit: 'Oppholdstillatelse', bankStyle: 'iban', apostille: true },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', nationalId: null, residencePermit: 'Visa or resident visa', bankStyle: 'account-swift', apostille: true },
  { code: 'OM', name: 'Oman', currency: 'OMR', nationalId: 'Civil ID', residencePermit: 'Residence card', bankStyle: 'iban', apostille: false },
  { code: 'PE', name: 'Peru', currency: 'PEN', nationalId: 'DNI', residencePermit: 'Carné de extranjería', bankStyle: 'account-swift', apostille: true },
  { code: 'PH', name: 'Philippines', currency: 'PHP', nationalId: 'PhilSys ID', residencePermit: 'ACR I-Card', bankStyle: 'account-swift', apostille: true },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', nationalId: 'CNIC', residencePermit: 'Residence permit', bankStyle: 'iban', apostille: true },
  { code: 'PL', name: 'Poland', currency: 'PLN', nationalId: 'Dowód osobisty', residencePermit: 'Karta pobytu', bankStyle: 'iban', apostille: true },
  { code: 'PT', name: 'Portugal', currency: 'EUR', nationalId: 'Cartão de cidadão', residencePermit: 'Título de residência', bankStyle: 'iban', apostille: true },
  { code: 'QA', name: 'Qatar', currency: 'QAR', nationalId: 'Qatar ID', residencePermit: 'Residence permit (QID)', bankStyle: 'iban', apostille: false },
  { code: 'RO', name: 'Romania', currency: 'RON', nationalId: 'Carte de identitate', residencePermit: 'Permis de ședere', bankStyle: 'iban', apostille: true },
  { code: 'RU', name: 'Russia', currency: 'RUB', nationalId: 'Internal passport', residencePermit: 'Residence permit', bankStyle: 'account-swift', apostille: true },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', nationalId: 'National ID / Iqama', residencePermit: 'Iqama', bankStyle: 'iban', apostille: true },
  { code: 'SE', name: 'Sweden', currency: 'SEK', nationalId: 'ID-kort', residencePermit: 'Uppehållstillstånd', bankStyle: 'iban', apostille: true },
  { code: 'SG', name: 'Singapore', currency: 'SGD', nationalId: 'NRIC', residencePermit: 'Employment or dependant pass', bankStyle: 'account-swift', apostille: true },
  { code: 'TR', name: 'Türkiye', currency: 'TRY', nationalId: 'Kimlik kartı', residencePermit: 'İkamet izin belgesi', bankStyle: 'iban', apostille: true },
  { code: 'UA', name: 'Ukraine', currency: 'UAH', nationalId: 'ID card', residencePermit: 'Residence permit', bankStyle: 'iban', apostille: true },
  { code: 'US', name: 'United States', currency: 'USD', nationalId: null, residencePermit: 'Green card or visa', bankStyle: 'routing', apostille: true },
  { code: 'UY', name: 'Uruguay', currency: 'UYU', nationalId: 'Cédula de identidad', residencePermit: 'Cédula de identidad (residente)', bankStyle: 'cbu', apostille: true },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', nationalId: 'Smart ID card', residencePermit: 'Permanent residence permit or visa', bankStyle: 'account-swift', apostille: true },
];

/**
 * A short list of countries that are complete enough to be picked, extended with
 * every other country by code and currency below. The picker offers the whole
 * world; the detail columns simply carry `null` where a value is not known, and
 * the rules treat `null` as "ask for the document everybody has".
 */
export const OTHER_COUNTRIES: { code: string; name: string; currency: string }[] = [
  { code: 'AF', name: 'Afghanistan', currency: 'AFN' },
  { code: 'AL', name: 'Albania', currency: 'ALL' },
  { code: 'DZ', name: 'Algeria', currency: 'DZD' },
  { code: 'AD', name: 'Andorra', currency: 'EUR' },
  { code: 'AO', name: 'Angola', currency: 'AOA' },
  { code: 'AG', name: 'Antigua and Barbuda', currency: 'XCD' },
  { code: 'AM', name: 'Armenia', currency: 'AMD' },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN' },
  { code: 'BS', name: 'Bahamas', currency: 'BSD' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT' },
  { code: 'BB', name: 'Barbados', currency: 'BBD' },
  { code: 'BY', name: 'Belarus', currency: 'BYN' },
  { code: 'BZ', name: 'Belize', currency: 'BZD' },
  { code: 'BJ', name: 'Benin', currency: 'XOF' },
  { code: 'BT', name: 'Bhutan', currency: 'BTN' },
  { code: 'BO', name: 'Bolivia', currency: 'BOB' },
  { code: 'BA', name: 'Bosnia and Herzegovina', currency: 'BAM' },
  { code: 'BW', name: 'Botswana', currency: 'BWP' },
  { code: 'BN', name: 'Brunei', currency: 'BND' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF' },
  { code: 'BI', name: 'Burundi', currency: 'BIF' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF' },
  { code: 'CV', name: 'Cape Verde', currency: 'CVE' },
  { code: 'CF', name: 'Central African Republic', currency: 'XAF' },
  { code: 'TD', name: 'Chad', currency: 'XAF' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC' },
  { code: 'HR', name: 'Croatia', currency: 'EUR' },
  { code: 'CU', name: 'Cuba', currency: 'CUP' },
  { code: 'CY', name: 'Cyprus', currency: 'EUR' },
  { code: 'CZ', name: 'Czechia', currency: 'CZK' },
  { code: 'CD', name: 'DR Congo', currency: 'CDF' },
  { code: 'DO', name: 'Dominican Republic', currency: 'DOP' },
  { code: 'EC', name: 'Ecuador', currency: 'USD' },
  { code: 'SV', name: 'El Salvador', currency: 'USD' },
  { code: 'EE', name: 'Estonia', currency: 'EUR' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB' },
  { code: 'FJ', name: 'Fiji', currency: 'FJD' },
  { code: 'GE', name: 'Georgia', currency: 'GEL' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ' },
  { code: 'HN', name: 'Honduras', currency: 'HNL' },
  { code: 'HU', name: 'Hungary', currency: 'HUF' },
  { code: 'IS', name: 'Iceland', currency: 'ISK' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'IQ', name: 'Iraq', currency: 'IQD' },
  { code: 'IL', name: 'Israel', currency: 'ILS' },
  { code: 'JM', name: 'Jamaica', currency: 'JMD' },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT' },
  { code: 'KG', name: 'Kyrgyzstan', currency: 'KGS' },
  { code: 'LA', name: 'Laos', currency: 'LAK' },
  { code: 'LV', name: 'Latvia', currency: 'EUR' },
  { code: 'LY', name: 'Libya', currency: 'LYD' },
  { code: 'LT', name: 'Lithuania', currency: 'EUR' },
  { code: 'LU', name: 'Luxembourg', currency: 'EUR' },
  { code: 'MG', name: 'Madagascar', currency: 'MGA' },
  { code: 'MW', name: 'Malawi', currency: 'MWK' },
  { code: 'MV', name: 'Maldives', currency: 'MVR' },
  { code: 'ML', name: 'Mali', currency: 'XOF' },
  { code: 'MT', name: 'Malta', currency: 'EUR' },
  { code: 'MU', name: 'Mauritius', currency: 'MUR' },
  { code: 'MD', name: 'Moldova', currency: 'MDL' },
  { code: 'MC', name: 'Monaco', currency: 'EUR' },
  { code: 'MN', name: 'Mongolia', currency: 'MNT' },
  { code: 'ME', name: 'Montenegro', currency: 'EUR' },
  { code: 'MZ', name: 'Mozambique', currency: 'MZN' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK' },
  { code: 'NA', name: 'Namibia', currency: 'NAD' },
  { code: 'NP', name: 'Nepal', currency: 'NPR' },
  { code: 'NI', name: 'Nicaragua', currency: 'NIO' },
  { code: 'NE', name: 'Niger', currency: 'XOF' },
  { code: 'MK', name: 'North Macedonia', currency: 'MKD' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG' },
  { code: 'PA', name: 'Panama', currency: 'PAB' },
  { code: 'PG', name: 'Papua New Guinea', currency: 'PGK' },
  { code: 'PR', name: 'Puerto Rico', currency: 'USD' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF' },
  { code: 'SM', name: 'San Marino', currency: 'EUR' },
  { code: 'SN', name: 'Senegal', currency: 'XOF' },
  { code: 'RS', name: 'Serbia', currency: 'RSD' },
  { code: 'SL', name: 'Sierra Leone', currency: 'SLE' },
  { code: 'SK', name: 'Slovakia', currency: 'EUR' },
  { code: 'SI', name: 'Slovenia', currency: 'EUR' },
  { code: 'SO', name: 'Somalia', currency: 'SOS' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR' },
  { code: 'SD', name: 'Sudan', currency: 'SDG' },
  { code: 'SY', name: 'Syria', currency: 'SYP' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD' },
  { code: 'TJ', name: 'Tajikistan', currency: 'TJS' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'TN', name: 'Tunisia', currency: 'TND' },
  { code: 'UG', name: 'Uganda', currency: 'UGX' },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS' },
  { code: 'VE', name: 'Venezuela', currency: 'VES' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'YE', name: 'Yemen', currency: 'YER' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', currency: 'ZWL' },
];

/** Every country, detailed where known and plain elsewhere. */
export const ALL_COUNTRIES: Country[] = [
  ...COUNTRIES,
  ...OTHER_COUNTRIES.map((entry) => ({
    code: entry.code,
    name: entry.name,
    currency: entry.currency,
    nationalId: null,
    residencePermit: null,
    bankStyle: 'account-swift' as BankStyle,
    apostille: false,
  })),
].sort((left, right) => left.name.localeCompare(right.name));

const BY_CODE = new Map(ALL_COUNTRIES.map((country) => [country.code, country]));

export function countryByCode(code: string | null | undefined): Country | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

export function countryName(code: string | null | undefined): string | null {
  return countryByCode(code)?.name ?? null;
}

/** The money a fee is quoted in where the consultation happens. */
export function currencyForCountry(code: string | null | undefined): string {
  return countryByCode(code)?.currency ?? 'AED';
}

/** Whether the two codes are the same country, treating "unknown" as different. */
export function sameCountry(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.toUpperCase() === b.toUpperCase();
}

/**
 * Which bank fields a payment to this country needs.
 *
 * An IBAN is a European and Gulf convention; Argentina uses a CBU or an alias;
 * the United States needs a routing number; Britain and Ireland a sort code;
 * India an IFSC; Australia a BSB. Asking everybody for all of them is how a form
 * becomes impossible to complete.
 */
export type BankField =
  | 'accountHolder'
  | 'bankName'
  | 'iban'
  | 'accountNumber'
  | 'swift'
  | 'routingNumber'
  | 'sortCode'
  | 'cbu'
  | 'ifsc'
  | 'bsb'
  | 'branch'
  | 'instructions';

/**
 * What each style of banking needs.
 *
 * `always` is what any bank anywhere needs to receive a transfer: who holds the
 * account, and which bank it is. `identifiers` is how the account is addressed,
 * and **any one of them is enough** — an account in an IBAN country can still be
 * addressed by number, and a client paying from abroad will often be quoted a
 * SWIFT code instead. `helpful` is never demanded, because a branch name is
 * useful and a swift code is not always issued.
 */
const BANK_FIELDS: Record<BankStyle, { identifiers: BankField[]; helpful: BankField[] }> = {
  iban: { identifiers: ['iban', 'accountNumber'], helpful: ['swift', 'branch', 'instructions'] },
  'account-swift': { identifiers: ['accountNumber', 'iban'], helpful: ['swift', 'branch', 'instructions'] },
  routing: { identifiers: ['accountNumber', 'routingNumber'], helpful: ['swift', 'branch', 'instructions'] },
  'sort-code': { identifiers: ['accountNumber', 'sortCode'], helpful: ['iban', 'swift', 'instructions'] },
  cbu: { identifiers: ['cbu', 'accountNumber'], helpful: ['swift', 'branch', 'instructions'] },
  ifsc: { identifiers: ['ifsc', 'accountNumber'], helpful: ['swift', 'branch', 'instructions'] },
  bsb: { identifiers: ['bsb', 'accountNumber'], helpful: ['swift', 'branch', 'instructions'] },
  other: { identifiers: ['accountNumber', 'iban'], helpful: ['swift', 'branch', 'instructions'] },
};

/** What a bank in this country needs, and what merely helps. */
export function bankFieldsFor(countryCode: string | null | undefined): {
  style: BankStyle;
  always: BankField[];
  identifiers: BankField[];
  helpful: BankField[];
} {
  const country = countryByCode(countryCode);
  const style: BankStyle = country?.bankStyle ?? 'iban';
  const fields = BANK_FIELDS[style];
  return {
    style,
    always: ['accountHolder', 'bankName'],
    identifiers: fields.identifiers,
    helpful: fields.helpful,
  };
}

/** The label for a style, for the form to explain itself. */
export const BANK_STYLE_NOTE: Record<BankStyle, string> = {
  iban: 'Accounts here are normally quoted as an IBAN. A SWIFT/BIC helps a payment from abroad arrive.',
  'account-swift': 'Accounts here are normally quoted as an account number, with a SWIFT/BIC for payments from abroad.',
  routing: 'Accounts here need the bank’s ABA routing number as well as the account number.',
  'sort-code': 'Accounts here need the sort code as well as the account number.',
  cbu: 'Accounts here are normally quoted as a CBU or CVU, or by an alias.',
  ifsc: 'Accounts here need the IFSC code as well as the account number.',
  bsb: 'Accounts here need the BSB as well as the account number.',
  other: 'Give the account number and, if your bank uses one, the SWIFT/BIC.',
};

export const BANK_FIELD_LABEL: Record<BankField, string> = {
  accountHolder: 'Account holder name',
  bankName: 'Bank name',
  iban: 'IBAN',
  accountNumber: 'Account number',
  swift: 'SWIFT / BIC',
  routingNumber: 'Routing number (ABA)',
  sortCode: 'Sort code',
  cbu: 'CBU / CVU or alias',
  ifsc: 'IFSC code',
  bsb: 'BSB',
  branch: 'Branch',
  instructions: 'Payment instructions for the client',
};
