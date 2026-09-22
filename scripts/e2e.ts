/**
 * End-to-end verification of Dubai Legal against the real database and the
 * running server.
 *
 *   npm run e2e            # runs the whole flow, then removes the accounts it made
 *   npm run e2e -- --keep  # leaves the created accounts in place
 *
 * Every step goes through the same service functions and HTTP routes the
 * application uses. Nothing is stubbed, and each assertion is printed with its
 * outcome so a failure is legible.
 */

process.loadEnvFile('.env');

const BASE_URL = process.env.APP_URL ?? 'http://localhost:3100';
const runId = Date.now().toString(36);
const keep = process.argv.includes('--keep');

// A real 1x1 PNG, and a file that lies about being one.
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);
const FAKE_BYTES = Buffer.from('This is plain text pretending to be an image.');

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.info(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string): void {
  console.info(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

async function main(): Promise<void> {
  const { prisma } = await import('../src/lib/db');
  const { computeCheckDigit, formatEmiratesId } = await import('../src/lib/emirates-id');
  const authService = await import('../src/server/services/auth-service');
  const { updateProfile } = await import('../src/server/services/profile-service');
  const { saveFirmCredential, saveLawyerCredential } = await import(
    '../src/server/services/credential-service'
  );
  const { unpublishListing, saveListing } = await import('../src/server/services/listing-service');
  const { uploadDocument } = await import('../src/server/services/document-service');
  const verification = await import('../src/server/services/verification-service');
  const { directoryFacetCounts, searchDirectory } = await import(
    '../src/server/services/directory-service'
  );
  const { createInquiry, listInquiriesReceived, replyToInquiry } = await import(
    '../src/server/services/inquiry-service'
  );
  const { setReviewerRole } = await import('../src/server/services/admin-service');

  const meta = { ip: '203.0.113.10', userAgent: 'dubai-legal-e2e' };
  const createdUserIds: string[] = [];

  /** Builds a structurally valid Emirates ID with a correct check digit. */
  function makeEmiratesId(sequence: number): string {
    const body = `7841990${String(sequence).padStart(7, '0')}`; // 14 digits
    const provisional = `${body}0`;
    const check = computeCheckDigit(provisional);
    if (check === null) throw new Error('could not compute Emirates ID check digit');
    return `${body}${check}`;
  }

  /** Pulls the one-time token out of the confirmation link in the outbox. */
  async function tokenFromOutbox(userId: string, purpose: string): Promise<string | null> {
    const message = await prisma.emailMessage.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
      select: { bodyText: true },
    });
    if (!message) return null;
    const match = message.bodyText.match(/token=([A-Za-z0-9_-]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function registerAndConfirm(email: string, accountType: 'USER' | 'LAWYER' | 'FIRM') {
    const registration = await authService.registerAccount(
      { accountType, email, password: 'CorrectHorse9Battery', confirmPassword: 'CorrectHorse9Battery', acceptTerms: 'on' },
      meta,
    );
    if (!registration.ok) throw new Error(`registration failed for ${email}: ${registration.message}`);
    createdUserIds.push(registration.data.userId);

    // Email confirmation is switched off while no mail provider is configured,
    // so no token is issued and the account is usable straight away. When it is
    // switched back on, the token path below is exercised again.
    const token = await tokenFromOutbox(registration.data.userId, 'EMAIL_VERIFICATION');
    if (token) {
      const confirmed = await authService.confirmEmailAddress(token, meta);
      if (!confirmed.ok) throw new Error(`confirmation failed for ${email}: ${confirmed.message}`);
    }

    return { userId: registration.data.userId, sessionToken: registration.data.token, email };
  }

  async function fillProfile(userId: string, emiratesId: string, fullName: string) {
    return updateProfile(
      userId,
      {
        fullName,
        dateOfBirth: '1990-05-12',
        placeOfBirth: 'Dubai, United Arab Emirates',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 123 4567',
        emiratesIdNumber: emiratesId,
        emiratesIdExpiry: '2030-01-01',
        workDescription: 'Commercial litigation and arbitration.',
        educationBackground: 'LLB, University of Sharjah, 2013.',
      },
      meta,
    );
  }

  function file(name: string, bytes: Buffer, type: string): File {
    return new File([new Uint8Array(bytes)], name, { type });
  }

  // ══════════════════════════════════════════════════════════════════════════
  section('Registration and email confirmation');

  const individual = await registerAndConfirm(`individual.${runId}@example.ae`, 'USER');
  check('a USER account can be created', Boolean(individual.userId));

  const userRow = await prisma.user.findUnique({
    where: { id: individual.userId },
    select: { status: true, emailVerifiedAt: true, accountType: true, verificationStatus: true },
  });
  check('the account is active and its email is confirmed', userRow?.status === 'ACTIVE' && userRow.emailVerifiedAt !== null);
  check('the account starts unverified', userRow?.verificationStatus === 'UNVERIFIED');
  check('the profile row is created up front', (await prisma.profile.count({ where: { userId: individual.userId } })) === 1);

  const { env: appEnv } = await import('../src/lib/env');
  const reusedToken = await tokenFromOutbox(individual.userId, 'EMAIL_VERIFICATION');
  if (appEnv.requireEmailVerification) {
    const reuse = reusedToken ? await authService.confirmEmailAddress(reusedToken, meta) : null;
    check('a confirmation link cannot be used twice', reuse !== null && reuse.ok === false);
  } else {
    check(
      'no undeliverable confirmation link is issued while confirmation is off',
      reusedToken === null,
    );
    check(
      'the account is usable without confirming anything',
      userRow?.status === 'ACTIVE' && userRow.emailVerifiedAt !== null,
    );
  }

  section('Sign-in controls');
  const wrongPassword = await authService.signIn(
    { email: individual.email, password: 'WrongPassword123' },
    meta,
  );
  check('a wrong password is refused', wrongPassword.ok === false);
  check(
    'the refusal does not reveal whether the address exists',
    wrongPassword.ok === false && wrongPassword.message === 'Email or password is incorrect.',
  );

  const unknownAccount = await authService.signIn(
    { email: `nobody.${runId}@example.ae`, password: 'WrongPassword123' },
    meta,
  );
  check(
    'an unknown address gives the identical message',
    unknownAccount.ok === false && unknownAccount.message === 'Email or password is incorrect.',
  );

  const goodSignIn = await authService.signIn({ email: individual.email, password: 'CorrectHorse9Battery' }, meta);
  check('the correct password signs in', goodSignIn.ok === true);

  section('Profile and Emirates ID');
  const emiratesId = makeEmiratesId(101);
  const profileResult = await fillProfile(individual.userId, emiratesId, 'Amina Al Mansoori');
  check('a complete profile saves', profileResult.ok === true, profileResult.ok ? '' : profileResult.message);

  const storedProfile = await prisma.profile.findUnique({
    where: { userId: individual.userId },
    select: { emiratesIdNumber: true, emiratesIdCheckDigitOk: true, emiratesIdFingerprint: true },
  });
  check('the Emirates ID is stored in its printed 15-digit form', storedProfile?.emiratesIdNumber === emiratesId);
  check('the Emirates ID passes its check digit', storedProfile?.emiratesIdCheckDigitOk === true);
  check('an Emirates ID fingerprint is stored, not the raw number', Boolean(storedProfile?.emiratesIdFingerprint));

  const malformed = await updateProfile(
    individual.userId,
    {
      fullName: 'Amina Al Mansoori',
      dateOfBirth: '1990-05-12',
      placeOfBirth: 'Dubai, United Arab Emirates',
      countryOfResidence: 'United Arab Emirates',
      nationality: 'Emirati',
      phone: '+971 50 123 4567',
      emiratesIdNumber: '12345',
      emiratesIdExpiry: '2030-01-01',
      workDescription: 'Commercial litigation and arbitration.',
      educationBackground: 'LLB, University of Sharjah, 2013.',
    },
    meta,
  );
  check('a malformed Emirates ID is refused', malformed.ok === false);
  check(
    'the refusal points at the Emirates ID field',
    malformed.ok === false && Boolean(malformed.fieldErrors?.emiratesIdNumber),
  );

  section('Documents');
  const beforeDocs = await verification.getVerificationOverview(individual.userId);
  check(
    'verification cannot be submitted with no documents',
    beforeDocs !== null && beforeDocs.canSubmit === false && beforeDocs.missingDocuments.includes('EMIRATES_ID'),
  );

  const badUpload = await uploadDocument(
    individual.userId,
    { kind: 'EMIRATES_ID', file: file('fake.png', FAKE_BYTES, 'image/png') },
    meta,
  );
  check('a file whose contents are not an image is refused', badUpload.ok === false);

  const goodUpload = await uploadDocument(
    individual.userId,
    { kind: 'EMIRATES_ID', file: file('emirates-id.png', PNG_BYTES, 'image/png'), documentNumber: emiratesId },
    meta,
  );
  check('a real Emirates ID image uploads', goodUpload.ok === true, goodUpload.ok ? '' : goodUpload.message);

  const afterDocs = await verification.getVerificationOverview(individual.userId);
  check('the account can now be submitted for verification', afterDocs?.canSubmit === true,
    afterDocs ? afterDocs.blockers.join(' ') : 'no overview');
  check('an uploaded document waits for review', afterDocs?.documents[0]?.status === 'AWAITING_REVIEW');

  section('Verified badge for an individual');
  const submission = await verification.submitForVerification(individual.userId, meta);
  check('the request is submitted', submission.ok === true, submission.ok ? '' : submission.message);

  const pendingUser = await prisma.user.findUnique({
    where: { id: individual.userId },
    select: { verificationStatus: true },
  });
  check('the account shows as pending, not verified', pendingUser?.verificationStatus === 'PENDING');

  // An upload must be blocked while a reviewer holds the case.
  const blockedUpload = await uploadDocument(
    individual.userId,
    { kind: 'PASSPORT', file: file('passport.png', PNG_BYTES, 'image/png') },
    meta,
  );
  check('documents cannot be changed while a case is open', blockedUpload.ok === false);

  // The reviewer. Created through the same registration path, then granted the
  // role exactly as scripts/grant-reviewer.ts does.
  const reviewer = await registerAndConfirm(`reviewer.${runId}@example.ae`, 'USER');
  await prisma.user.update({ where: { id: reviewer.userId }, data: { roles: ['MEMBER', 'REVIEWER'] } });

  const queue = await verification.listReviewQueue();
  const caseId = submission.ok ? submission.data.caseId : '';
  check(
    'the submitted case appears in the review queue',
    queue.queue.some((item) => item.id === caseId),
  );
  const claim = await verification.claimCase(caseId, reviewer.userId, meta);
  check('a reviewer can claim the case', claim.ok === true, claim.ok ? '' : claim.message);

  const claimedCase = await prisma.verificationCase.findUnique({
    where: { id: caseId },
    select: { status: true, reviewerId: true },
  });
  check('the case moves to under review and records the reviewer', claimedCase?.status === 'UNDER_REVIEW' && claimedCase.reviewerId === reviewer.userId);

  const docs = await prisma.document.findMany({ where: { caseId }, select: { id: true } });
  for (const doc of docs) {
    await verification.reviewDocument(doc.id, reviewer.userId, 'APPROVED', 'Matches the profile.', meta);
  }

  const decide = await verification.decideCase(
    caseId,
    reviewer.userId,
    { caseId, decision: 'APPROVED', notes: 'Emirates ID verified against the uploaded card.' },
    meta,
  );
  check('the reviewer can approve the case', decide.ok === true, decide.ok ? '' : decide.message);

  const verifiedUser = await prisma.user.findUnique({
    where: { id: individual.userId },
    select: { verificationStatus: true, verifiedAt: true, verifiedById: true },
  });
  check('the account becomes APPROVED with a timestamp', verifiedUser?.verificationStatus === 'APPROVED' && verifiedUser.verifiedAt !== null);
  check('the approval names the reviewer who made it', verifiedUser?.verifiedById === reviewer.userId);

  const badge = await prisma.user.findUnique({
    where: { id: individual.userId },
    select: { accountType: true, verificationStatus: true },
  });
  check('the badge colour for a verified individual is the blue one', badge?.accountType === 'USER' && badge.verificationStatus === 'APPROVED');

  section('A lawyer cannot be approved without a licence document');
  const lawyer = await registerAndConfirm(`lawyer.${runId}@example.ae`, 'LAWYER');
  await fillProfile(lawyer.userId, makeEmiratesId(202), 'Khalid Al Suwaidi');
  await saveLawyerCredential(
    lawyer.userId,
    {
      licenseNumber: `DLAD-${runId}-4471`,
      licensingAuthority: 'Dubai Legal Affairs Department',
      licenseIssuedOn: '2022-03-01',
      licenseExpiresOn: '2027-03-01',
      yearsOfExperience: '9',
      barAssociationNumber: `UAE-BAR-${runId}`,
    },
    meta,
  );
  await uploadDocument(
    lawyer.userId,
    { kind: 'EMIRATES_ID', file: file('lawyer-id.png', PNG_BYTES, 'image/png') },
    meta,
  );
  await uploadDocument(
    lawyer.userId,
    { kind: 'LAWYER_LICENSE', file: file('licence.png', PNG_BYTES, 'image/png') },
    meta,
  );
  const lawyerListing = await saveListing(
    lawyer.userId,
    {
      displayName: `Al Suwaidi Legal ${runId}`,
      headline: 'Commercial and civil litigation · Dubai',
      bio: 'Commercial disputes, arbitration and civil claims before the UAE courts.',
      primaryEmirate: 'DUBAI',
      emirates: ['DUBAI', 'SHARJAH'],
      areas: ['COMMERCIAL', 'CIVIL', 'ARBITRATION'],
      languages: 'Arabic, English',
      yearsOfExperience: '9',
      acceptsNewClients: 'on',
      published: 'on',
      contactEmail: `contact.${runId}@example.ae`,
      contactPhone: '+971 4 555 0000',
      website: 'https://example.ae',
    },
    meta,
  );
  check('a lawyer can publish a directory listing', lawyerListing.ok === true, lawyerListing.ok ? '' : lawyerListing.message);

  const lawyerSubmit = await verification.submitForVerification(lawyer.userId, meta);
  check('the lawyer request is submitted', lawyerSubmit.ok === true);
  const lawyerCaseId = lawyerSubmit.ok ? lawyerSubmit.data.caseId : '';
  await verification.claimCase(lawyerCaseId, reviewer.userId, meta);

  const premature = await verification.decideCase(
    lawyerCaseId,
    reviewer.userId,
    { caseId: lawyerCaseId, decision: 'APPROVED', notes: 'Looks fine.' },
    meta,
  );
  check(
    'a case cannot be approved before each document is accepted',
    premature.ok === false,
    premature.ok ? 'approval was allowed with documents still unreviewed' : undefined,
  );

  const lawyerDocs = await prisma.document.findMany({ where: { caseId: lawyerCaseId }, select: { id: true } });
  for (const doc of lawyerDocs) {
    await verification.reviewDocument(doc.id, reviewer.userId, 'APPROVED', null, meta);
  }
  const lawyerDecide = await verification.decideCase(
    lawyerCaseId,
    reviewer.userId,
    { caseId: lawyerCaseId, decision: 'APPROVED', notes: 'Licence and Emirates ID both verified.' },
    meta,
  );
  check('the lawyer case can then be approved', lawyerDecide.ok === true, lawyerDecide.ok ? '' : lawyerDecide.message);

  const lawyerRow = await prisma.user.findUnique({
    where: { id: lawyer.userId },
    select: { accountType: true, verificationStatus: true },
  });
  check('the lawyer shows the green badge state', lawyerRow?.accountType === 'LAWYER' && lawyerRow.verificationStatus === 'APPROVED');

  section('Directory search and filters');
  const byArea = await searchDirectory({ areas: ['COMMERCIAL'] });
  check('searching by area of law finds the listing', byArea.rows.some((row) => row.userId === lawyer.userId));

  const wrongArea = await searchDirectory({ areas: ['TAX'] });
  check('a different area of law excludes it', !wrongArea.rows.some((row) => row.userId === lawyer.userId));

  const byEmirate = await searchDirectory({ emirates: ['SHARJAH'] });
  check('searching by a covered emirate finds it', byEmirate.rows.some((row) => row.userId === lawyer.userId));

  const wrongEmirate = await searchDirectory({ emirates: ['FUJAIRAH'] });
  check('an uncovered emirate excludes it', !wrongEmirate.rows.some((row) => row.userId === lawyer.userId));

  const verifiedOnly = await searchDirectory({ verifiedOnly: true });
  check('verified-only search includes the verified lawyer', verifiedOnly.rows.some((row) => row.userId === lawyer.userId));

  const kindFilter = await searchDirectory({ kind: 'FIRM' });
  check('filtering to firms excludes the lawyer', !kindFilter.rows.some((row) => row.userId === lawyer.userId));

  const facets = await directoryFacetCounts();
  check('facet counts reflect real published listings', (facets.kindCounts.get('LAWYER') ?? 0) >= 1);

  // Unpublishing must remove it from the directory immediately.
  await unpublishListing(lawyer.userId, meta);
  const afterUnpublish = await searchDirectory({ areas: ['COMMERCIAL'] });
  check('an unpublished listing disappears from the directory', !afterUnpublish.rows.some((row) => row.userId === lawyer.userId));
  await saveListing(
    lawyer.userId,
    {
      displayName: `Al Suwaidi Legal ${runId}`,
      headline: 'Commercial and civil litigation · Dubai',
      bio: 'Commercial disputes, arbitration and civil claims before the UAE courts.',
      primaryEmirate: 'DUBAI',
      emirates: ['DUBAI', 'SHARJAH'],
      areas: ['COMMERCIAL', 'CIVIL', 'ARBITRATION'],
      languages: 'Arabic, English',
      yearsOfExperience: '9',
      acceptsNewClients: 'on',
      published: 'on',
      contactEmail: `contact.${runId}@example.ae`,
      contactPhone: '+971 4 555 0000',
      website: 'https://example.ae',
    },
    meta,
  );

  section('Duplicate identity is refused');
  const impostor = await registerAndConfirm(`impostor.${runId}@example.ae`, 'USER');
  const clash = await fillProfile(impostor.userId, emiratesId, 'Someone Else');
  check('an Emirates ID already in use cannot verify a second account', clash.ok === false);

  section('Inquiries between members');
  const listing = await prisma.listing.findUnique({ where: { userId: lawyer.userId }, select: { id: true } });
  const inquiry = await createInquiry(
    individual.userId,
    {
      listingId: listing?.id ?? '',
      subject: 'Question about a commercial lease dispute',
      message: 'We have a dispute over a commercial lease in Dubai and would like an initial view.',
    },
    meta,
  );
  check('a member can send an inquiry to a listing', inquiry.ok === true, inquiry.ok ? '' : inquiry.message);

  const inbox = await listInquiriesReceived(lawyer.userId);
  const received = inbox[0];
  check('the inquiry arrives in the recipient inbox', received?.fromUserId === individual.userId);

  const reply = await replyToInquiry(
    lawyer.userId,
    { inquiryId: received?.id ?? '', replyBody: 'Thank you. Please send the lease and I will review it.' },
    meta,
  );
  check('the recipient can reply', reply.ok === true);

  const replied = await prisma.inquiry.findUnique({
    where: { id: received?.id ?? '' },
    select: { status: true, replyBody: true },
  });
  check('the inquiry records the reply and its status', replied?.status === 'RESPONDED' && Boolean(replied.replyBody));

  section('Replacing approved evidence withdraws the badge');
  const replacement = await uploadDocument(
    lawyer.userId,
    { kind: 'LAWYER_LICENSE', file: file('licence-v2.png', PNG_BYTES, 'image/png') },
    meta,
  );
  check('a replacement licence uploads', replacement.ok === true);

  const afterReplacement = await prisma.user.findUnique({
    where: { id: lawyer.userId },
    select: { verificationStatus: true, verifiedAt: true },
  });
  check(
    'the verified badge is withdrawn when required evidence changes',
    afterReplacement?.verificationStatus === 'UNVERIFIED' && afterReplacement.verifiedAt === null,
  );

  section('HTTP access control');
  // NOTE: the reviewer-role grant deliberately happens AFTER these checks, so
  // the negative cases below are made by accounts that really have no reviewer
  // role. Granting the role first would have made "200 OK" the correct answer.
  const lawyerIdDoc = await prisma.document.findFirst({
    where: { userId: lawyer.userId, kind: 'EMIRATES_ID' },
    select: { id: true },
  });

  const anonymous = await fetch(`${BASE_URL}/api/documents/${lawyerIdDoc?.id}`, { redirect: 'manual' });
  check('an anonymous request for a document is refused', anonymous.status === 401, `got ${anonymous.status}`);

  // `impostor` is a plain confirmed member: no reviewer role, no relationship
  // to the lawyer's documents. This is the real negative case.
  const asOtherMember = await fetch(`${BASE_URL}/api/documents/${lawyerIdDoc?.id}`, {
    headers: { cookie: `dl_session=${impostor.sessionToken}` },
    redirect: 'manual',
  });
  check(
    "another member cannot read someone else's Emirates ID",
    asOtherMember.status === 404,
    `got ${asOtherMember.status}`,
  );

  const asSecondMember = await fetch(`${BASE_URL}/api/documents/${lawyerIdDoc?.id}`, {
    headers: { cookie: `dl_session=${individual.sessionToken}` },
    redirect: 'manual',
  });
  check(
    "a second unrelated member also cannot read it",
    asSecondMember.status === 404,
    `got ${asSecondMember.status}`,
  );

  const badCookie = await fetch(`${BASE_URL}/api/documents/${lawyerIdDoc?.id}`, {
    headers: { cookie: 'dl_session=not-a-real-session-token' },
    redirect: 'manual',
  });
  check('a forged session cookie is refused', badCookie.status === 401, `got ${badCookie.status}`);

  const unknownDoc = await fetch(`${BASE_URL}/api/documents/does-not-exist`, {
    headers: { cookie: `dl_session=${impostor.sessionToken}` },
    redirect: 'manual',
  });
  check(
    'a non-existent document is indistinguishable from a forbidden one',
    unknownDoc.status === 404,
    `got ${unknownDoc.status}`,
  );

  const asOwner = await fetch(`${BASE_URL}/api/documents/${lawyerIdDoc?.id}`, {
    headers: { cookie: `dl_session=${lawyer.sessionToken}` },
    redirect: 'manual',
  });
  check('the owner can read their own document', asOwner.status === 200, `got ${asOwner.status}`);

  const dashboardAnon = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
  check('the dashboard redirects when signed out', dashboardAnon.status === 307, `got ${dashboardAnon.status}`);

  const dashboardSignedIn = await fetch(`${BASE_URL}/dashboard`, {
    headers: { cookie: `dl_session=${individual.sessionToken}` },
    redirect: 'manual',
  });
  check('the dashboard renders when signed in', dashboardSignedIn.status === 200, `got ${dashboardSignedIn.status}`);

  const adminAsMember = await fetch(`${BASE_URL}/admin/verifications`, {
    headers: { cookie: `dl_session=${impostor.sessionToken}` },
    redirect: 'manual',
  });
  check(
    'a member without the reviewer role cannot open the reviewer console',
    adminAsMember.status === 307,
    `got ${adminAsMember.status}`,
  );

  const adminUsersAsMember = await fetch(`${BASE_URL}/admin/users`, {
    headers: { cookie: `dl_session=${impostor.sessionToken}` },
    redirect: 'manual',
  });
  check(
    'a member without the reviewer role cannot open account administration',
    adminUsersAsMember.status === 307,
    `got ${adminUsersAsMember.status}`,
  );

  const adminOutboxAsMember = await fetch(`${BASE_URL}/admin/outbox`, {
    headers: { cookie: `dl_session=${impostor.sessionToken}` },
    redirect: 'manual',
  });
  check(
    'a member without the reviewer role cannot read the outbox',
    adminOutboxAsMember.status === 307,
    `got ${adminOutboxAsMember.status}`,
  );

  const adminAsReviewer = await fetch(`${BASE_URL}/admin/verifications`, {
    headers: { cookie: `dl_session=${reviewer.sessionToken}` },
    redirect: 'manual',
  });
  check('the reviewer console opens for a reviewer', adminAsReviewer.status === 200, `got ${adminAsReviewer.status}`);

  const directoryPage = await fetch(`${BASE_URL}/directory`, { redirect: 'manual' });
  check('the public directory renders', directoryPage.status === 200);

  section('Reviewer role administration');
  // Run last: granting the role changes what the accounts above are allowed to
  // do, which would invalidate the negative authorization checks.
  const granted = await setReviewerRole(reviewer.userId, impostor.userId, true, meta);
  check('a reviewer can grant the reviewer role', granted.ok === true);

  const nowReviewer = await fetch(`${BASE_URL}/admin/verifications`, {
    headers: { cookie: `dl_session=${impostor.sessionToken}` },
    redirect: 'manual',
  });
  check(
    'the newly granted reviewer can open the console',
    nowReviewer.status === 200,
    `got ${nowReviewer.status}`,
  );

  const grantedBack = await setReviewerRole(reviewer.userId, impostor.userId, false, meta);
  check('a reviewer can remove the reviewer role again', grantedBack.ok === true);

  const consoleAfterRevoke = await fetch(`${BASE_URL}/admin/verifications`, {
    headers: { cookie: `dl_session=${impostor.sessionToken}` },
    redirect: 'manual',
  });
  check(
    'removing the role closes the console again',
    consoleAfterRevoke.status === 307,
    `got ${consoleAfterRevoke.status}`,
  );

  const selfRevoke = await setReviewerRole(reviewer.userId, reviewer.userId, false, meta);
  check('a reviewer cannot remove their own reviewer access', selfRevoke.ok === false);

  const selfSuspend = await import('../src/server/services/admin-service').then((m) =>
    m.setUserSuspended(reviewer.userId, reviewer.userId, true, 'testing', meta),
  );
  check('a reviewer cannot suspend their own account', selfSuspend.ok === false);

  const suspendMember = await import('../src/server/services/admin-service').then((m) =>
    m.setUserSuspended(reviewer.userId, impostor.userId, true, 'Repeated fraudulent documents.', meta),
  );
  check('a reviewer can suspend another account', suspendMember.ok === true);

  const suspendedAccess = await fetch(`${BASE_URL}/dashboard`, {
    headers: { cookie: `dl_session=${impostor.sessionToken}` },
    redirect: 'manual',
  });
  check(
    'a suspended account loses access immediately',
    suspendedAccess.status === 307,
    `got ${suspendedAccess.status}`,
  );

  const reinstate = await import('../src/server/services/admin-service').then((m) =>
    m.setUserSuspended(reviewer.userId, impostor.userId, false, null, meta),
  );
  check('a reviewer can reinstate an account', reinstate.ok === true);

  section('Session revocation');
  const sessionsBefore = await prisma.session.count({
    where: { userId: individual.userId, revokedAt: null },
  });
  check('the member has live sessions', sessionsBefore > 0);
  const { revokeAllSessions } = await import('../src/lib/auth');
  await revokeAllSessions(individual.userId);
  const afterRevoke = await fetch(`${BASE_URL}/dashboard`, {
    headers: { cookie: `dl_session=${individual.sessionToken}` },
    redirect: 'manual',
  });
  check('a revoked session can no longer reach the dashboard', afterRevoke.status === 307, `got ${afterRevoke.status}`);

  // ══════════════════════════════════════════════════════════════════════════
  section('The session cookie follows the connection, not the build');

  /**
   * A browser refuses a `Secure` cookie over plain HTTP, with one exception:
   * `http://localhost`. Marking the cookie from NODE_ENV therefore worked on
   * localhost and silently signed people out the moment the app was opened at a
   * local network address. This signs in over real HTTP and reads the header.
   */
  const loginPage = await fetch(`${BASE_URL}/login`);
  const loginHtml = await loginPage.text();
  const unescape = (value: string) =>
    value.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'");
  const actionFields = [
    ['$ACTION_REF_1', ''],
    ['$ACTION_1:0', unescape(/name="\$ACTION_1:0" value="([^"]*)"/.exec(loginHtml)?.[1] ?? '')],
    ['$ACTION_1:1', unescape(/name="\$ACTION_1:1" value="([^"]*)"/.exec(loginHtml)?.[1] ?? '')],
    ['$ACTION_KEY', unescape(/name="\$ACTION_KEY" value="([^"]*)"/.exec(loginHtml)?.[1] ?? '')],
  ] as const;

  async function postLogin(extraHeaders: Record<string, string> = {}) {
    const body = new FormData();
    for (const [name, value] of actionFields) body.set(name, value);
    body.set('email', individual.email);
    body.set('password', 'CorrectHorse9Battery');
    return fetch(`${BASE_URL}/login`, {
      method: 'POST',
      body,
      redirect: 'manual',
      headers: extraHeaders,
    });
  }

  const overHttp = await postLogin();
  const httpCookie = overHttp.headers.get('set-cookie') ?? '';
  check('signing in over plain HTTP returns a session cookie', httpCookie.includes('dl_session='));
  check(
    'and the cookie is not marked Secure, which a browser would refuse over HTTP',
    !/;\s*Secure/i.test(httpCookie),
    httpCookie.replace(/dl_session=[^;]+/, 'dl_session=…'),
  );
  check(
    'while still being HttpOnly and SameSite',
    /HttpOnly/i.test(httpCookie) && /SameSite=lax/i.test(httpCookie),
  );

  const behindHttpsProxy = await postLogin({ 'x-forwarded-proto': 'https' });
  const httpsCookie = behindHttpsProxy.headers.get('set-cookie') ?? '';
  check(
    'behind an HTTPS proxy the same cookie is marked Secure',
    /;\s*Secure/i.test(httpsCookie),
    httpsCookie.replace(/dl_session=[^;]+/, 'dl_session=…'),
  );

  // ══════════════════════════════════════════════════════════════════════════
  section('Cleanup');
  if (keep) {
    console.info('  --keep was passed, so the accounts created by this run are retained.');
    console.info(`  Individual: ${individual.email}`);
    console.info(`  Lawyer:     ${lawyer.email}`);
    console.info(`  Reviewer:   ${reviewer.email} (password: CorrectHorse9Battery)`);
  } else {
    // Order matters. Audit rows reference documents and cases by plain id, and
    // the actor FK is nulled when the user goes — so the audit cleanup has to
    // happen while the users, and their ids, still exist.
    const [storedKeys, documentIds, caseIds, inquiryIds, listingIds] = await Promise.all([
      prisma.document.findMany({
        where: { userId: { in: createdUserIds } },
        select: { storageKey: true },
      }),
      prisma.document.findMany({
        where: { userId: { in: createdUserIds } },
        select: { id: true },
      }),
      prisma.verificationCase.findMany({
        where: { userId: { in: createdUserIds } },
        select: { id: true },
      }),
      prisma.inquiry.findMany({
        where: {
          OR: [{ fromUserId: { in: createdUserIds } }, { toUserId: { in: createdUserIds } }],
        },
        select: { id: true },
      }),
      prisma.listing.findMany({
        where: { userId: { in: createdUserIds } },
        select: { id: true },
      }),
    ]);

    const entityIds = [
      ...createdUserIds,
      ...documentIds.map((row) => row.id),
      ...caseIds.map((row) => row.id),
      ...inquiryIds.map((row) => row.id),
      ...listingIds.map((row) => row.id),
    ];

    await prisma.trafficLog.deleteMany({ where: { userId: { in: createdUserIds } } });
    const auditRows = await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorUserId: { in: createdUserIds } },
          { entityId: { in: entityIds } },
          // A failed sign-in against an address that never existed has neither an
          // actor nor an entity, only the attempted email in its metadata.
          { metadata: { path: ['email'], string_contains: runId } },
        ],
      },
    });
    const emailRows = await prisma.emailMessage.deleteMany({
      where: { toEmail: { contains: runId } },
    });

    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });

    const { deleteUpload } = await import('../src/lib/storage');
    for (const entry of storedKeys) {
      await deleteUpload(entry.storageKey).catch(() => undefined);
    }

    const remaining = await prisma.user.count({ where: { id: { in: createdUserIds } } });
    check('the accounts created by this run were removed', remaining === 0);
    console.info(
      `  Removed every account this run created, its uploaded files, ${emailRows.count} outbox messages and ${auditRows.count} audit entries.`,
    );
    console.info('  Re-run with --keep to keep them and explore the app with real data.');
  }

  await prisma.$disconnect();

  console.info(`\n${'═'.repeat(64)}`);
  console.info(`  ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.error('\n  Failures:');
    for (const failure of failures) console.error(`   · ${failure}`);
  }
  console.info('═'.repeat(64));
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('\nThe end-to-end run crashed:', error);
  process.exitCode = 1;
});

// Marks this file as a module, so its top-level constants are file-scoped rather
// than shared with every other script.
export {};
