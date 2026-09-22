/**
 * The product's colour vocabulary.
 *
 * One accent per domain, used consistently wherever that domain appears — a
 * landing-page icon, a console heading, a section eyebrow. Colour carries meaning
 * here rather than decoration, which is why nothing picks one at random and why
 * the reserved verification badge colours are never borrowed.
 *
 * Tailwind generates these from the `--color-domain-*` tokens in globals.css.
 */

export type Domain =
  | 'directory'
  | 'verification'
  | 'case'
  | 'emergency'
  | 'meeting'
  | 'payment'
  | 'review'
  | 'enquiry'
  | 'oversight';

type Accent = {
  /** Human label, used in the console heading. */
  label: string;
  /** A tinted surface for an icon or badge. */
  surface: string;
  /** The accent itself, for text and icons. */
  text: string;
  /** A hairline in the same hue. */
  ring: string;
};

export const DOMAINS: Record<Domain, Accent> = {
  directory: {
    label: 'Directory',
    surface: 'bg-domain-directory/10',
    text: 'text-domain-directory',
    ring: 'ring-domain-directory/25',
  },
  verification: {
    label: 'Verification',
    surface: 'bg-domain-verification/10',
    text: 'text-domain-verification',
    ring: 'ring-domain-verification/25',
  },
  case: {
    label: 'Cases',
    surface: 'bg-domain-case/10',
    text: 'text-domain-case',
    ring: 'ring-domain-case/25',
  },
  emergency: {
    label: 'Emergency',
    surface: 'bg-domain-emergency/10',
    text: 'text-domain-emergency',
    ring: 'ring-domain-emergency/25',
  },
  meeting: {
    label: 'Meetings',
    surface: 'bg-domain-meeting/10',
    text: 'text-domain-meeting',
    ring: 'ring-domain-meeting/25',
  },
  payment: {
    label: 'Fees',
    surface: 'bg-domain-payment/10',
    text: 'text-domain-payment',
    ring: 'ring-domain-payment/25',
  },
  review: {
    label: 'Reviews',
    surface: 'bg-domain-review/10',
    text: 'text-domain-review',
    ring: 'ring-domain-review/25',
  },
  enquiry: {
    label: 'Enquiries',
    surface: 'bg-domain-enquiry/10',
    text: 'text-domain-enquiry',
    ring: 'ring-domain-enquiry/25',
  },
  oversight: {
    label: 'Oversight',
    surface: 'bg-domain-oversight/10',
    text: 'text-domain-oversight',
    ring: 'ring-domain-oversight/25',
  },
};

/** The icon chip used beside a feature or a section heading. */
export function domainChip(domain: Domain, size: 'sm' | 'md' | 'lg' = 'md'): string {
  const accent = DOMAINS[domain];
  const box = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  return `inline-flex ${box} items-center justify-center rounded-lg ${accent.surface} ${accent.text} ring-1 ring-inset ${accent.ring}`;
}
