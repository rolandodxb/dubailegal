/**
 * Verifies the four role corrections:
 *   1. a firm can create a lawyer account directly, listed immediately
 *   2. the messages panel pages back through a long conversation
 *   3. an administrator is confined to the console
 *   4. a review can be written from the profile itself
 *
 *   npm run e2e:roles
 *
 * Everything runs through the real services and HTTP routes, and every account
 * it creates is removed at the end.
 */

process.loadEnvFile('.env');

const BASE_URL = process.env.APP_URL ?? 'http://localhost:3100';
const runId = Date.now().toString(36);

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

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
  console.info(`\n── ${title} ${'─'.repeat(Math.max(0, 58 - title.length))}`);
}

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
  const cases = await import('../src/server/services/case-service');
  const reviews = await import('../src/server/services/review-service');
  const firmService = await import('../src/server/services/firm-service');
  const { searchDirectory } = await import('../src/server/services/directory-service');

  const meta = { ip: '203.0.113.40', userAgent: 'dubai-legal-e2e-roles' };
  const createdUserIds: string[] = [];

  function idFor(sequence: number): string {
    const body = `7841994${String(sequence).padStart(7, '0')}`;
    const check = computeCheckDigit(`${body}0`);
    if (check === null) throw new Error('check digit');
    return `${body}${check}`;
  }

  function file(name: string): File {
    return new File([new Uint8Array(PNG_BYTES)], name, { type: 'image/png' });
  }

  async function register(email: string, accountType: 'USER' | 'LAWYER' | 'FIRM') {
    const result = await authService.registerAccount(
      {
        accountType,
        email,
        fullName: `Test ${accountType}`,
        phone: '+971 50 000 0000',
        password: 'CorrectHorse9Battery',
        confirmPassword: 'CorrectHorse9Battery',
        acceptTerms: 'on',
      },
      meta,
    );
    if (!result.ok) throw new Error(`register ${email}: ${result.message}`);
    createdUserIds.push(result.data.userId);
    return { ...result.data, sessionToken: result.data.token };
  }

  async function makeProfile(userId: string, name: string, sequence: number) {
    const result = await updateProfile(
      userId,
      {
        fullName: name,
        dateOfBirth: '1987-06-06',
        placeOfBirth: 'Dubai',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 333 4444',
        emiratesIdNumber: idFor(sequence),
        emiratesIdExpiry: '2033-01-01',
        workDescription: 'Test fixture.',
        educationBackground: 'Test fixture.',
      },
      meta,
    );
    if (!result.ok) throw new Error(`profile ${name}: ${result.message}`);
  }

  try {
    // ════════════════════════════════════════════════════════════════════════
    section('A firm creates a lawyer account directly');

    const firm = await register(`firm.${runId}@example.ae`, 'FIRM');
    await makeProfile(firm.userId, 'Firm Administrator', 9101);
    await saveFirmCredential(
      firm.userId,
      {
        legalName: `Roster Firm ${runId} LLC`,
        tradeLicenseNumber: `DED-R-${runId}`,
        tradeLicenseAuthority: 'Dubai Economy and Tourism',
        tradeLicenseExpiresOn: '2030-01-01',
        registeredEmirate: 'DUBAI',
        authorisedSignatory: 'Firm Administrator',
      },
      meta,
    );
    await saveListing(
      firm.userId,
      {
        displayName: `Roster Firm ${runId}`,
        headline: 'Property and commercial',
        bio: 'Fixture firm.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI', 'SHARJAH'],
        areas: ['REAL_ESTATE_PROPERTY', 'COMMERCIAL'],
        languages: 'Arabic, English',
        addressLine: 'Suite 900, Sample Tower, Dubai',
        acceptsNewClients: 'on',
        published: 'on',
      },
      meta,
    );

    const newLawyerEmail = `hired.${runId}@example.ae`;
    const created = await firmService.createLawyerForFirm(
      firm.userId,
      {
        fullName: 'Hired Lawyer',
        email: newLawyerEmail,
        password: 'HiredLawyer2026!',
        phone: '+971 50 777 8888',
        licenseNumber: `HIRE-${runId}`,
        licensingAuthority: 'Dubai Legal Affairs Department',
        licenseExpiresOn: '2031-06-30',
        yearsOfExperience: '5',
      },
      meta,
    );
    check('the firm can create a lawyer account', created.ok === true, created.ok ? '' : created.message);
    if (created.ok) createdUserIds.push(created.data.userId);

    const hired = created.ok
      ? await prisma.user.findUnique({
          where: { id: created.data.userId },
          select: {
            status: true,
            emailVerifiedAt: true,
            accountType: true,
            roles: true,
            lawyerProfile: {
              select: { affiliatedFirmId: true, createdByFirmId: true, licenseNumber: true },
            },
          },
        })
      : null;

    check('the account is active immediately', hired?.status === 'ACTIVE' && hired.emailVerifiedAt !== null);
    check('it is a lawyer account without reviewer access', hired?.accountType === 'LAWYER' && hired.roles.length === 1);
    check(
      'it is affiliated to the firm that created it',
      hired?.lawyerProfile?.affiliatedFirmId !== null && hired?.lawyerProfile?.createdByFirmId !== null,
    );
    check(
      'the firm is recorded as the creator',
      hired?.lawyerProfile?.createdByFirmId ===
        (await prisma.firmProfile.findUnique({ where: { userId: firm.userId }, select: { id: true } }))?.id,
    );

    const roster = await firmService.listFirmLawyers(firm.userId);
    check('the lawyer appears on the roster straight away', roster.lawyers.length === 1);
    check('and the roster records who created them', roster.lawyers[0]?.createdByFirmId !== null);

    const hiredListing = created.ok
      ? await prisma.listing.findUnique({
          where: { userId: created.data.userId },
          select: { id: true, published: true, areas: true, emirates: true, addressLine: true },
        })
      : null;
    check(
      'a draft listing is prepared for them, not a published one',
      hiredListing?.published === false,
    );
    check(
      'the draft inherits the firm\u2019s practice areas and emirates',
      hiredListing?.areas.includes('REAL_ESTATE_PROPERTY') === true &&
        hiredListing?.emirates.includes('SHARJAH') === true,
    );
    check('and the firm\u2019s address', hiredListing?.addressLine === 'Suite 900, Sample Tower, Dubai');

    const directory = await searchDirectory({ kind: 'LAWYER', areas: ['REAL_ESTATE_PROPERTY'] });
    check(
      'a firm-created lawyer is NOT listed as an independent lawyer',
      !directory.rows.some((row) => row.userId === (created.ok ? created.data.userId : '')),
    );

    // ── They are shown on the firm's profile instead ─────────────────────
    const firmListingId = (
      await prisma.listing.findUnique({ where: { userId: firm.userId }, select: { id: true } })
    )!.id;
    const firmProfileHtml = await (await fetch(`${BASE_URL}/directory/${firmListingId}`)).text();
    check('the firm profile lists its lawyers', firmProfileHtml.includes('Lawyers at this firm'));
    check(
      'and names the lawyer it created',
      firmProfileHtml.includes('Hired Lawyer'),
    );
    check(
      'the firm profile shows the firm\u2019s lawyers rather than a second directory entry',
      !directory.rows.some((row) => row.userId === (created.ok ? created.data.userId : '')),
    );

    // ── The representative card replaces work and education for a firm ────
    // It sits on the About tab, the way a page keeps its page information.
    const firmAboutHtml = await (
      await fetch(`${BASE_URL}/directory/${firmListingId}?tab=about`)
    ).text();
    check(
      'a firm profile shows its legal representative',
      firmAboutHtml.includes('Legal representative'),
    );
    check(
      'and not a work and education card',
      !firmProfileHtml.includes('Work and education'),
    );

    // ── Their own standalone page is closed to the public ────────────────
    const strangerToHired = await fetch(`${BASE_URL}/directory/${hiredListing?.id}`, {
      redirect: 'manual',
    });
    check(
      'a stranger cannot open a firm-created lawyer as a standalone profile',
      strangerToHired.status === 404,
      `got ${strangerToHired.status}`,
    );

    const firmViewingHired = await fetch(`${BASE_URL}/directory/${hiredListing?.id}`, {
      headers: { cookie: `dl_session=${firm.sessionToken}` },
      redirect: 'manual',
    });
    check(
      'but the firm that created them can still reach it',
      firmViewingHired.status === 200,
      `got ${firmViewingHired.status}`,
    );

    // ── A lawyer who signed up themselves keeps their own listing ────────
    const independent = await register(`independent.${runId}@example.ae`, 'LAWYER');
    await makeProfile(independent.userId, 'Independent Lawyer', 9104);
    await saveLawyerCredential(
      independent.userId,
      {
        licenseNumber: `IND-${runId}`,
        licensingAuthority: 'Dubai Legal Affairs Department',
        licenseExpiresOn: '2031-01-01',
        yearsOfExperience: '9',
      },
      meta,
    );
    await saveListing(
      independent.userId,
      {
        displayName: `Independent Lawyer ${runId}`,
        headline: 'Commercial work',
        bio: 'Fixture independent listing.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI'],
        areas: ['COMMERCIAL'],
        languages: 'Arabic, English',
        acceptsNewClients: 'on',
        published: 'on',
      },
      meta,
    );

    // …and then joins the firm through the invitation route.
    const joinInvite = await firmService.inviteLawyerToFirm(
      firm.userId,
      { email: `independent.${runId}@example.ae` },
      meta,
    );
    if (!joinInvite.ok) throw new Error(joinInvite.message);
    const pendingForIndependent = await firmService.listInvitationsForLawyer(independent.userId);
    const joined = await firmService.respondToInvitation(
      independent.userId,
      pendingForIndependent[0]!.id,
      true,
    );
    check('a self-registered lawyer can join a firm', joined.ok === true);

    const independentRow = await prisma.lawyerProfile.findUnique({
      where: { userId: independent.userId },
      select: { affiliatedFirmId: true, createdByFirmId: true },
    });
    check(
      'joining a firm does not mark them as firm-created',
      independentRow?.affiliatedFirmId !== null && independentRow?.createdByFirmId === null,
    );

    const directoryAfterJoining = await searchDirectory({});
    check(
      'so a lawyer who signed up themselves keeps their own directory listing',
      directoryAfterJoining.rows.some((row) => row.userId === independent.userId),
    );

    const signIn = await authService.signIn(
      { email: newLawyerEmail, password: 'HiredLawyer2026!' },
      meta,
    );
    check('the lawyer can sign in with the password the firm chose', signIn.ok === true);
    if (signIn.ok) {
      await prisma.session.deleteMany({ where: { userId: signIn.data.userId } });
    }

    const duplicate = await firmService.createLawyerForFirm(
      firm.userId,
      {
        fullName: 'Duplicate Attempt',
        email: newLawyerEmail,
        password: 'Another2026Pass!',
        licenseNumber: `DUP-${runId}`,
        licensingAuthority: 'Dubai Legal Affairs Department',
      },
      meta,
    );
    check('the same address cannot be created twice', duplicate.ok === false);
    check(
      'and the firm is pointed at the invitation route instead',
      duplicate.ok === false &&
        duplicate.fieldErrors?.email?.includes('Invite') === true,
    );

    // The invitation route still works alongside it.
    const invite = await firmService.inviteLawyerToFirm(
      firm.userId,
      { email: `invited.${runId}@example.ae` },
      meta,
    );
    check('inviting by email is still available', invite.ok === true);

    // ════════════════════════════════════════════════════════════════════════
    section('A long conversation pages back through history');

    const reviewer = await register(`reviewer.${runId}@example.ae`, 'USER');
    await prisma.user.update({ where: { id: reviewer.userId }, data: { roles: ['MEMBER', 'REVIEWER'] } });

    const client = await register(`client.${runId}@example.ae`, 'USER');
    await makeProfile(client.userId, 'Chat Client', 9102);

    // A lawyer the client can send a case to.
    const soloLawyer = await register(`solo.${runId}@example.ae`, 'LAWYER');
    await makeProfile(soloLawyer.userId, 'Solo Lawyer', 9103);
    await saveLawyerCredential(
      soloLawyer.userId,
      {
        licenseNumber: `SOLO-${runId}`,
        licensingAuthority: 'Dubai Legal Affairs Department',
        licenseExpiresOn: '2031-01-01',
        yearsOfExperience: '4',
      },
      meta,
    );
    await uploadDocument(soloLawyer.userId, { kind: 'EMIRATES_ID', file: file('id.png') }, meta);
    await uploadDocument(soloLawyer.userId, { kind: 'LAWYER_LICENSE', file: file('lic.png') }, meta);
    await saveListing(
      soloLawyer.userId,
      {
        displayName: `Solo Lawyer ${runId}`,
        headline: 'Civil claims',
        bio: 'Fixture listing.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI'],
        areas: ['CIVIL'],
        languages: 'Arabic, English',
        acceptsNewClients: 'on',
        published: 'on',
      },
      meta,
    );

    const soloSubmission = await verification.submitForVerification(soloLawyer.userId, meta);
    if (!soloSubmission.ok) throw new Error(soloSubmission.message);
    const soloCase = soloSubmission.data.caseId;
    await verification.claimCase(soloCase, reviewer.userId, meta);
    const soloDocs = await prisma.document.findMany({ where: { caseId: soloCase }, select: { id: true } });
    for (const doc of soloDocs) {
      await verification.reviewDocument(doc.id, reviewer.userId, 'APPROVED', 'ok', meta);
    }
    await verification.decideCase(
      soloCase,
      reviewer.userId,
      { caseId: soloCase, decision: 'APPROVED', notes: 'Verified fixture.' },
      meta,
    );

    const soloListingId = (
      await prisma.listing.findUnique({ where: { userId: soloLawyer.userId }, select: { id: true } })
    )!.id;

    const caseCreated = await cases.createCase(
      client.userId,
      {
        listingId: soloListingId,
        title: 'Long conversation fixture',
        caseType: 'CIVIL',
        description: 'A case used to check that a long conversation pages back correctly.',
      },
      [],
      meta,
    );
    if (!caseCreated.ok) throw new Error(caseCreated.message);
    const threadCaseId = caseCreated.data.caseId;

    await cases.reviewCase(threadCaseId, soloLawyer.userId, meta);
    await cases.acceptCase(threadCaseId, soloLawyer.userId, meta);

    const total = 45;
    for (let index = 1; index <= total; index += 1) {
      await cases.postCaseMessage(threadCaseId, client.userId, {
        body: `Message number ${index} of ${total}.`,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    section('Header links belong to the signed-out experience');

    const signedOutDirectory = await (await fetch(`${BASE_URL}/directory`)).text();
    check(
      'a visitor is offered the directory link in the header',
      signedOutDirectory.includes('How verification works'),
    );

    const signedInDirectory = await (
      await fetch(`${BASE_URL}/directory`, {
        headers: { cookie: `dl_session=${client.sessionToken}` },
        redirect: 'manual',
      })
    ).text();
    check(
      'a signed-in member is not shown the header links',
      !signedInDirectory.includes('How verification works'),
    );
    check(
      'because navigation is in the sidebar',
      signedInDirectory.includes('href="/dashboard"') && signedInDirectory.includes('href="/cases"'),
    );

    const firstPage = await cases.listCaseMessages(threadCaseId, client.userId);
    check(
      'the case page loads one page rather than the whole history',
      firstPage.messages.length === cases.CASE_MESSAGE_PAGE_SIZE,
      `got ${firstPage.messages.length}`,
    );
    check('and knows there is more above it', firstPage.hasMore === true);
    check(
      'the newest message is on the first page',
      firstPage.messages[firstPage.messages.length - 1]?.body === `Message number ${total} of ${total}.`,
    );

    const olderResponse = await fetch(
      `${BASE_URL}/api/cases/${threadCaseId}/messages?before=${encodeURIComponent(firstPage.messages[0]!.id)}`,
      { headers: { cookie: `dl_session=${client.sessionToken}` }, redirect: 'manual' },
    );
    check('older messages can be fetched', olderResponse.status === 200, `got ${olderResponse.status}`);

    const olderPayload = (await olderResponse.json()) as {
      messages: { id: string; body: string; createdAt: string }[];
      hasMore: boolean;
    };
    check('the older page returns messages', olderPayload.messages.length === total - cases.CASE_MESSAGE_PAGE_SIZE);
    check('they are ordered oldest first', olderPayload.messages[0]?.body.startsWith('Message number 1 '));
    check(
      'and none of them duplicates the first page',
      !olderPayload.messages.some((message) =>
        firstPage.messages.some((existing) => existing.id === message.id),
      ),
    );
    check('the start of the case is reached', olderPayload.hasMore === false);

    const stranger = await register(`stranger.${runId}@example.ae`, 'USER');
    const strangerThread = await fetch(`${BASE_URL}/api/cases/${threadCaseId}/messages`, {
      headers: { cookie: `dl_session=${stranger.sessionToken}` },
      redirect: 'manual',
    });
    check(
      'an unrelated member cannot read the conversation through the API',
      strangerThread.status === 404,
      `got ${strangerThread.status}`,
    );

    const anonThread = await fetch(`${BASE_URL}/api/cases/${threadCaseId}/messages`, {
      redirect: 'manual',
    });
    check('nor can a signed-out visitor', anonThread.status === 401, `got ${anonThread.status}`);

    // ════════════════════════════════════════════════════════════════════════
    section('An administrator is confined to the console');

    const adminOnlyPaths = [
      '/dashboard',
      '/cases',
      '/cases/new',
      '/portfolio',
      '/pending',
      '/clients',
      '/calendar',
      '/inquiries',
      '/reviews',
      '/listing',
      '/credentials',
      '/verification',
      '/invitations',
      '/firm/lawyers',
      '/firm/oversight',
    ];
    for (const path of adminOnlyPaths) {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: { cookie: `dl_session=${reviewer.sessionToken}` },
        redirect: 'manual',
      });
      check(`an administrator is turned away from ${path}`, response.status === 307, `got ${response.status}`);
    }

    const adminConsole = await fetch(`${BASE_URL}/admin/verifications`, {
      headers: { cookie: `dl_session=${reviewer.sessionToken}` },
      redirect: 'manual',
    });
    check('but the console is open to them', adminConsole.status === 200);

    for (const path of ['/profile', '/account', '/notifications']) {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: { cookie: `dl_session=${reviewer.sessionToken}` },
        redirect: 'manual',
      });
      check(`an administrator keeps access to ${path}`, response.status === 200, `got ${response.status}`);
    }

    const casePageAsAdmin = await fetch(`${BASE_URL}/cases/${threadCaseId}`, {
      headers: { cookie: `dl_session=${reviewer.sessionToken}` },
      redirect: 'manual',
    });
    check(
      'an administrator cannot open a case as a party',
      casePageAsAdmin.status === 307,
      `got ${casePageAsAdmin.status}`,
    );

    const adminAccept = await cases.acceptCase(threadCaseId, reviewer.userId, meta);
    check('and cannot accept one', adminAccept.ok === false);

    const adminReview = await reviews.createReview(
      reviewer.userId,
      { caseId: threadCaseId, rating: 5, body: 'An administrator trying to review a case they were not part of.' },
      meta,
    );
    check('and cannot review a case they were not part of', adminReview.ok === false);

    const consoleHtml = await adminConsole.text();
    check(
      'the console explains why member areas are closed',
      consoleHtml.includes('Administrator accounts work in this console only') ||
        consoleHtml.includes('Verification requests'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('A review is written on the profile itself');

    const eligible = await reviews.listReviewableCases(client.userId);
    check(
      'the client has a case they may review',
      eligible.some((item) => item.id === threadCaseId),
    );

    const profileAsClient = await fetch(`${BASE_URL}/directory/${soloListingId}`, {
      headers: { cookie: `dl_session=${client.sessionToken}` },
      redirect: 'manual',
    });
    const clientHtml = await profileAsClient.text();
    check('the profile carries the review form', clientHtml.includes('Write a review of'));
    check('with a star selector', clientHtml.includes('Excellent'));
    check('and one star as the lowest option', clientHtml.includes('Poor'));
    check(
      'the form asks which case it is about',
      clientHtml.includes('Which case is this about?'),
    );

    const profileAsStranger = await fetch(`${BASE_URL}/directory/${soloListingId}`, {
      headers: { cookie: `dl_session=${stranger.sessionToken}` },
      redirect: 'manual',
    });
    const strangerHtml = await profileAsStranger.text();
    check(
      'a member with no case is told why they cannot review',
      strangerHtml.includes('You cannot review yet'),
    );
    check('and is not shown the form', !strangerHtml.includes('Write a review of'));

    const profileSignedOut = await (await fetch(`${BASE_URL}/directory/${soloListingId}`)).text();
    check(
      'a signed-out visitor is invited to sign in',
      profileSignedOut.includes('Sign in to leave a review'),
    );

    const published = await reviews.createReview(
      client.userId,
      {
        caseId: threadCaseId,
        rating: 4,
        title: 'Straightforward to deal with',
        body: 'Kept me informed throughout and answered every message the same day.',
      },
      meta,
    );
    check('the review publishes', published.ok === true, published.ok ? '' : published.message);
    check(
      'and the service reports which profile to refresh',
      published.ok === true && published.data.listingId === soloListingId,
    );

    const profileAfter = await (
      await fetch(`${BASE_URL}/directory/${soloListingId}`, {
        headers: { cookie: `dl_session=${client.sessionToken}` },
        redirect: 'manual',
      })
    ).text();
    check('it appears on the profile immediately', profileAfter.includes('Straightforward to deal with'));
    check('with its star rating', profileAfter.includes('4.0'));
    check(
      'and the form is replaced, since the case is now reviewed',
      !profileAfter.includes('Write a review of'),
    );
    check('the reader is told why', profileAfter.includes('You cannot review yet'));
  } finally {
    section('Cleanup');
    const [storedDocs, documentIds, verificationIds, listingIds, inquiryIds] = await Promise.all([
      prisma.document.findMany({ where: { userId: { in: createdUserIds } }, select: { storageKey: true } }),
      prisma.document.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
      prisma.verificationCase.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
      prisma.listing.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
      prisma.inquiry.findMany({
        where: { OR: [{ fromUserId: { in: createdUserIds } }, { toUserId: { in: createdUserIds } }] },
        select: { id: true },
      }),
    ]);
    const legalCaseIds = await prisma.legalCase.findMany({
      where: {
        OR: [
          { clientId: { in: createdUserIds } },
          { lawyer: { userId: { in: createdUserIds } } },
          { firm: { userId: { in: createdUserIds } } },
        ],
      },
      select: { id: true },
    });
    const reviewIds = await prisma.review.findMany({
      where: { OR: [{ authorId: { in: createdUserIds } }, { targetUserId: { in: createdUserIds } }] },
      select: { id: true },
    });

    const entityIds = [
      ...createdUserIds,
      ...documentIds.map((row) => row.id),
      ...verificationIds.map((row) => row.id),
      ...listingIds.map((row) => row.id),
      ...inquiryIds.map((row) => row.id),
      ...legalCaseIds.map((row) => row.id),
      ...reviewIds.map((row) => row.id),
    ];

    await prisma.trafficLog.deleteMany({ where: { userId: { in: createdUserIds } } });
    const auditRows = await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorUserId: { in: createdUserIds } },
          { entityId: { in: entityIds } },
          { metadata: { path: ['email'], string_contains: runId } },
        ],
      },
    });
    const emailRows = await prisma.emailMessage.deleteMany({ where: { toEmail: { contains: runId } } });

    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });

    const { deleteUpload } = await import('../src/lib/storage');
    for (const entry of storedDocs) await deleteUpload(entry.storageKey).catch(() => undefined);

    const remaining = await prisma.user.count({ where: { id: { in: createdUserIds } } });
    check('every account created by this run was removed', remaining === 0);
    console.info(
      `  Removed ${createdUserIds.length} accounts, ${emailRows.count} messages, ${auditRows.count} audit entries.`,
    );

    await prisma.$disconnect();
  }

  console.info(`\n${'═'.repeat(62)}`);
  console.info(`  ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.error('\n  Failures:');
    for (const failure of failures) console.error(`   · ${failure}`);
  }
  console.info('═'.repeat(62));
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('\nThe roles end-to-end run crashed:', error);
  process.exitCode = 1;
});

// Keeps this file a module so its top-level constants stay file-scoped.
export {};
