/**
 * The community's topics.
 *
 * A post belongs to exactly one board. The list is the vocabulary somebody
 * already has in their head when they arrive with a problem — "unpaid wages",
 * "landlord will not return the deposit", "visa cancelled" — rather than a list
 * of legal causes of action.
 *
 * Kept out of the service because the posting form and the topic index are both
 * client components, and the service reaches for the database.
 */
export const COMMUNITY_TOPICS = [
  {
    value: 'LABOUR_EMPLOYMENT',
    label: 'Pay, dismissal and work',
    hint: 'Wages, gratuity, notice, unfair dismissal, working hours.',
    icon: 'briefcase',
  },
  {
    value: 'TENANCY_PROPERTY',
    label: 'Rent, landlords and property',
    hint: 'Deposits, eviction, rent increases, maintenance, buying and selling.',
    icon: 'building',
  },
  {
    value: 'FAMILY_PERSONAL_STATUS',
    label: 'Family and personal status',
    hint: 'Marriage, divorce, custody, maintenance, inheritance.',
    icon: 'users',
  },
  {
    value: 'CRIMINAL_PENAL',
    label: 'Police, charges and detention',
    hint: 'Complaints, questioning, bail, criminal charges.',
    icon: 'alert',
  },
  {
    value: 'TRAFFIC_FINES',
    label: 'Traffic, fines and licences',
    hint: 'Fines, accidents, impounding, driving licences.',
    icon: 'activity',
  },
  {
    value: 'VISAS_RESIDENCY',
    label: 'Visas, residency and entry bans',
    hint: 'Residency, sponsorship, overstays, travel bans, deportation.',
    icon: 'globe',
  },
  {
    value: 'BUSINESS_CONTRACTS',
    label: 'Business, contracts and trade',
    hint: 'Company set-up, contracts, suppliers, licences, partners.',
    icon: 'scale',
  },
  {
    value: 'MONEY_DEBT',
    label: 'Money, debt and cheques',
    hint: 'Loans, unpaid invoices, bounced cheques, repayments.',
    icon: 'creditCard',
  },
  {
    value: 'COURTS_PROCEDURE',
    label: 'Courts, notaries and procedure',
    hint: 'Filing, hearings, powers of attorney, enforcement, legalisation.',
    icon: 'fileText',
  },
  {
    value: 'COSTS_FEES',
    label: 'Fees, costs and payments',
    hint: 'What a lawyer costs, court fees, hourly rates, retainers.',
    icon: 'chart',
  },
  {
    value: 'USING_DUBAI_LEGAL',
    label: 'Using Legal Dash',
    hint: 'Verification, the directory, cases, meetings, payments on this platform.',
    icon: 'shieldCheck',
  },
  {
    value: 'OTHER',
    label: 'Something else',
    hint: 'Anything that does not fit the boards above.',
    icon: 'inbox',
  },
] as const;

export type CommunityTopicValue = (typeof COMMUNITY_TOPICS)[number]['value'];

export const COMMUNITY_TOPIC_LABEL: Record<string, string> = Object.fromEntries(
  COMMUNITY_TOPICS.map((topic) => [topic.value, topic.label]),
);

export const COMMUNITY_TOPIC_HINT: Record<string, string> = Object.fromEntries(
  COMMUNITY_TOPICS.map((topic) => [topic.value, topic.hint]),
);

export function isCommunityTopic(value: unknown): value is CommunityTopicValue {
  return typeof value === 'string' && COMMUNITY_TOPICS.some((topic) => topic.value === value);
}

/**
 * The three reactions.
 *
 * Emoji, deliberately and only here. The rest of the interface uses monochrome
 * line icons so that navigation never looks like a different product from one
 * screen to the next — but a reaction is content, not chrome: people recognise
 * these three before they read a word, and they are what the request asked for.
 * Each one carries a written label as well, which is what a screen reader and a
 * tooltip use.
 */
export const REACTIONS = [
  { value: 'LIKE', emoji: '👍', label: 'Like' },
  { value: 'HEART', emoji: '❤️', label: 'Love' },
  { value: 'WOW', emoji: '😮', label: 'Surprised' },
] as const;

export type ReactionValue = (typeof REACTIONS)[number]['value'];

export const REACTION_LABEL: Record<string, string> = Object.fromEntries(
  REACTIONS.map((reaction) => [reaction.value, reaction.label]),
);

export const REACTION_EMOJI: Record<string, string> = Object.fromEntries(
  REACTIONS.map((reaction) => [reaction.value, reaction.emoji]),
);
