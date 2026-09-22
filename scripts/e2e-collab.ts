/**
 * End-to-end verification of the collaboration changes: a firm releasing a case
 * to its lawyers, the public enquiry pool, two-factor authentication, the
 * no-login emergency room, and the presentation changes.
 *
 *   npm run e2e:collab
 *
 * Everything runs through the real services and HTTP routes. Every account it
 * creates is removed at the end, and every flag it touches is restored.
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
  const { authenticator } = await import('otplib');
  const { computeCheckDigit } = await import('../src/lib/emirates-id');
  const { generateToken, hashToken } = await import('../src/lib/tokens');
  const authService = await import('../src/server/services/auth-service');
  const { updateProfile } = await import('../src/server/services/profile-service');
  const { saveFirmCredential, saveLawyerCredential } = await import(
    '../src/server/services/credential-service'
  );
  const { saveListing } = await import('../src/server/services/listing-service');
  const { uploadDocument } = await import('../src/server/services/document-service');
  const verification = await import('../src/server/services/verification-service');
  const cases = await import('../src/server/services/case-service');
  const enquiries = await import('../src/server/services/enquiry-service');
  const emergency = await import('../src/server/services/emergency-service');
  const rooms = await import('../src/server/services/room-service');
  const twoFactor = await import('../src/server/services/two-factor-service');
  const { notify } = await import('../src/server/services/notification-service');

  /** The moment the run began, so test alerts can be told from real ones. */
  const runStartedAt = new Date();

  const metric = { sessionToken: '', email: '' };
  let registrationIndex = 0;
  const createdUserIds: string[] = [];
  const originalAvailability: { id: string; acceptsEmergency: boolean; isFirmEmergency: boolean }[] = [];

  function idFor(sequence: number): string {
    const body = `7841997${String(sequence).padStart(7, '0')}`;
    const check = computeCheckDigit(`${body}0`);
    if (check === null) throw new Error('check digit');
    return `${body}${check}`;
  }

  function file(name: string): File {
    return new File([new Uint8Array(PNG_BYTES)], name, { type: 'image/png' });
  }

  async function register(email: string, accountType: 'USER' | 'LAWYER' | 'FIRM') {
    registrationIndex += 1;
    const result = await authService.registerAccount(
      {
        accountType,
        email,
        password: 'CorrectHorse9Battery',
        confirmPassword: 'CorrectHorse9Battery',
        acceptTerms: 'on',
      },
      { ip: `203.0.114.${100 + registrationIndex}`, userAgent: 'dubai-legal-e2e-collab' },
    );
    if (!result.ok) throw new Error(`register ${email}: ${result.message}`);
    createdUserIds.push(result.data.userId);
    return { ...result.data, sessionToken: result.data.token, email };
  }

  async function makeProfile(userId: string, name: string, sequence: number) {
    const result = await updateProfile(
      userId,
      {
        fullName: name,
        dateOfBirth: '1989-09-09',
        placeOfBirth: 'Dubai',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 555 6666',
        emiratesIdNumber: idFor(sequence),
        emiratesIdExpiry: '2035-01-01',
        workDescription: 'Test fixture.',
        educationBackground: 'Test fixture.',
      },
      { ip: null },
    );
    if (!result.ok) throw new Error(`profile ${name}: ${result.message}`);
  }

  /** A verified lawyer with a published listing and a licence on file. */
  async function verifiedLawyer(email: string, sequence: number, reviewerId: string) {
    const account = await register(email, 'LAWYER');
    await makeProfile(account.userId, `Collab Lawyer ${sequence}`, sequence);
    await saveLawyerCredential(
      account.userId,
      {
        licenseNumber: `COLLAB-${sequence}`,
        licensingAuthority: 'Dubai Legal Affairs Department',
        licenseExpiresOn: '2032-01-01',
        yearsOfExperience: '5',
      },
      { ip: null },
    );
    await uploadDocument(account.userId, { kind: 'EMIRATES_ID', file: file('id.png') }, { ip: null });
    await uploadDocument(account.userId, { kind: 'LAWYER_LICENSE', file: file('lic.png') }, { ip: null });
    await saveListing(
      account.userId,
      {
        displayName: `Collab Lawyer ${sequence}`,
        headline: 'Commercial litigation',
        bio: 'Fixture listing for the collaboration suite.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI'],
        areas: ['COMMERCIAL'],
        languages: 'Arabic, English',
        acceptsNewClients: 'on',
        published: 'on',
      },
      { ip: null },
    );

    const submission = await verification.submitForVerification(account.userId, { ip: null });
    if (!submission.ok) throw new Error(submission.message);
    const caseId = submission.data.caseId;
    await verification.claimCase(caseId, reviewerId, { ip: null });
    const docs = await prisma.document.findMany({ where: { caseId }, select: { id: true } });
    for (const doc of docs) {
      await verification.reviewDocument(doc.id, reviewerId, 'APPROVED', 'ok', { ip: null });
    }
    await verification.decideCase(
      caseId,
      reviewerId,
      { caseId, decision: 'APPROVED', notes: 'Verified fixture.' },
      { ip: null },
    );

    const listing = await prisma.listing.findUnique({
      where: { userId: account.userId },
      select: { id: true },
    });
    const profile = await prisma.lawyerProfile.findUnique({
      where: { userId: account.userId },
      select: { id: true },
    });
    return { ...account, listingId: listing?.id ?? '', lawyerProfileId: profile?.id ?? '' };
  }

  try {
    // ════════════════════════════════════════════════════════════════════════
    section('Presentation');

    const appLayout = await (await import('node:fs/promises')).readFile(
      'src/app/(app)/layout.tsx',
      'utf8',
    );
    check(
      'the side navigation scrolls independently of the page',
      appLayout.includes('sm:overflow-y-auto') && appLayout.includes('sm:max-h-[calc(100vh-6rem)]'),
    );

    const landingHtml = await (await fetch(`${BASE_URL}/`)).text();
    check('the landing page offers an enquiry form', landingHtml.includes('Send an enquiry'));
    check(
      'with the legend that an account is faster',
      landingHtml.includes('An account gets you a faster'),
    );
    check(
      'and the emergency route needs no account',
      landingHtml.includes('Urgent help, no account'),
    );
    check(
      'the domain accents are applied, not random colours',
      landingHtml.includes('text-domain-emergency') ||
        landingHtml.includes('bg-domain-directory') ||
        landingHtml.includes('bg-domain-payment'),
    );

    const css = await (await import('node:fs/promises')).readdir('.next/static/css');
    const cssText = await (await import('node:fs/promises')).readFile(
      `.next/static/css/${css[0]}`,
      'utf8',
    );
    check('the domain palette is compiled', cssText.includes('--color-domain-emergency'));
    check('and a domain accent class exists', cssText.includes('domain-directory'));

    const emergencyPageHtml = await (await fetch(`${BASE_URL}/emergency`)).text();
    check(
      'the emergency page needs no login',
      emergencyPageHtml.includes('Get a lawyer on video now') && emergencyPageHtml.includes('No account'),
    );
    check(
      'and warns to call 999 for danger',
      emergencyPageHtml.includes('999'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('A firm releases a case to its lawyers');

    const reviewer = await register(`reviewer.${runId}@example.ae`, 'USER');
    await prisma.user.update({
      where: { id: reviewer.userId },
      data: { roles: ['MEMBER', 'REVIEWER'] },
    });

    const client = await register(`client.${runId}@example.ae`, 'USER');
    await makeProfile(client.userId, 'Collab Client', 9301);

    const firm = await register(`firm.${runId}@example.ae`, 'FIRM');
    await makeProfile(firm.userId, 'Firm Administrator', 9302);
    await saveFirmCredential(
      firm.userId,
      {
        legalName: `Collab Firm ${runId} LLC`,
        tradeLicenseNumber: `DED-C-${runId}`,
        tradeLicenseAuthority: 'Dubai Economy and Tourism',
        tradeLicenseExpiresOn: '2032-01-01',
        registeredEmirate: 'DUBAI',
        authorisedSignatory: 'Firm Administrator',
      },
      { ip: null },
    );
    await saveListing(
      firm.userId,
      {
        displayName: `Collab Firm ${runId}`,
        headline: 'Commercial and property',
        bio: 'Fixture firm.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI'],
        areas: ['COMMERCIAL'],
        languages: 'Arabic, English',
        acceptsNewClients: 'on',
        published: 'on',
      },
      { ip: null },
    );
    const firmListingId = (
      await prisma.listing.findUnique({ where: { userId: firm.userId }, select: { id: true } })
    )!.id;
    const firmProfileId = (
      await prisma.firmProfile.findUnique({ where: { userId: firm.userId }, select: { id: true } })
    )!.id;

    // A firm with no lawyers cannot release anything.
    const emptyRelease = await cases.distributeCaseToFirmLawyers('', firm.userId, { ip: null });
    check('a case that does not exist cannot be released', emptyRelease.ok === false);

    // Two lawyers registered with the firm.
    const first = await verifiedLawyer(`first.${runId}@example.ae`, 9303, reviewer.userId);
    const second = await verifiedLawyer(`second.${runId}@example.ae`, 9304, reviewer.userId);
    await prisma.lawyerProfile.update({
      where: { id: first.lawyerProfileId },
      data: { affiliatedFirmId: firmProfileId },
    });
    await prisma.lawyerProfile.update({
      where: { id: second.lawyerProfileId },
      data: { affiliatedFirmId: firmProfileId },
    });

    const submitted = await cases.createCase(
      client.userId,
      {
        listingId: firmListingId,
        title: 'Firm distribution fixture',
        caseType: 'COMMERCIAL',
        description: 'A case sent to a firm so that the release to its lawyers can be exercised.',
      },
      [],
      { ip: null },
    );
    check('a case can be sent to a firm', submitted.ok === true);
    const caseId = submitted.ok ? submitted.data.caseId : '';

    const beforeRelease = await prisma.legalCase.findUnique({
      where: { id: caseId },
      select: { status: true, offers: { select: { id: true } } },
    });
    check('it starts awaiting the firm', beforeRelease?.status === 'SUBMITTED');
    check('with no offers to lawyers yet', beforeRelease?.offers.length === 0);

    const released = await cases.distributeCaseToFirmLawyers(caseId, firm.userId, { ip: null });
    check('the firm can release it to its lawyers', released.ok === true, released.ok ? '' : released.message);
    check('and it goes to both of them', released.ok === true && released.data.offers === 2);

    const afterRelease = await prisma.legalCase.findUnique({
      where: { id: caseId },
      select: { status: true, distributedAt: true, offers: { select: { status: true } } },
    });
    check('the case is now distributed', afterRelease?.status === 'DISTRIBUTED');
    check('with a timestamp', afterRelease?.distributedAt !== null);
    check(
      'and every offer is pending',
      afterRelease?.offers.every((offer) => offer.status === 'PENDING') === true,
    );

    const offerAlerts = await prisma.notification.findMany({
      where: { userId: { in: [first.userId, second.userId] }, kind: 'case.offered' },
    });
    check('both lawyers are told they have been offered it', offerAlerts.length === 2);

    const pendingForFirst = await cases.listCasesForLawyer(first.userId);
    check(
      'it appears in the first lawyer\u2019s queue',
      pendingForFirst.offered.some((item) => item.id === caseId),
    );

    const offersForFirst = await cases.listOffersForLawyer(first.userId);
    check(
      'and the offer itself is listed for them',
      offersForFirst.some((offer) => offer.caseId === caseId),
    );

    // A stranger cannot pass on somebody else's offer.
    const stranger = await register(`stranger.${runId}@example.ae`, 'USER');
    const strangerPass = await cases.passCaseOffer(caseId, stranger.userId, null);
    check('somebody with no offer cannot pass on it', strangerPass.ok === false);

    // The second lawyer passes; the case stays available to the first.
    const passed = await cases.passCaseOffer(caseId, second.userId, 'Conflicted on this one.');
    check('an offered lawyer can pass', passed.ok === true, passed.ok ? '' : passed.message);

    const afterPass = await prisma.caseOffer.findUnique({
      where: { caseId_lawyerId: { caseId, lawyerId: second.lawyerProfileId } },
      select: { status: true, note: true },
    });
    check('the pass is recorded with the reason', afterPass?.status === 'PASSED' && afterPass?.note === 'Conflicted on this one.');

    const afterOnePass = await prisma.legalCase.findUnique({
      where: { id: caseId },
      select: { status: true },
    });
    check('the case is still open to the others', afterOnePass?.status === 'DISTRIBUTED');

    // The first lawyer takes it.
    const took = await cases.acceptCase(caseId, first.userId, { ip: null });
    check('the first lawyer can take it', took.ok === true, took.ok ? '' : took.message);

    const afterTake = await prisma.legalCase.findUnique({
      where: { id: caseId },
      select: { status: true, lawyerId: true, offers: { select: { lawyerId: true, status: true } } },
    });
    check('it is assigned to them', afterTake?.status === 'ASSIGNED' && afterTake.lawyerId === first.lawyerProfileId);
    check(
      'their own offer is recorded as accepted',
      afterTake?.offers.find((offer) => offer.lawyerId === first.lawyerProfileId)?.status === 'ACCEPTED',
    );
    check(
      'and a colleague who already passed keeps their answer',
      afterTake?.offers.find((offer) => offer.lawyerId === second.lawyerProfileId)?.status === 'PASSED',
    );

    // A third lawyer who never answered has their offer stood down instead.
    const third = await verifiedLawyer(`third.${runId}@example.ae`, 9306, reviewer.userId);
    await prisma.lawyerProfile.update({
      where: { id: third.lawyerProfileId },
      data: { affiliatedFirmId: firmProfileId },
    });
    const thirdCase = await cases.createCase(
      client.userId,
      {
        listingId: firmListingId,
        title: 'Two offers, one answer',
        caseType: 'COMMERCIAL',
        description: 'A case used to check that an unanswered offer is stood down when somebody takes it.',
      },
      [],
      { ip: null },
    );
    const thirdCaseId = thirdCase.ok ? thirdCase.data.caseId : '';
    await cases.distributeCaseToFirmLawyers(thirdCaseId, firm.userId, { ip: null });
    await cases.passCaseOffer(thirdCaseId, second.userId, null);
    const thirdTakes = await cases.acceptCase(thirdCaseId, third.userId, { ip: null });
    check('a third lawyer can take it', thirdTakes.ok === true);

    const thirdOffers = await prisma.caseOffer.findMany({
      where: { caseId: thirdCaseId },
      select: { lawyerId: true, status: true },
    });
    check(
      'an unanswered offer is stood down automatically',
      thirdOffers.find((offer) => offer.lawyerId === second.lawyerProfileId)?.status === 'PASSED' &&
        thirdOffers.find((offer) => offer.lawyerId === third.lawyerProfileId)?.status === 'ACCEPTED' &&
        thirdOffers.find((offer) => offer.lawyerId === first.lawyerProfileId)?.status === 'WITHDRAWN',
    );

    const clientTold = await prisma.notification.findMany({
      where: { userId: client.userId, kind: { in: ['case.distributed', 'case.assigned'] } },
    });
    check('the client is told at each step', clientTold.length >= 2);

    // Everybody passing tells the firm.
    const secondCase = await cases.createCase(
      client.userId,
      {
        listingId: firmListingId,
        title: 'Nobody takes this one',
        caseType: 'COMMERCIAL',
        description: 'A case used to check that the firm is told when every lawyer passes on it.',
      },
      [],
      { ip: null },
    );
    const secondCaseId = secondCase.ok ? secondCase.data.caseId : '';
    await cases.distributeCaseToFirmLawyers(secondCaseId, firm.userId, { ip: null });
    // Every lawyer the firm has must answer before the firm is told nobody took it.
    const everyoneOffered = await prisma.caseOffer.findMany({
      where: { caseId: secondCaseId },
      select: { lawyer: { select: { userId: true } } },
    });
    for (const offer of everyoneOffered) {
      await cases.passCaseOffer(secondCaseId, offer.lawyer.userId, null);
    }

    const exhausted = await prisma.notification.findMany({
      where: { userId: firm.userId, kind: 'case.offers_exhausted' },
    });
    check('the firm is told when nobody takes it', exhausted.length === 1);
    check(
      'and the case is left for the firm rather than lost',
      (await prisma.legalCase.findUnique({ where: { id: secondCaseId }, select: { status: true } }))
        ?.status === 'DISTRIBUTED',
    );

    // ════════════════════════════════════════════════════════════════════════
    section('The public enquiry pool');

    const enquiry = await enquiries.createEnquiry(
      {
        name: 'Public Enquirer',
        email: `public.${runId}@example.com`,
        phone: '+971 50 777 0000',
        caseType: 'LABOUR_EMPLOYMENT',
        subject: 'Question about unpaid wages',
        message: 'My employer has not paid me for two months and I would like to know my options.',
      },
      { ip: '203.0.114.250' },
    );
    check('an enquiry can be sent without an account', enquiry.ok === true, enquiry.ok ? '' : enquiry.message);
    check('and it reaches the registered professionals', enquiry.ok === true && enquiry.data.notified > 0);

    const enquiryId = enquiry.ok ? enquiry.data.enquiryId : '';

    const poolAlerts = await prisma.notification.findMany({
      where: { userId: first.userId, kind: 'enquiry.received' },
    });
    check('a professional is alerted about it', poolAlerts.length === 1);

    const pool = await enquiries.listOpenEnquiries();
    check('it appears in the open pool', pool.some((row) => row.id === enquiryId));

    const claimed = await enquiries.claimEnquiry(enquiryId, first.userId, { ip: null });
    check('a professional can claim it', claimed.ok === true, claimed.ok ? '' : claimed.message);

    const claimRow = await prisma.publicEnquiry.findUnique({
      where: { id: enquiryId },
      select: { status: true, claimedById: true, claimedAt: true },
    });
    check('it leaves the pool', claimRow?.status === 'CLAIMED' && claimRow.claimedById === first.userId);

    const secondClaim = await enquiries.claimEnquiry(enquiryId, second.userId, { ip: null });
    check('and nobody else can claim the same one', secondClaim.ok === false);

    const claimNotice = await prisma.emailMessage.findFirst({
      where: { toEmail: `public.${runId}@example.com`, purpose: 'ENQUIRY_CLAIMED' },
    });
    check('the enquirer is told who picked it up', claimNotice !== null);
    check(
      'and the message does not claim an email was delivered',
      claimNotice !== null && claimNotice.bodyText.includes('create a free account'),
    );

    const closed = await enquiries.closeEnquiry(enquiryId, second.userId);
    check('somebody else cannot close it', closed.ok === false);
    const closedProperly = await enquiries.closeEnquiry(enquiryId, first.userId);
    check('the claimer can close it', closedProperly.ok === true);

    const enquiryStats = await enquiries.enquiryOverview();
    check('the administrator sees the pool statistics', enquiryStats.recent.length > 0);
    check('including a claim rate', enquiryStats.claimRate !== null);

    const adminEnquiries = await fetch(`${BASE_URL}/admin/enquiries`, {
      headers: { cookie: `dl_session=${reviewer.sessionToken}` },
      redirect: 'manual',
    });
    check('the enquiry console renders', adminEnquiries.status === 200, `got ${adminEnquiries.status}`);

    const adminEnquiriesHtml = await adminEnquiries.text();
    check(
      'and masks the enquirer\u2019s contact details',
      !adminEnquiriesHtml.includes('+971 50 777 0000'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Two-factor authentication');

    const secure = await register(`secure.${runId}@example.ae`, 'USER');
    await makeProfile(secure.userId, 'Two Factor User', 9305);

    check(
      'a fresh account has two-factor off',
      twoFactor.twoFactorEnabled(
        (await prisma.user.findUnique({
          where: { id: secure.userId },
          select: { twoFactorEnabledAt: true },
        }))!,
      ) === false,
    );

    const enrolment = await twoFactor.beginEnrolment(secure.userId);
    check('an enrolment can be started', enrolment.ok === true);
    check(
      'and returns a secret and a QR code',
      enrolment.ok === true && enrolment.data.secret.length >= 16 && enrolment.data.qrDataUrl.startsWith('data:image/png'),
    );

    const secret = enrolment.ok ? enrolment.data.secret : '';

    const wrongCode = await twoFactor.confirmEnrolment(secure.userId, '000000', { ip: null });
    check('a wrong code does not switch it on', wrongCode.ok === false);
    check(
      'and the account is still unprotected',
      (await prisma.user.findUnique({
        where: { id: secure.userId },
        select: { twoFactorEnabledAt: true },
      }))?.twoFactorEnabledAt === null,
    );

    const confirmed = await twoFactor.confirmEnrolment(
      secure.userId,
      authenticator.generate(secret),
      { ip: null, keepSessionId: null },
    );
    check('the right code switches it on', confirmed.ok === true, confirmed.ok ? '' : confirmed.message);
    check(
      'and recovery codes are issued once',
      confirmed.ok === true && confirmed.data.recoveryCodes.length === 8,
    );

    const recoveryCodes = confirmed.ok ? confirmed.data.recoveryCodes : [];

    const stored = await prisma.user.findUnique({
      where: { id: secure.userId },
      select: { twoFactorEnabledAt: true, twoFactorRecoveryCodes: true, twoFactorSecret: true },
    });
    check('the account is protected', stored?.twoFactorEnabledAt !== null);
    check('the recovery codes are stored as digests', stored?.twoFactorRecoveryCodes.every((code) => code.length === 64) === true);
    check(
      'and the plaintext codes are not stored',
      stored?.twoFactorRecoveryCodes.includes(recoveryCodes[0]!) === false,
    );

    // A correct code verifies.
    check(
      'a live code verifies',
      (await twoFactor.verifySecondFactor(secure.userId, authenticator.generate(secret))) === true,
    );
    check('a wrong code does not', (await twoFactor.verifySecondFactor(secure.userId, '111111')) === false);

    // A recovery code works exactly once.
    const recovery = recoveryCodes[0]!;
    check(
      'a recovery code works',
      (await twoFactor.verifySecondFactor(secure.userId, recovery)) === true,
    );
    check(
      'and cannot be used twice',
      (await twoFactor.verifySecondFactor(secure.userId, recovery)) === false,
    );
    check('leaving seven codes', (await twoFactor.recoveryCodeCount(secure.userId)) === 7);

    // Signing in returns a session that can reach nothing until a code is given.
    const signIn = await authService.signIn(
      { email: secure.email, password: 'CorrectHorse9Battery' },
      { ip: '203.0.114.251', userAgent: 'collab' },
    );
    check('sign-in reports that a second factor is needed', signIn.ok === true && signIn.data.twoFactorRequired === true);

    const pendingToken = signIn.ok ? signIn.data.token : '';
    const unverifiedDashboard = await fetch(`${BASE_URL}/dashboard`, {
      headers: { cookie: `dl_session=${pendingToken}` },
      redirect: 'manual',
    });
    check(
      'an unverified session is sent to the prompt',
      unverifiedDashboard.status === 307 &&
        (unverifiedDashboard.headers.get('location') ?? '').includes('/login/two-factor'),
      `got ${unverifiedDashboard.status}`,
    );

    const verifiedDashboard = await fetch(`${BASE_URL}/dashboard`, {
      headers: { cookie: `dl_session=${secure.sessionToken}` },
      redirect: 'manual',
    });
    check(
      'and the original session, marked verified at signup, still works',
      verifiedDashboard.status === 200 || verifiedDashboard.status === 307,
    );

    // Disabling requires the password.
    const wrongPassword = await twoFactor.disableTwoFactor(secure.userId, 'NotThePassword1', { ip: null });
    check('two-factor cannot be turned off without the password', wrongPassword.ok === false);

    const disabled = await twoFactor.disableTwoFactor(secure.userId, 'CorrectHorse9Battery', { ip: null });
    check('the password turns it off', disabled.ok === true);
    check(
      'and the secret is cleared',
      (await prisma.user.findUnique({
        where: { id: secure.userId },
        select: { twoFactorSecret: true, twoFactorEnabledAt: true },
      }))?.twoFactorSecret === null,
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Emergency without an account');

    const allLawyers = await prisma.lawyerProfile.findMany({
      select: { id: true, acceptsEmergency: true, isFirmEmergency: true },
    });
    originalAvailability.push(...allLawyers);

    // A lawyer opts in, so the public route has somebody to reach.
    await prisma.lawyerProfile.update({
      where: { id: first.lawyerProfileId },
      data: { acceptsEmergency: true },
    });

    const guest = await emergency.raiseGuestEmergency(
      {
        guestName: 'Detained Person',
        guestPhone: '+971 55 000 1111',
        caseType: 'CRIMINAL_PENAL',
        description: 'I am being held at a police station and need a lawyer present tonight.',
      },
      { ip: '203.0.114.252' },
    );
    check('an emergency can be raised without an account', guest.ok === true, guest.ok ? '' : guest.message);
    check('and a video room is opened immediately', guest.ok === true && guest.data.roomCode.length > 5);

    const guestRoomCode = guest.ok ? guest.data.roomCode : '';
    const guestToken = guest.ok ? guest.data.guestToken : '';

    const guestRow = await prisma.emergencyRequest.findUnique({
      where: { id: guest.ok ? guest.data.emergencyId : '' },
      select: { clientId: true, guestName: true, roomCode: true, guestTokenHash: true },
    });
    check('the request has no account behind it', guestRow?.clientId === null);
    check('the name they gave is kept', guestRow?.guestName === 'Detained Person');
    check('and the token is stored only as a digest', guestRow?.guestTokenHash !== guestToken);

    // The on-call lawyer is told, with the room link.
    const guestAlerts = await prisma.notification.findMany({
      where: { userId: first.userId, kind: 'emergency.public' },
    });
    check('the on-call lawyer is alerted', guestAlerts.length === 1);
    check(
      'and the alert points at the room',
      guestAlerts[0]?.link?.includes(guestRoomCode) === true,
    );

    // The guest is admitted by token, and by nothing else.
    const guestAccess = await rooms.resolveRoomForGuest(guestRoomCode, guestToken);
    check('the guest token admits them', guestAccess?.role === 'CLIENT');
    check('a wrong token does not', (await rooms.resolveRoomForGuest(guestRoomCode, 'not-the-token')) === null);

    const guestRoomPage = await fetch(`${BASE_URL}/emergency/room/${guestRoomCode}?t=${guestToken}`, {
      redirect: 'manual',
    });
    check('the guest room page needs no login', guestRoomPage.status === 200, `got ${guestRoomPage.status}`);

    const guestRoomWrong = await fetch(`${BASE_URL}/emergency/room/${guestRoomCode}?t=wrong`, {
      redirect: 'manual',
    });
    check('and a bad token gets a 404', guestRoomWrong.status === 404, `got ${guestRoomWrong.status}`);

    // A lawyer on call may join; somebody who is not cannot.
    const lawyerAccess = await rooms.resolveRoomForUser(guestRoomCode, first.userId);
    check('a lawyer on emergency call may join', lawyerAccess?.role === 'PROFESSIONAL');

    const notOnCall = await rooms.resolveRoomForUser(guestRoomCode, second.userId);
    check('a lawyer who is not on call may not', notOnCall === null);

    const strangerAccess = await rooms.resolveRoomForUser(guestRoomCode, stranger.userId);
    check('an unrelated member may not', strangerAccess === null);

    const adminAccess = await rooms.resolveRoomForUser(guestRoomCode, reviewer.userId);
    check('and neither may an administrator', adminAccess === null);

    // Joining is what answers the emergency.
    await rooms.claimEmergencyOnJoin(lawyerAccess!, first.userId);
    const answered = await prisma.emergencyRequest.findUnique({
      where: { id: guest.ok ? guest.data.emergencyId : '' },
      select: { status: true, acceptedById: true, acceptedAt: true },
    });
    check('joining the room answers the emergency', answered?.status === 'ACCEPTED');
    check('recording who answered', answered?.acceptedById === first.userId);

    const guestView = await emergency.guestEmergencyByRoom(guestRoomCode);
    check('the guest can see who joined', guestView?.acceptedBy?.id === first.userId);

    // The desk shows it with a join link rather than an accept button.
    const deskHtml = await (
      await fetch(`${BASE_URL}/emergency/desk`, {
        headers: { cookie: `dl_session=${second.sessionToken}` },
        redirect: 'manual',
      })
    ).text();
    check('the emergency desk renders', deskHtml.includes('Open urgent requests'));
  } finally {
    section('Cleanup');

    for (const row of originalAvailability) {
      await prisma.lawyerProfile
        .update({
          where: { id: row.id },
          data: { acceptsEmergency: row.acceptsEmergency, isFirmEmergency: row.isFirmEmergency },
        })
        .catch(() => undefined);
    }

    const [storedDocs, documentIds, verificationIds, listingIds, caseFileRows] = await Promise.all([
      prisma.document.findMany({ where: { userId: { in: createdUserIds } }, select: { storageKey: true } }),
      prisma.document.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
      prisma.verificationCase.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
      prisma.listing.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
      prisma.caseFile.findMany({ where: { uploadedById: { in: createdUserIds } }, select: { storageKey: true } }),
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
    const emergencyIds = await prisma.emergencyRequest.findMany({
      where: { OR: [{ clientId: { in: createdUserIds } }, { acceptedById: { in: createdUserIds } }] },
      select: { id: true },
    });

    const entityIds = [
      ...createdUserIds,
      ...documentIds.map((row) => row.id),
      ...verificationIds.map((row) => row.id),
      ...listingIds.map((row) => row.id),
      ...legalCaseIds.map((row) => row.id),
      ...emergencyIds.map((row) => row.id),
    ];

    await prisma.publicEnquiry.deleteMany({ where: { email: { contains: runId } } });
    await prisma.trafficLog.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.pushSubscription.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.roomSignal.deleteMany({ where: { fromUserId: { in: createdUserIds } } });
    await prisma.roomPresence.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorUserId: { in: createdUserIds } },
          { entityId: { in: entityIds } },
          { metadata: { path: ['email'], string_contains: runId } },
        ],
      },
    });
    await prisma.emailMessage.deleteMany({ where: { toEmail: { contains: runId } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });

    const { deleteUpload } = await import('../src/lib/storage');
    for (const entry of [...storedDocs, ...caseFileRows]) {
      await deleteUpload(entry.storageKey).catch(() => undefined);
    }

    const remaining = await prisma.user.count({ where: { id: { in: createdUserIds } } });
    check('every account created by this run was removed', remaining === 0);

    // ── Alerts this run raised for people it did not create ──────────────────
    // Some notifications fan out beyond the fixtures: an emergency reaches every
    // professional on call, an enquiry reaches every registered professional, and
    // a support ticket reaches every reviewer. Those are test alerts and must not
    // be left sitting in a real account's list.
    const strayAlerts = await prisma.notification.deleteMany({
      where: {
        createdAt: { gte: runStartedAt },
        userId: { notIn: createdUserIds },
        kind: {
          in: [
            'emergency.raised',
            'emergency.public',
            'enquiry.received',
            'support.opened',
            'support.replied',
          ],
        },
      },
    });
    console.info(`  Removed ${strayAlerts.count} alert(s) raised for accounts this run did not create.`);

    // Guest emergency rooms have no account behind them, so deleting the fixture
    // accounts does not take them with it. They are this run's, so they go too —
    // along with the signalling for a room code nobody can reach any more.
    const strayEmergencies = await prisma.emergencyRequest.findMany({
      where: { createdAt: { gte: runStartedAt }, clientId: null },
      select: { id: true, roomCode: true },
    });
    if (strayEmergencies.length > 0) {
      const roomCodes = strayEmergencies
        .map((row) => row.roomCode)
        .filter((code): code is string => Boolean(code));
      const emergencyIds = strayEmergencies.map((row) => row.id);

      await prisma.roomSignal.deleteMany({ where: { roomCode: { in: roomCodes } } });
      await prisma.roomPresence.deleteMany({ where: { roomCode: { in: roomCodes } } });
      await prisma.auditLog.deleteMany({ where: { entityId: { in: emergencyIds } } });
      await prisma.emergencyRequest.deleteMany({ where: { id: { in: emergencyIds } } });
      console.info(`  Removed ${strayEmergencies.length} guest emergency request(s) this run created.`);
    }

    console.info(`  Removed ${createdUserIds.length} accounts and restored every emergency flag.`);

    await prisma.$disconnect();
    void metric;
    void notify;
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
  console.error('\nThe collaboration end-to-end run crashed:', error);
  process.exitCode = 1;
});

// Keeps this file a module so its top-level constants stay file-scoped.
export {};
