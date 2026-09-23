/**
 * Integrity check over the verification model.
 *
 * These are the invariants the product promises. If any of them is violated,
 * a badge on screen would be claiming something the data does not support.
 * Run with: npm run db:verify
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Check = { name: string; count: number; explain: string };

async function main(): Promise<void> {
  const checks: Check[] = [];

  // 1. A verified account must have a timestamp, and a reason to have one.
  checks.push({
    name: 'APPROVED accounts missing verifiedAt',
    count: await prisma.user.count({
      where: { verificationStatus: 'APPROVED', verifiedAt: null },
    }),
    explain: 'A badge without a verification timestamp cannot be explained to anyone.',
  });

  // 2. APPROVED accounts must have a decided, approving case.
  const approvedUsers = await prisma.user.findMany({
    where: { verificationStatus: 'APPROVED' },
    select: {
      id: true,
      email: true,
      verificationCases: { where: { status: 'APPROVED' }, select: { id: true, reviewerId: true } },
    },
  });
  checks.push({
    name: 'APPROVED accounts with no approving case',
    count: approvedUsers.filter((user) => user.verificationCases.length === 0).length,
    explain: 'Verification must always be traceable to a specific approved case.',
  });

  // 3. Every approved case must name the reviewer who took it.
  checks.push({
    name: 'Approved cases with no reviewer recorded',
    count: await prisma.verificationCase.count({
      where: { status: 'APPROVED', reviewerId: null },
    }),
    explain: 'An unattributable approval is not a review.',
  });

  // 4. Every decided case must carry a decision time.
  checks.push({
    name: 'Decided cases with no decidedAt',
    count: await prisma.verificationCase.count({
      where: { status: { in: ['APPROVED', 'REJECTED'] }, decidedAt: null },
    }),
    explain: 'A decision without a time cannot be audited.',
  });

  // 5. A rejected case must explain itself.
  checks.push({
    name: 'Rejected cases with no reasons recorded',
    count: await prisma.verificationCase.count({
      where: { status: 'REJECTED', OR: [{ decisionNotes: null }, { decisionNotes: '' }] },
    }),
    explain: 'An applicant is entitled to know why they were refused.',
  });

  // 6. No account may hold two live Emirates ID fingerprints.
  const duplicates = await prisma.profile.groupBy({
    by: ['emiratesIdFingerprint'],
    where: { emiratesIdFingerprint: { not: null } },
    _count: { _all: true },
    having: { emiratesIdFingerprint: { _count: { gt: 1 } } },
  });
  checks.push({
    name: 'Emirates IDs linked to more than one account',
    count: duplicates.length,
    explain: 'One identity must verify one account only.',
  });

  // 7. A suspended account must not hold live sessions.
  const suspendedWithSessions = await prisma.user.count({
    where: { status: 'SUSPENDED', sessions: { some: { revokedAt: null } } },
  });
  checks.push({
    name: 'Suspended accounts with active sessions',
    count: suspendedWithSessions,
    explain: 'Suspension must take effect immediately.',
  });

  // 8. Documents attached to a case must belong to that case's subject.
  const allCases = await prisma.verificationCase.findMany({
    select: { id: true, userId: true, documents: { select: { userId: true } } },
  });
  checks.push({
    name: 'Case documents belonging to a different account',
    count: allCases.filter((item) => item.documents.some((doc) => doc.userId !== item.userId)).length,
    explain: 'A case must only ever contain its own applicant\u2019s evidence.',
  });

  const failures = checks.filter((check) => check.count > 0);

  console.info('Legal Dash — verification integrity check\n');
  for (const check of checks) {
    const marker = check.count === 0 ? 'PASS' : 'FAIL';
    console.info(`  [${marker}] ${check.name}: ${check.count}`);
    if (check.count > 0) console.info(`         ${check.explain}`);
  }

  console.info(
    `\n${checks.length - failures.length}/${checks.length} invariants hold.`,
  );

  if (failures.length > 0) {
    console.error('\nIntegrity check FAILED. Do not trust verification badges until this is fixed.');
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
