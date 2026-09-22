/**
 * Environment access. Every value is read once and validated on import so a
 * misconfigured deployment fails immediately instead of at first use.
 */

function readString(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, received "${raw}".`);
  }
  return parsed;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const appSecret = readString(
  'APP_SECRET',
  isProduction ? undefined : 'dubai-legal-insecure-development-secret-change-me',
);

if (isProduction && appSecret.length < 32) {
  throw new Error('APP_SECRET must be at least 32 characters in production.');
}

export const env = {
  nodeEnv,
  isProduction,
  appUrl: readString('APP_URL', 'http://localhost:3100').replace(/\/$/, ''),
  databaseUrl: readString('DATABASE_URL'),
  appSecret,
  sessionCookieName: readString('SESSION_COOKIE_NAME', 'dl_session'),
  /** Uploads are written here and never served statically. */
  uploadDir: readString('UPLOAD_DIR', 'var/uploads'),

  /**
   * The key for encryption at rest: uploaded files and case message bodies.
   * Base64 of 32 bytes (`openssl rand -base64 32`). Required in production —
   * an installation that silently wrote plaintext because a variable was missing
   * would be the worst possible failure mode for the promise the interface makes.
   * In development one is derived from APP_SECRET so the app runs, and
   * `encryptionKeySource()` reports that it was derived.
   */
  encryptionKey: readString('ENCRYPTION_KEY', isProduction ? undefined : ''),
  tokenTtlMinutes: readInt('TOKEN_TTL_MINUTES', 60),
  sessionIdleDays: readInt('SESSION_IDLE_DAYS', 14),
  sessionAbsoluteDays: readInt('SESSION_ABSOLUTE_DAYS', 60),

  /**
   * 'outbox' (the default) records every outbound email in the database and
   * sends nothing. It is never reported to a user as delivered. Any other value
   * must correspond to a real, implemented transport.
   */
  emailProvider: readString('EMAIL_PROVIDER', 'outbox'),
  emailFromAddress: readString('EMAIL_FROM_ADDRESS', 'no-reply@dubai-legal.local'),

  /**
   * Whether an account must confirm its email address before it can be used.
   *
   * Off by default, because this installation has no mail provider: requiring a
   * confirmation that cannot be delivered would lock every new account out.
   * While it is off, accounts are activated at signup and the confirmation and
   * outbox screens say so plainly. Set REQUIRE_EMAIL_VERIFICATION=true once a
   * real transport is configured.
   */
  requireEmailVerification: readString('REQUIRE_EMAIL_VERIFICATION', 'false') === 'true',

  /**
   * Browser push notifications. Without a VAPID pair, push is simply unavailable
   * and in-app alerts carry on working; nothing pretends otherwise.
   */
  vapidPublicKey: readString('VAPID_PUBLIC_KEY', ''),
  vapidPrivateKey: readString('VAPID_PRIVATE_KEY', ''),
  vapidSubject: readString('VAPID_SUBJECT', 'mailto:admin@dubai-legal.local'),

  /**
   * Optional external video provider, offered as a fallback when a peer-to-peer
   * call cannot be established.
   */
  videoProviderUrl: readString('VIDEO_PROVIDER_URL', ''),

  /**
   * A TURN relay, for calls that cannot connect directly.
   *
   * Two devices on the same network usually find each other through STUN alone.
   * A phone on mobile data and a laptop behind a router often cannot: both are
   * behind NAT that refuses the direct path, and the call never establishes.
   * TURN is the relay that makes those calls work, and without it "it works on
   * my desk and not on my phone" is the expected outcome rather than a bug.
   *
   * Any TURN service will do — a self-hosted coturn, Twilio, Cloudflare Calls,
   * Metered. Leave them empty and the call falls back to STUN only.
   */
  turnUrl: readString('TURN_URL', ''),
  turnUsername: readString('TURN_USERNAME', ''),
  turnCredential: readString('TURN_CREDENTIAL', ''),

  /**
   * Accounts registering with one of these addresses are granted the REVIEWER
   * role, which is how the first reviewer bootstrap happens. Empty by default —
   * reviewers are otherwise granted with `npm run grant:reviewer`.
   */
  bootstrapReviewerEmails: readString('BOOTSTRAP_REVIEWER_EMAILS', '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0),
} as const;

export type Env = typeof env;
