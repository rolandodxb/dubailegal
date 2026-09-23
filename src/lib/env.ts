/**
 * Environment access. Every value is validated when it is first used.
 *
 * See the note on `env` below for why the check is lazy rather than at import.
 */

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

/**
 * Values are read when they are first used, not when this module is imported.
 *
 * That distinction matters on a host that supplies configuration at run time. A
 * build imports every route to collect its page data, so a module-level check
 * turns "this secret is missing" into "this image cannot be built" — which is
 * exactly what happened on Cloudflare, where APP_SECRET exists at run time and
 * nowhere else. Reading lazily means a misconfigured deployment still fails, but
 * it fails on the first request that needs the value, naming it, instead of
 * refusing to build at all.
 */
function readString(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(
      `Missing required environment variable ${name}. Set it in the environment this deployment runs in.`,
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

/** The signing secret, checked the moment somebody asks for it. */
function appSecretValue(): string {
  const secret = readString(
    'APP_SECRET',
    IS_PRODUCTION ? undefined : 'legal-dash-insecure-development-secret-change-me',
  );
  if (IS_PRODUCTION && secret.length < 32) {
    throw new Error('APP_SECRET must be at least 32 characters in production.');
  }
  return secret;
}

export const env = {
  get nodeEnv(): string {
    return NODE_ENV;
  },
  get isProduction(): boolean {
    return IS_PRODUCTION;
  },
  get appUrl(): string {
    return readString('APP_URL', 'http://localhost:3100').replace(/\/$/, '');
  },
  get databaseUrl(): string {
    return readString('DATABASE_URL');
  },
  get appSecret(): string {
    return appSecretValue();
  },
  get sessionCookieName(): string {
    return readString('SESSION_COOKIE_NAME', 'dl_session');
  },
  /** Uploads are written here and never served statically. */
  get uploadDir(): string {
    return readString('UPLOAD_DIR', 'var/uploads');
  },

  /**
   * The key for encryption at rest: uploaded files and case message bodies.
   * Base64 of 32 bytes (`openssl rand -base64 32`). Required in production — an
   * installation that silently wrote plaintext because a variable was missing
   * would be the worst possible failure mode for the promise the interface makes.
   * In development one is derived from APP_SECRET so the app runs, and
   * `encryptionKeySource()` reports that it was derived.
   */
  get encryptionKey(): string {
    return readString('ENCRYPTION_KEY', IS_PRODUCTION ? undefined : '');
  },
  get tokenTtlMinutes(): number {
    return readInt('TOKEN_TTL_MINUTES', 60);
  },
  get sessionIdleDays(): number {
    return readInt('SESSION_IDLE_DAYS', 14);
  },
  get sessionAbsoluteDays(): number {
    return readInt('SESSION_ABSOLUTE_DAYS', 60);
  },

  /**
   * 'outbox' (the default) records every outbound email in the database and sends
   * nothing. It is never reported to a user as delivered. Any other value must
   * correspond to a real, implemented transport.
   */
  get emailProvider(): string {
    return readString('EMAIL_PROVIDER', 'outbox');
  },
  get emailFromAddress(): string {
    return readString('EMAIL_FROM_ADDRESS', 'no-reply@legal-dash.local');
  },

  /**
   * Whether an account must confirm its email address before it can be used.
   *
   * Off by default, because this installation has no mail provider: requiring a
   * confirmation that cannot be delivered would lock every new account out. While
   * it is off, accounts are activated at signup and the confirmation and outbox
   * screens say so plainly. Set REQUIRE_EMAIL_VERIFICATION=true once a real
   * transport is configured.
   */
  get requireEmailVerification(): boolean {
    return readString('REQUIRE_EMAIL_VERIFICATION', 'false') === 'true';
  },

  /**
   * Browser push notifications. Without a VAPID pair, push is simply unavailable
   * and in-app alerts carry on working; nothing pretends otherwise.
   */
  get vapidPublicKey(): string {
    return readString('VAPID_PUBLIC_KEY', '');
  },
  get vapidPrivateKey(): string {
    return readString('VAPID_PRIVATE_KEY', '');
  },
  get vapidSubject(): string {
    return readString('VAPID_SUBJECT', 'mailto:admin@legal-dash.local');
  },

  /**
   * Optional external video provider, offered as a fallback when a peer-to-peer
   * call cannot be established.
   */
  get videoProviderUrl(): string {
    return readString('VIDEO_PROVIDER_URL', '');
  },

  /**
   * A TURN relay, for calls that cannot connect directly.
   *
   * Two devices on the same network usually find each other through STUN alone. A
   * phone on mobile data and a laptop behind a router often cannot: both are behind
   * NAT that refuses the direct path, and the call never establishes. TURN is the
   * relay that makes those calls work, and without it "it works on my desk and not
   * on my phone" is the expected outcome rather than a bug.
   *
   * Any TURN service will do — a self-hosted coturn, Twilio, Cloudflare Calls,
   * Metered. Leave them empty and the call falls back to STUN only.
   */
  get turnUrl(): string {
    return readString('TURN_URL', '');
  },
  get turnUsername(): string {
    return readString('TURN_USERNAME', '');
  },
  get turnCredential(): string {
    return readString('TURN_CREDENTIAL', '');
  },

  /**
   * Accounts registering with one of these addresses are granted the REVIEWER
   * role, which is how the first reviewer bootstrap happens. Empty by default —
   * reviewers are otherwise granted with `npm run grant:reviewer`.
   */
  get bootstrapReviewerEmails(): string[] {
    return readString('BOOTSTRAP_REVIEWER_EMAILS', '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0);
  },
};

export type Env = typeof env;
