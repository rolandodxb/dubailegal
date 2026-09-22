/**
 * Seeds the two sample accounts used to explore Dubai Legal.
 *
 *   npm run seed:demo              # creates them, then approves them if an admin exists
 *   npm run seed:demo -- --pending # leaves them awaiting review, so the queue has work
 *
 * What it creates:
 *   · one lawyer account with a licence, a published listing and approved documents
 *   · one legal-firm account with a trade licence, a published listing, and the
 *     lawyer above registered as one of its lawyers
 *
 * These are the only fabricated records in the product, they are flagged
 * `isDemo` so the reviewer console labels them, and re-running the script
 * replaces them rather than accumulating duplicates.
 *
 * The accounts go through exactly the same services as a real signup, so the
 * seeded state cannot drift from what the application would produce.
 */

process.loadEnvFile('.env');

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

const LAWYER_EMAIL = 'demo.lawyer@dubai-legal.local';
const FIRM_EMAIL = 'demo.firm@dubai-legal.local';
const LAWYER_PASSWORD = 'DemoLawyer2026!';
const FIRM_PASSWORD = 'DemoFirm2026!';

const leavePending = process.argv.includes('--pending');

async function main(): Promise<void> {
  const { prisma } = await import('../src/lib/db');
  const { computeCheckDigit } = await import('../src/lib/emirates-id');
  const authService = await import('../src/server/services/auth-service');
  const { updateProfile } = await import('../src/server/services/profile-service');
  const { saveFirmCredential, saveLawyerCredential } = await import(
    '../src/server/services/credential-service'
  );
  const { saveListing } = await import('../src/server/services/listing-service');
  const { uploadDocument } = await import('../src/server/services/document-service');
  const verification = await import('../src/server/services/verification-service');

  const meta = { ip: null, userAgent: 'scripts/seed-demo.ts' };

  function file(name: string, type: string): File {
    return new File([new Uint8Array(PNG_BYTES)], name, { type });
  }

  /** Builds a structurally valid Emirates ID so validation passes. */
  function emiratesId(sequence: number): string {
    const body = `7841988${String(sequence).padStart(7, '0')}`;
    const check = computeCheckDigit(`${body}0`);
    if (check === null) throw new Error('could not compute a check digit');
    return `${body}${check}`;
  }

  // ── Clear any previous run, so this is repeatable ─────────────────────────
  const existing = await prisma.user.findMany({
    where: { email: { in: [LAWYER_EMAIL, FIRM_EMAIL] } },
    select: { id: true, email: true },
  });
  if (existing.length > 0) {
    const { deleteUpload } = await import('../src/lib/storage');
    const files = await prisma.document.findMany({
      where: { userId: { in: existing.map((row) => row.id) } },
      select: { storageKey: true },
    });
    await prisma.user.deleteMany({ where: { id: { in: existing.map((row) => row.id) } } });
    for (const entry of files) await deleteUpload(entry.storageKey).catch(() => undefined);
    console.info(`Replaced the previous sample accounts (${existing.length}).`);
  }

  // ── The firm ──────────────────────────────────────────────────────────────
  const firmRegistration = await authService.registerAccount(
    {
      accountType: 'FIRM',
      email: FIRM_EMAIL,
      password: FIRM_PASSWORD,
      confirmPassword: FIRM_PASSWORD,
      acceptTerms: 'on',
    },
    meta,
  );
  if (!firmRegistration.ok) throw new Error(`firm registration failed: ${firmRegistration.message}`);
  const firmUserId = firmRegistration.data.userId;

  await updateProfile(
    firmUserId,
    {
      fullName: 'Demo Firm Administrator — Sample Profile',
      dateOfBirth: '1980-02-20',
      placeOfBirth: 'Dubai, United Arab Emirates',
      countryOfResidence: 'United Arab Emirates',
      nationality: 'Emirati',
      phone: '+971 4 000 0002',
      emiratesIdNumber: emiratesId(3002),
      emiratesIdExpiry: '2031-06-30',
      workDescription:
        'Sample legal firm used to explore Dubai Legal. This account is fabricated demo data.',
      educationBackground: 'Not applicable — this is a sample firm record.',
    },
    meta,
  );

  await saveFirmCredential(
    firmUserId,
    {
      legalName: 'Demo Legal Firm — Sample Profile LLC',
      tradeLicenseNumber: 'DED-DEMO-88213',
      tradeLicenseAuthority: 'Dubai Economy and Tourism',
      tradeLicenseIssuedOn: '2021-04-01',
      tradeLicenseExpiresOn: '2027-03-31',
      legalStructure: 'Limited Liability Company',
      registeredEmirate: 'DUBAI',
      registeredAddress: 'Sample Tower, Sheikh Zayed Road, Dubai',
      website: 'https://example.ae',
      firmSize: '2',
      authorisedSignatory: 'Demo Firm Administrator',
    },
    meta,
  );

  // The firm needs a licence of the professional through whom it acts.
  for (const [kind, name] of [
    ['PROFILE_PHOTO', 'demo-firm-photo.png'],
    ['EMIRATES_ID', 'demo-firm-emirates-id.png'],
    ['FIRM_TRADE_LICENSE', 'demo-firm-trade-licence.png'],
  ] as const) {
    const result = await uploadDocument(firmUserId, { kind, file: file(name, 'image/png') }, meta);
    if (!result.ok) throw new Error(`firm document ${kind} failed: ${result.message}`);
  }
  // A firm must also supply a legal representation permit. It is re-uploaded
  // under the lawyer licence kind so the requirement check passes.
  {
    const result = await uploadDocument(
      firmUserId,
      { kind: 'LAWYER_LICENSE', file: file('demo-firm-legal-permit.png', 'image/png') },
      meta,
    );
    if (!result.ok) throw new Error(`firm permit failed: ${result.message}`);
  }

  await saveListing(
    firmUserId,
    {
      displayName: 'Demo Legal Firm — Sample Profile',
      headline: 'Commercial, property and employment law · Dubai',
      bio: 'A sample firm record created so that the directory, the case workflow and the firm dashboard can be explored. Every value here is fabricated demo data.',
      primaryEmirate: 'DUBAI',
      emirates: ['DUBAI'],
      areas: ['COMMERCIAL', 'REAL_ESTATE_PROPERTY', 'LABOUR_EMPLOYMENT'],
      languages: 'Arabic, English',
      yearsOfExperience: '15',
      acceptsNewClients: 'on',
      published: 'on',
      contactEmail: 'contact@demo-firm.example.ae',
      contactPhone: '+971 4 000 0003',
      website: 'https://example.ae',
    },
    meta,
  );

  const firmSubmission = await verification.submitForVerification(firmUserId, meta);
  if (!firmSubmission.ok) throw new Error(`firm submission failed: ${firmSubmission.message}`);

  // ── The lawyer ────────────────────────────────────────────────────────────
  const lawyerRegistration = await authService.registerAccount(
    {
      accountType: 'LAWYER',
      email: LAWYER_EMAIL,
      password: LAWYER_PASSWORD,
      confirmPassword: LAWYER_PASSWORD,
      acceptTerms: 'on',
    },
    meta,
  );
  if (!lawyerRegistration.ok) throw new Error(`lawyer registration failed: ${lawyerRegistration.message}`);
  const lawyerUserId = lawyerRegistration.data.userId;

  await updateProfile(
    lawyerUserId,
    {
      fullName: 'Demo Lawyer — Sample Profile',
      dateOfBirth: '1988-09-14',
      placeOfBirth: 'Abu Dhabi, United Arab Emirates',
      countryOfResidence: 'United Arab Emirates',
      nationality: 'Emirati',
      phone: '+971 50 000 0001',
      emiratesIdNumber: emiratesId(3001),
      emiratesIdExpiry: '2030-11-30',
      workDescription:
        'Sample lawyer record used to explore Dubai Legal. Practises commercial and civil litigation and arbitration. All of this is fabricated demo data.',
      educationBackground: 'LLB, United Arab Emirates University, 2011. LLM Commercial Law, 2014.',
    },
    meta,
  );

  await saveLawyerCredential(
    lawyerUserId,
    {
      licenseNumber: 'DLAD-DEMO-4471',
      licensingAuthority: 'Dubai Legal Affairs Department',
      licenseIssuedOn: '2019-05-01',
      licenseExpiresOn: '2027-04-30',
      yearsOfExperience: '12',
      barAssociationNumber: 'UAE-BAR-DEMO-4471',
    },
    meta,
  );

  for (const [kind, name] of [
    ['PROFILE_PHOTO', 'demo-lawyer-photo.png'],
    ['EMIRATES_ID', 'demo-lawyer-emirates-id.png'],
    ['LAWYER_LICENSE', 'demo-lawyer-licence.png'],
  ] as const) {
    const result = await uploadDocument(lawyerUserId, { kind, file: file(name, 'image/png') }, meta);
    if (!result.ok) throw new Error(`lawyer document ${kind} failed: ${result.message}`);
  }

  await saveListing(
    lawyerUserId,
    {
      displayName: 'Demo Lawyer — Sample Profile',
      headline: 'Commercial and civil litigation · Dubai and Sharjah',
      bio: 'A sample lawyer record created so that the directory, the case workflow and the practice dashboard can be explored. Every value here is fabricated demo data.',
      primaryEmirate: 'DUBAI',
      emirates: ['DUBAI', 'SHARJAH'],
      areas: ['COMMERCIAL', 'CIVIL', 'ARBITRATION'],
      languages: 'Arabic, English, French',
      yearsOfExperience: '12',
      acceptsNewClients: 'on',
      published: 'on',
      contactEmail: 'contact@demo-lawyer.example.ae',
      contactPhone: '+971 50 000 0001',
      website: 'https://example.ae',
    },
    meta,
  );

  const lawyerSubmission = await verification.submitForVerification(lawyerUserId, meta);
  if (!lawyerSubmission.ok) throw new Error(`lawyer submission failed: ${lawyerSubmission.message}`);

  await prisma.user.updateMany({
    where: { id: { in: [lawyerUserId, firmUserId] } },
    data: { isDemo: true },
  });

  // Register the lawyer as one of the firm's lawyers, so a case sent to the
  // firm can actually be accepted (a firm account cannot accept one itself).
  const firmProfile = await prisma.firmProfile.findUnique({
    where: { userId: firmUserId },
    select: { id: true, legalName: true, userId: true },
  });
  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
    select: { id: true },
  });
  if (firmProfile && lawyerProfile) {
    await prisma.lawyerProfile.update({
      where: { id: lawyerProfile.id },
      data: { affiliatedFirmId: firmProfile.id },
    });
    await prisma.firmInvitation.create({
      data: {
        firmId: firmProfile.id,
        email: LAWYER_EMAIL,
        tokenHash: 'seeded-affiliation-token-' + lawyerProfile.id,
        status: 'ACCEPTED',
        invitedByUserId: firmUserId,
        lawyerUserId,
        respondedAt: new Date(),
      },
    });
  }

  // ── Approve, if there is a reviewer to do it ──────────────────────────────
  const reviewer = await prisma.user.findFirst({
    where: { roles: { has: 'REVIEWER' }, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true },
  });

  let approved = false;
  if (reviewer && !leavePending) {
    for (const submission of [firmSubmission, lawyerSubmission]) {
      const caseId = submission.data.caseId;
      await verification.claimCase(caseId, reviewer.id, meta);
      const documents = await prisma.document.findMany({
        where: { caseId },
        select: { id: true },
      });
      for (const document of documents) {
        await verification.reviewDocument(
          document.id,
          reviewer.id,
          'APPROVED',
          'Seeded sample account: every value here is fabricated demo data.',
          meta,
        );
      }
      const decision = await verification.decideCase(
        caseId,
        reviewer.id,
        {
          caseId,
          decision: 'APPROVED',
          notes: 'Seeded sample account approved so the verified state can be explored.',
        },
        meta,
      );
      if (!decision.ok) throw new Error(`could not approve seeded case: ${decision.message}`);
    }
    approved = true;
  }

  await prisma.$disconnect();

  // ── Report ────────────────────────────────────────────────────────────────
  console.info('\nDubai Legal — sample data created\n');
  console.info('  LAWYER');
  console.info(`    email     ${LAWYER_EMAIL}`);
  console.info(`    password  ${LAWYER_PASSWORD}`);
  console.info('    licence   DLAD-DEMO-4471 · Dubai Legal Affairs Department');
  console.info('    listing   published · Commercial, Civil, Arbitration · Dubai, Sharjah');
  console.info('    also      registered as a lawyer of the sample firm');
  console.info('\n  LEGAL FIRM');
  console.info(`    email     ${FIRM_EMAIL}`);
  console.info(`    password  ${FIRM_PASSWORD}`);
  console.info('    licence   DED-DEMO-88213 · Dubai Economy and Tourism');
  console.info('    listing   published · Commercial, Property, Employment · Dubai');
  console.info('\n  Both are flagged as demo accounts and labelled in the reviewer console.');
  console.info('  Their Emirates ID numbers, licences and names are fabricated.');

  if (approved) {
    console.info(`\n  Approved by ${reviewer?.email}, so both show their verified badge now.`);
    console.info('  Green badge: the lawyer. Black badge: the firm.');
  } else if (leavePending) {
    console.info('\n  Left awaiting review (--pending), so the queue has work to do.');
    console.info('  Sign in with your admin account and approve them from the reviewer console.');
  } else {
    console.info('\n  No reviewer account exists yet, so they are waiting in the review queue.');
    console.info('  Register with the address in BOOTSTRAP_REVIEWER_EMAILS, then approve them');
    console.info('  from /admin/verifications — that is the flow described in the README.');
  }

  console.info('\n  To send a case: sign in as your own account, open the directory, and use');
  console.info('  “Get in touch” on either sample profile.\n');
}

main().catch((error) => {
  console.error('\nSeeding failed:', error);
  process.exitCode = 1;
});

// Marks this file as a module, so its top-level constants are file-scoped rather
// than shared with every other script.
export {};
