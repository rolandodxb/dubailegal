/**
 * Grants or removes the REVIEWER role for an existing account.
 *
 *   npm run grant:reviewer -- someone@example.com
 *   npm run grant:reviewer -- someone@example.com --remove
 *
 * This is how the first reviewer is created on an installation where
 * BOOTSTRAP_REVIEWER_EMAILS was empty at signup time. It cannot create an
 * account, only change the role on one that already exists.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const email = args.find((value) => !value.startsWith('--'))?.trim().toLowerCase();
  const remove = args.includes('--remove');

  if (!email) {
    console.error('Usage: npm run grant:reviewer -- <email> [--remove]');
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, roles: true, accountType: true },
  });

  if (!user) {
    console.error(
      `No account exists for ${email}. The person must register first; this script only changes roles.`,
    );
    process.exitCode = 1;
    return;
  }

  const roles = new Set(user.roles);
  if (remove) roles.delete('REVIEWER');
  else roles.add('REVIEWER');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { roles: Array.from(roles) },
    select: { email: true, roles: true },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: null,
      action: remove ? 'account.reviewer_revoked' : 'account.reviewer_granted',
      entityType: 'user',
      entityId: user.id,
      metadata: { via: 'scripts/grant-reviewer.ts', email: user.email },
    },
  });

  console.info(
    `${remove ? 'Removed' : 'Granted'} REVIEWER for ${updated.email}. Roles now: ${updated.roles.join(', ')}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
