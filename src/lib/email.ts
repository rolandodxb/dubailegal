import { prisma } from './db';
import { env } from './env';

export type OutboundEmail = {
  to: string;
  subject: string;
  body: string;
  purpose: string;
  userId?: string | null;
};

/**
 * Records an outbound email.
 *
 * With EMAIL_PROVIDER=outbox (the configured default) no SMTP transport exists,
 * so the message is written to the `email_message` table with status QUEUED and
 * a reviewer can read it at /admin/outbox — including the confirmation and
 * password-reset links. It is never reported to a user as delivered.
 *
 * Any other provider value must name a transport that is actually implemented;
 * an unknown value fails loudly rather than silently dropping mail.
 */
export async function queueEmail(message: OutboundEmail): Promise<void> {
  const provider = env.emailProvider;

  if (provider !== 'outbox') {
    throw new Error(
      `EMAIL_PROVIDER is "${provider}", but no transport for it is implemented. ` +
        'Set EMAIL_PROVIDER=outbox to record messages, or implement the transport in src/lib/email.ts.',
    );
  }

  await prisma.emailMessage.create({
    data: {
      toEmail: message.to.toLowerCase(),
      fromEmail: env.emailFromAddress,
      subject: message.subject,
      bodyText: message.body,
      purpose: message.purpose,
      status: 'QUEUED',
      provider,
      userId: message.userId ?? null,
    },
  });
}

/** Shown verbatim in the UI so nobody is misled about delivery. */
export function emailDeliveryNotice(): string {
  if (env.emailProvider === 'outbox') {
    return 'No mail provider is configured on this installation, so this message was recorded in the outbox instead of being emailed. A reviewer can read it under Admin → Outbox.';
  }
  return `Messages are delivered through the "${env.emailProvider}" provider.`;
}

export function buildConfirmationEmail(fullName: string | null, link: string): { subject: string; body: string } {
  const greeting = fullName ? `Hello ${fullName},` : 'Hello,';
  return {
    subject: 'Confirm your Dubai Legal email address',
    body: [
      greeting,
      '',
      'Confirm this email address to activate your Dubai Legal account:',
      link,
      '',
      `The link expires in ${env.tokenTtlMinutes} minutes and can be used once.`,
      '',
      'If you did not create a Dubai Legal account, ignore this message.',
      '',
      '— Dubai Legal',
    ].join('\n'),
  };
}

export function buildPasswordResetEmail(fullName: string | null, link: string): { subject: string; body: string } {
  const greeting = fullName ? `Hello ${fullName},` : 'Hello,';
  return {
    subject: 'Reset your Dubai Legal password',
    body: [
      greeting,
      '',
      'Someone asked to reset the password for this email address. Choose a new password here:',
      link,
      '',
      `The link expires in ${env.tokenTtlMinutes} minutes and can be used once.`,
      '',
      'If this was not you, no action is needed — your current password still works.',
      '',
      '— Dubai Legal',
    ].join('\n'),
  };
}
