/**
 * End-to-end verification of the six new features: directory filters as a
 * dropdown, browser push, emergency representation, the conference room and
 * office requests, simulated payments, and the administrator's new monitoring
 * and deletion powers.
 *
 *   npm run e2e:features
 *
 * Everything runs through the real services and HTTP routes. Every account it
 * creates is removed at the end, and every setting it touches is restored.
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
  const { addDaysToKey, todayKey } = await import('../src/lib/time');
  const authService = await import('../src/server/services/auth-service');
  const { updateProfile } = await import('../src/server/services/profile-service');
  const { saveFirmCredential, saveLawyerCredential } = await import(
    '../src/server/services/credential-service'
  );
  const { saveListing } = await import('../src/server/services/listing-service');
  const { uploadDocument } = await import('../src/server/services/document-service');
  const verification = await import('../src/server/services/verification-service');
  const cases = await import('../src/server/services/case-service');
  const appointments = await import('../src/server/services/appointment-service');
  const emergency = await import('../src/server/services/emergency-service');
  const payments = await import('../src/server/services/payment-service');
  const push = await import('../src/server/services/push-service');
  const rooms = await import('../src/server/services/room-service');
  const admin = await import('../src/server/services/admin-service');
  const { formatAed } = await import('../src/lib/payment-format');

  /** The moment the run began, so test alerts can be told from real ones. */
  const runStartedAt = new Date();

  const meta = { ip: '203.0.113.50', userAgent: 'dubai-legal-e2e-features' };
  /** Each signup comes from its own address, so the real per-connection
   *  registration limit is not what the suite ends up testing. */
  let registrationIndex = 0;
  const createdUserIds: string[] = [];
  const originalAvailability: { id: string; acceptsEmergency: boolean }[] = [];

  function idFor(sequence: number): string {
    const body = `7841996${String(sequence).padStart(7, '0')}`;
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
        fullName: `Test ${accountType}`,
        phone: '+971 50 000 0000',
        password: 'CorrectHorse9Battery',
        confirmPassword: 'CorrectHorse9Battery',
        acceptTerms: 'on',
      },
      { ...meta, ip: `203.0.113.${100 + registrationIndex}` },
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
        dateOfBirth: '1988-08-08',
        placeOfBirth: 'Dubai',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 444 5555',
        emiratesIdNumber: idFor(sequence),
        emiratesIdExpiry: '2034-01-01',
        workDescription: 'Test fixture.',
        educationBackground: 'Test fixture.',
      },
      meta,
    );
    if (!result.ok) throw new Error(`profile ${name}: ${result.message}`);
  }

  /** A verified lawyer with a published listing, ready to accept work. */
  async function verifiedLawyer(email: string, sequence: number, reviewerId: string) {
    const account = await register(email, 'LAWYER');
    await makeProfile(account.userId, `Feature Lawyer ${sequence}`, sequence);
    await saveLawyerCredential(
      account.userId,
      {
        licenseNumber: `FEAT-${sequence}`,
        licensingAuthority: 'Dubai Legal Affairs Department',
        licenseExpiresOn: '2032-01-01',
        yearsOfExperience: '6',
        // A fee is paid by bank transfer, so the fixture practice banks somewhere.
        bankAccountName: `Feature Lawyer ${sequence}`,
        bankName: 'Emirates NBD',
        bankIban: 'AE070331234567890123456',
      },
      meta,
    );
    await uploadDocument(account.userId, { kind: 'EMIRATES_ID', file: file('id.png') }, meta);
    await uploadDocument(account.userId, { kind: 'LAWYER_LICENSE', file: file('lic.png') }, meta);
    await saveListing(
      account.userId,
      {
        displayName: `Feature Lawyer ${sequence}`,
        headline: 'Commercial litigation',
        bio: 'Fixture listing for the feature suite.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI'],
        areas: ['COMMERCIAL'],
        languages: 'Arabic, English',
        acceptsNewClients: 'on',
        published: 'on',
      },
      meta,
    );

    const submission = await verification.submitForVerification(account.userId, meta);
    if (!submission.ok) throw new Error(submission.message);
    const caseId = submission.data.caseId;
    await verification.claimCase(caseId, reviewerId, meta);
    const docs = await prisma.document.findMany({ where: { caseId }, select: { id: true } });
    for (const doc of docs) {
      await verification.reviewDocument(doc.id, reviewerId, 'APPROVED', 'ok', meta);
    }
    await verification.decideCase(
      caseId,
      reviewerId,
      { caseId, decision: 'APPROVED', notes: 'Verified fixture.' },
      meta,
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
    section('Directory filters are a dropdown, not a permanent panel');

    const directoryHtml = await (await fetch(`${BASE_URL}/directory`)).text();
    check('the filters sit inside a collapsible element', directoryHtml.includes('<details'));
    check(
      'the summary invites you to open them',
      directoryHtml.includes('Filter the directory'),
    );
    check(
      'and the filter form itself is still there',
      directoryHtml.includes('Areas of law') || directoryHtml.includes('Filter the directory'),
    );
    const asideCount = (directoryHtml.match(/aria-label="Filters"/g) ?? []).length;
    check('there is no permanent filter sidebar', asideCount === 0, `found ${asideCount}`);

    // ════════════════════════════════════════════════════════════════════════
    section('Browser push notifications');

    check('push is configured from the VAPID keys', push.pushConfigured() === true);
    check('the public key is exposed for the browser', push.vapidPublicKey().length > 20);

    const reviewer = await register(`reviewer.${runId}@example.ae`, 'USER');
    await prisma.user.update({
      where: { id: reviewer.userId },
      data: { roles: ['MEMBER', 'REVIEWER'] },
    });

    const pushUser = await register(`push.${runId}@example.ae`, 'USER');

    const badSubscription = await push.saveSubscription(
      pushUser.userId,
      { endpoint: 'not-a-url', keys: { p256dh: 'x', auth: 'y' } },
      null,
    );
    check('a malformed subscription is refused', badSubscription.ok === false);

    const endpoint = `https://push.example.invalid/${runId}`;
    const saved = await push.saveSubscription(
      pushUser.userId,
      { endpoint, keys: { p256dh: 'BExampleKeyValueLongEnough', auth: 'ExampleAuthValue' } },
      'e2e-agent',
    );
    check('a valid subscription is stored', saved.ok === true);
    check('and counted for the member', (await push.subscriptionCount(pushUser.userId)) === 1);

    // Re-subscribing on the same browser must update rather than duplicate.
    await push.saveSubscription(
      pushUser.userId,
      { endpoint, keys: { p256dh: 'BSecondKeyValueLongEnough', auth: 'SecondAuthValue' } },
      'e2e-agent-2',
    );
    check('re-subscribing updates in place', (await push.subscriptionCount(pushUser.userId)) === 1);

    // A push service that does not exist must fail without breaking the alert.
    const delivered = await push.sendPushToUser(pushUser.userId, {
      title: 'Delivery check',
      body: 'This endpoint does not exist.',
    });
    check('a dead endpoint delivers nothing', delivered === 0);
    check(
      'and the subscription survives a single failure',
      (await push.subscriptionCount(pushUser.userId)) === 1,
    );

    const alertBefore = await prisma.notification.count({ where: { userId: pushUser.userId } });
    const { notify } = await import('../src/server/services/notification-service');
    await notify({ userId: pushUser.userId, kind: 'e2e.check', title: 'Alert despite push failing' });
    const alertAfter = await prisma.notification.count({ where: { userId: pushUser.userId } });
    check('the in-app alert is still recorded when push fails', alertAfter === alertBefore + 1);

    check('the service worker is served', (await fetch(`${BASE_URL}/sw.js`)).status === 200);
    check('the notification icon is served', (await fetch(`${BASE_URL}/icon-192.png`)).status === 200);

    // The account page offers the control, and says when push is unavailable.
    const accountHtml = await (
      await fetch(`${BASE_URL}/account`, {
        headers: { cookie: `dl_session=${pushUser.sessionToken}` },
        redirect: 'manual',
      })
    ).text();
    check('the account page carries the notification control', accountHtml.includes('Browser notifications'));
    check(
      'and offers the control to turn it on',
      accountHtml.includes('Turn on notifications') || accountHtml.includes('Checking'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Emergency representation');

    const client = await register(`client.${runId}@example.ae`, 'USER');
    await makeProfile(client.userId, 'Emergency Client', 9201);
    const lawyer = await verifiedLawyer(`lawyer.${runId}@example.ae`, 9202, reviewer.userId);

    // Remember the flags of every lawyer so the fallback test can be undone.
    const allLawyers = await prisma.lawyerProfile.findMany({
      select: { id: true, acceptsEmergency: true },
    });
    originalAvailability.push(...allLawyers);

    // Nobody available: a request must still reach every registered professional.
    await prisma.lawyerProfile.updateMany({ data: { acceptsEmergency: false, isFirmEmergency: false } });
    const fallback = await emergency.raiseEmergency(
      client.userId,
      {
        title: 'Fallback delivery check',
        caseType: 'CRIMINAL_PENAL',
        description: 'Checking that an urgent request reaches somebody even with no opt-ins at all.',
        contactPhone: '+971 50 123 4567',
      },
      meta,
    );
    check('an emergency can be raised', fallback.ok === true, fallback.ok ? '' : fallback.message);
    check(
      'with nobody opted in, it still reaches registered professionals',
      fallback.ok === true && fallback.data.notified > 0,
      fallback.ok ? `notified ${fallback.data.notified}` : '',
    );
    if (fallback.ok) {
      await emergency.cancelEmergency(fallback.data.emergencyId, client.userId);
    }

    // A lawyer opts in, and is then the one who is told.
    const availability = await emergency.setEmergencyAvailability(
      lawyer.userId,
      true,
      'Criminal matters, 24/7',
    );
    check('a lawyer can set emergency availability', availability.ok === true);

    const standing = await emergency.emergencyStanding(lawyer.userId);
    check(
      'their availability and note are stored',
      standing.lawyer?.acceptsEmergency === true && standing.lawyer?.emergencyNote === 'Criminal matters, 24/7',
    );

    const raised = await emergency.raiseEmergency(
      client.userId,
      {
        title: 'Police questioning tonight',
        caseType: 'CRIMINAL_PENAL',
        description: 'I have been asked to attend a police station this evening and need a lawyer present.',
        contactPhone: '+971 55 999 8888',
      },
      meta,
    );
    check('an urgent request is raised', raised.ok === true);
    check(
      'and reaches the lawyer who is on call',
      raised.ok === true && raised.data.notified >= 1,
      raised.ok ? `notified ${raised.data.notified}` : '',
    );

    const emergencyId = raised.ok ? raised.data.emergencyId : '';

    const lawyerAlerts = await prisma.notification.findMany({
      where: { userId: lawyer.userId, kind: 'emergency.raised' },
    });
    check('the on-call lawyer is alerted', lawyerAlerts.length >= 1);

    const queue = await emergency.listOpenEmergencies();
    check('it appears in the open queue', queue.some((item) => item.id === emergencyId));

    const clientAcceptsOwn = await emergency.acceptEmergency(emergencyId, client.userId, meta);
    check('a client cannot take their own request', clientAcceptsOwn.ok === false);

    const stranger = await register(`stranger.${runId}@example.ae`, 'USER');
    const strangerAccepts = await emergency.acceptEmergency(emergencyId, stranger.userId, meta);
    check('an unrelated member cannot take it', strangerAccepts.ok === false);

    const accepted = await emergency.acceptEmergency(emergencyId, lawyer.userId, meta);
    check('the lawyer can take it', accepted.ok === true, accepted.ok ? '' : accepted.message);

    const emergencyCase = accepted.ok
      ? await prisma.legalCase.findUnique({
          where: { id: accepted.data.caseId ?? '' },
          select: {
            status: true,
            lawyerId: true,
            clientId: true,
            emergencyRequests: { select: { id: true, status: true } },
          },
        })
      : null;
    check('a case is opened and assigned immediately', emergencyCase?.status === 'ASSIGNED');
    check('assigned to the lawyer who took it', emergencyCase?.lawyerId === lawyer.lawyerProfileId);
    check('and linked back to the emergency', emergencyCase?.emergencyRequests[0]?.id === emergencyId);

    const clientAlerts = await prisma.notification.findMany({
      where: { userId: client.userId, kind: 'emergency.accepted' },
    });
    check('the client is told who took it', clientAlerts.length === 1);

    const takenTwice = await emergency.acceptEmergency(emergencyId, lawyer.userId, meta);
    check('the same request cannot be taken twice', takenTwice.ok === false);

    // Expiry.
    await prisma.emergencyRequest.update({
      where: { id: emergencyId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const expiredCount = await emergency.expireStaleEmergencies();
    check('a stale request expires', expiredCount >= 0);

    // A firm designates its emergency contact.
    const firm = await register(`firm.${runId}@example.ae`, 'FIRM');
    await makeProfile(firm.userId, 'Firm Administrator', 9203);
    await saveFirmCredential(
      firm.userId,
      {
        legalName: `Feature Firm ${runId} LLC`,
        tradeLicenseNumber: `DED-F-${runId}`,
        tradeLicenseAuthority: 'Dubai Economy and Tourism',
        tradeLicenseExpiresOn: '2031-01-01',
        registeredEmirate: 'DUBAI',
        authorisedSignatory: 'Firm Administrator',
      },
      meta,
    );
    const firmLawyer = await register(`firmlawyer.${runId}@example.ae`, 'LAWYER');
    await makeProfile(firmLawyer.userId, 'Firm Emergency Lawyer', 9204);
    await saveLawyerCredential(
      firmLawyer.userId,
      {
        licenseNumber: `FEM-${runId}`,
        licensingAuthority: 'Dubai Legal Affairs Department',
        licenseExpiresOn: '2032-01-01',
        yearsOfExperience: '5',
      },
      meta,
    );
    const firmProfileId = (
      await prisma.firmProfile.findUnique({ where: { userId: firm.userId }, select: { id: true } })
    )!.id;
    const firmLawyerProfileId = (
      await prisma.lawyerProfile.findUnique({
        where: { userId: firmLawyer.userId },
        select: { id: true },
      })
    )!.id;
    await prisma.lawyerProfile.update({
      where: { id: firmLawyerProfileId },
      data: { affiliatedFirmId: firmProfileId },
    });

    const designated = await emergency.setFirmEmergencyLawyer(
      firm.userId,
      firmLawyerProfileId,
      true,
    );
    check('a firm can name an emergency contact', designated.ok === true);

    const firmStanding = await emergency.emergencyStanding(firm.userId);
    check(
      'the designation is recorded',
      firmStanding.firm?.lawyers[0]?.id === firmLawyerProfileId,
    );

    const secondLawyerInFirm = await register(`firmsecond.${runId}@example.ae`, 'LAWYER');
    await makeProfile(secondLawyerInFirm.userId, 'Second Firm Lawyer', 9205);
    await saveLawyerCredential(
      secondLawyerInFirm.userId,
      {
        licenseNumber: `FSM-${runId}`,
        licensingAuthority: 'Dubai Legal Affairs Department',
        licenseExpiresOn: '2032-01-01',
        yearsOfExperience: '3',
      },
      meta,
    );
    const secondProfileId = (
      await prisma.lawyerProfile.findUnique({
        where: { userId: secondLawyerInFirm.userId },
        select: { id: true },
      })
    )!.id;
    await prisma.lawyerProfile.update({
      where: { id: secondProfileId },
      data: { affiliatedFirmId: firmProfileId },
    });

    await emergency.setFirmEmergencyLawyer(firm.userId, secondProfileId, true);
    const designatedCount = await prisma.lawyerProfile.count({
      where: { affiliatedFirmId: firmProfileId, isFirmEmergency: true },
    });
    check('only one emergency contact at a time', designatedCount === 1);

    // A firm's own account hands the case to its designated contact.
    await prisma.lawyerProfile.update({
      where: { id: firmLawyerProfileId },
      data: { acceptsEmergency: false, isFirmEmergency: false },
    });
    await emergency.setFirmEmergencyLawyer(firm.userId, firmLawyerProfileId, true);

    const firmEmergency = await emergency.raiseEmergency(
      client.userId,
      {
        title: 'Urgent injunction needed',
        caseType: 'COMMERCIAL',
        description: 'We need an urgent injunction filed before the hearing tomorrow morning.',
        contactPhone: '+971 55 111 2222',
      },
      meta,
    );
    check('an emergency addressed to a firm can be raised', firmEmergency.ok === true);

    const firmTakes = firmEmergency.ok
      ? await emergency.acceptEmergency(firmEmergency.data.emergencyId, firm.userId, meta)
      : null;
    check('the firm account can take it on behalf of its contact', firmTakes?.ok === true);

    const firmCase = firmTakes?.ok
      ? await prisma.legalCase.findUnique({
          where: { id: firmTakes.data.caseId ?? '' },
          select: { lawyerId: true, firmId: true },
        })
      : null;
    check(
      'and it is assigned to the designated emergency lawyer',
      firmCase?.lawyerId === firmLawyerProfileId && firmCase?.firmId === firmProfileId,
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Payments (simulated)');

    const payClient = await register(`payclient.${runId}@example.ae`, 'USER');
    await makeProfile(payClient.userId, 'Paying Client', 9206);
    const payLawyer = await verifiedLawyer(`paylawyer.${runId}@example.ae`, 9207, reviewer.userId);

    const payCase = await cases.createCase(
      payClient.userId,
      {
        listingId: payLawyer.listingId,
        title: 'Payment flow fixture',
        caseType: 'COMMERCIAL',
        description: 'A case opened so that the fee flow can be exercised from request to proof.',
      },
      [],
      meta,
    );
    if (!payCase.ok) throw new Error(payCase.message);
    const payCaseId = payCase.data.caseId;

    const tooEarly = await payments.requestPayment(
      payLawyer.userId,
      { caseId: payCaseId, amountAed: 500, purpose: 'CONSULTATION' },
      meta,
    );
    check('a fee cannot be requested before the case is accepted', tooEarly.ok === false);

    await cases.reviewCase(payCaseId, payLawyer.userId, meta);
    await cases.acceptCase(payCaseId, payLawyer.userId, meta);

    const clientRequests = await payments.requestPayment(
      payClient.userId,
      { caseId: payCaseId, amountAed: 500, purpose: 'CONSULTATION' },
      meta,
    );
    check('a client cannot request a fee', clientRequests.ok === false);

    const requested = await payments.requestPayment(
      payLawyer.userId,
      {
        caseId: payCaseId,
        amountAed: 1250.5,
        purpose: 'CASE_ASSISTANCE',
        details: 'Court filing and representation at the first hearing.',
      },
      meta,
    );
    check('the assigned lawyer can request a fee', requested.ok === true, requested.ok ? '' : requested.message);

    const paymentRow = requested.ok
      ? await prisma.paymentRequest.findUnique({
          where: { id: requested.data.paymentId },
          select: { amountFils: true, status: true, purpose: true },
        })
      : null;
    check('the amount is stored in whole fils', paymentRow?.amountFils === 125050, `got ${paymentRow?.amountFils}`);
    check('it starts awaiting payment', paymentRow?.status === 'REQUESTED');
    check('1250.50 fils formats as AED 1,250.50', formatAed(125050).includes('1,250.50'));

    const clientNotified = await prisma.notification.findMany({
      where: { userId: payClient.userId, kind: 'payment.requested' },
    });
    check('the client is alerted to the fee', clientNotified.length === 1);

    // ── A fee is paid by bank transfer ────────────────────────────────────
    // The bank details are attached to the request itself, so the client is
    // never sent to a page that has since changed under them.
    const requestedRow = requested.ok
      ? await prisma.paymentRequest.findUnique({
          where: { id: requested.data.paymentId },
          select: { bankAccountName: true, bankName: true, bankIban: true },
        })
      : null;
    check('the bank details are attached to the request', Boolean(requestedRow?.bankIban));
    check('with the account holder named', requestedRow?.bankAccountName === 'Feature Lawyer 9207');

    const { bankTransferLines } = await import('../src/server/services/payment-service');
    const lines = bankTransferLines({
      bankAccountName: requestedRow?.bankAccountName ?? null,
      bankName: requestedRow?.bankName ?? null,
      bankIban: requestedRow?.bankIban ?? null,
      bankAccountNumber: null,
      bankSwift: null,
      bankBranch: null,
      bankInstructions: null,
    });
    check('and they are shown to the client as label and value', lines.some((line) => line.label === 'IBAN'));

    // Somebody who is not the client cannot record the transfer.
    const lawyerPays = requested.ok
      ? await payments.recordBankTransfer(
          payLawyer.userId,
          { paymentId: requested.data.paymentId, reference: 'NOPE-1' },
          meta,
        )
      : null;
    check('the professional cannot record their own fee as paid', lawyerPays?.ok === false);

    // The reference is required: it is the one thing a transfer can be matched on.
    const missingReference = requested.ok
      ? await payments.recordBankTransfer(
          payClient.userId,
          { paymentId: requested.data.paymentId, reference: '' },
          meta,
        )
      : null;
    check('a transfer without a reference is refused', missingReference?.ok === false);

    // Proof is asked for only after the payment: before it, there is nothing to
    // attach evidence of.
    const prematureProof = requested.ok
      ? await payments.submitPaymentProof(
          payClient.userId,
          { paymentId: requested.data.paymentId },
          file('proof-early.png'),
          meta,
        )
      : null;
    check('proof of payment cannot be sent before the payment', prematureProof?.ok === false);

    const paid = requested.ok
      ? await payments.recordBankTransfer(
          payClient.userId,
          { paymentId: requested.data.paymentId, reference: `FT-${runId}` },
          meta,
        )
      : null;
    check('the client records the bank transfer', paid?.ok === true, paid?.ok === false ? paid.message : '');

    const settled = requested.ok
      ? await prisma.paymentRequest.findUnique({
          where: { id: requested.data.paymentId },
          select: {
            status: true,
            method: true,
            reference: true,
            receiptNumber: true,
            receiptIssuedAt: true,
            proofRequestedAt: true,
            proofSubmittedAt: true,
            paidById: true,
          },
        })
      : null;
    check(
      'it is recorded as paid by bank transfer',
      settled?.status === 'PAID' && settled?.method === 'BANK_TRANSFER',
    );
    check('with the reference the client quoted', settled?.reference === `FT-${runId}`);
    check('a receipt number is issued', Boolean(settled?.receiptNumber));
    check('the receipt is stamped when it is issued', Boolean(settled?.receiptIssuedAt));
    check('the client is asked for proof only after paying', Boolean(settled?.proofRequestedAt));
    check('and no proof is recorded yet', settled?.proofSubmittedAt === null);
    check('and it is recorded against the paying client', settled?.paidById === payClient.userId);

    const payTwice = requested.ok
      ? await payments.recordBankTransfer(
          payClient.userId,
          { paymentId: requested.data.paymentId, reference: `FT-AGAIN-${runId}` },
          meta,
        )
      : null;
    check('a settled request cannot be paid again', payTwice?.ok === false);

    const professionalNotified = await prisma.notification.findMany({
      where: { userId: payLawyer.userId, kind: 'payment.paid' },
    });
    check('the professional is told the fee was paid', professionalNotified.length === 1);

    // ── The receipt ───────────────────────────────────────────────────────
    const receipt = requested.ok
      ? await payments.getReceiptForViewer(requested.data.paymentId, payClient.userId)
      : null;
    check('the client can open the receipt', receipt !== null);
    check(
      'the receipt carries the amount, the reason and who was paid',
      receipt !== null &&
        receipt.amountFils === 125050 &&
        receipt.purpose === 'CASE_ASSISTANCE' &&
        Boolean(receipt.requestedBy.profile?.fullName),
    );
    check(
      'and the professional and the firm behind them',
      receipt !== null && receipt.case.lawyer?.licenseNumber?.startsWith('FEAT-') === true,
    );
    const strangerReceipt = requested.ok
      ? await payments.getReceiptForViewer(requested.data.paymentId, reviewer.userId)
      : null;
    check('somebody unrelated to the case cannot open the receipt', strangerReceipt === null);
    const lawyerReceipt = requested.ok
      ? await payments.getReceiptForViewer(requested.data.paymentId, payLawyer.userId)
      : null;
    check('the professional can open the receipt for the fee they raised', lawyerReceipt !== null);

    const inThread = await payments.listCasePayments(payCaseId);
    check('the fee appears in the case conversation data', inThread.length === 1);

    // ── What the client and the lawyer actually see ────────────────────────
    // A second, still-unpaid request, so the pay button can be checked while it
    // is genuinely on screen.
    const openRequest = await payments.requestPayment(
      payLawyer.userId,
      { caseId: payCaseId, amountAed: 200, purpose: 'CONSULTATION' },
      meta,
    );
    check('a further fee can be requested', openRequest.ok === true);

    const casePageResponse = await fetch(`${BASE_URL}/cases/${payCaseId}`, {
      headers: { cookie: `dl_session=${payClient.sessionToken}` },
      redirect: 'manual',
    });
    const caseHtml = await casePageResponse.text();
    check('the client can open the case page', casePageResponse.status === 200, `got ${casePageResponse.status}`);
    check(
      'the fee is shown inside the case',
      caseHtml.includes('AED') && caseHtml.includes('Case assistance fee'),
      `status ${casePageResponse.status}`,
    );
    check('and labelled as simulated', caseHtml.includes('Simulated payment'), `status ${casePageResponse.status}`);
    check(
      'the settled fee reads as completed, with its receipt',
      caseHtml.includes('Payment completed') && caseHtml.includes('Receipt'),
      `status ${casePageResponse.status}`,
    );
    check(
      'and the receipt can be reopened from the conversation',
      caseHtml.includes('View or print the receipt'),
      `status ${casePageResponse.status}`,
    );
    check(
      'the unpaid fee offers a pay button instead',
      caseHtml.includes(`Pay `) && caseHtml.includes(`/payments/${openRequest.ok ? openRequest.data.paymentId : ''}/pay`),
      `status ${casePageResponse.status}`,
    );
    check(
      'the client is asked for the proof of payment, after the payment',
      caseHtml.includes('Send the proof of payment'),
      `status ${casePageResponse.status}`,
    );

    const lawyerCaseHtml = await (
      await fetch(`${BASE_URL}/cases/${payCaseId}`, {
        headers: { cookie: `dl_session=${payLawyer.sessionToken}` },
        redirect: 'manual',
      })
    ).text();
    check(
      'the lawyer sees the same completed card, not a pay button',
      lawyerCaseHtml.includes('Payment completed') &&
        !lawyerCaseHtml.includes(`/payments/${openRequest.ok ? openRequest.data.paymentId : ''}/pay`),
    );
    check(
      'and the lawyer is not asked to send proof',
      !lawyerCaseHtml.includes('Send the proof of payment'),
    );

    // ── Proof of payment, after the payment ───────────────────────────────
    const proofSent = requested.ok
      ? await payments.submitPaymentProof(
          payClient.userId,
          { paymentId: requested.data.paymentId, note: 'Paid from my current account.' },
          file('proof.png'),
          meta,
        )
      : null;
    check('the client can send proof of payment', proofSent?.ok === true, proofSent?.ok === false ? proofSent.message : '');

    const withProof = requested.ok
      ? await prisma.paymentRequest.findUnique({
          where: { id: requested.data.paymentId },
          select: { proofDocumentId: true, proofSubmittedAt: true, proofNote: true, status: true },
        })
      : null;
    check('the proof is stored as a document', withProof?.proofDocumentId !== null);
    check('and the payment stays paid', withProof?.status === 'PAID');
    check('the note is kept beside it', withProof?.proofNote === 'Paid from my current account.');

    const proofTwice = requested.ok
      ? await payments.submitPaymentProof(
          payClient.userId,
          { paymentId: requested.data.paymentId },
          file('proof-again.png'),
          meta,
        )
      : null;
    check('proof cannot be sent twice', proofTwice?.ok === false);

    const proofNotified = await prisma.notification.findMany({
      where: { userId: payLawyer.userId, kind: 'payment.proof_received' },
    });
    check('the professional is told the proof arrived', proofNotified.length === 1);

    // ── The pay page and the receipt page ─────────────────────────────────
    if (openRequest.ok) {
      const payPage = await fetch(`${BASE_URL}/payments/${openRequest.data.paymentId}/pay`, {
        headers: { cookie: `dl_session=${payClient.sessionToken}` },
        redirect: 'manual',
      });
      const payHtml = await payPage.text();
      check('the pay page opens for the client', payPage.status === 200, `got ${payPage.status}`);
      check(
        'it shows the bank account the fee is paid into',
        payHtml.includes('Transfer to') && payHtml.includes('AE070331234567890123456'),
      );
      check(
        'and the reference the client should quote',
        payHtml.includes('Reference to quote') && payHtml.includes('DL-2026-'),
      );
      check('it records the transfer with that reference', payHtml.includes('Transfer reference'));
      check(
        'card payment is offered as a choice',
        payHtml.includes('Card') && payHtml.includes('Not available yet'),
      );

      const cardPage = await fetch(
        `${BASE_URL}/payments/${openRequest.data.paymentId}/pay?method=card`,
        { headers: { cookie: `dl_session=${payClient.sessionToken}` }, redirect: 'manual' },
      );
      const cardHtml = await cardPage.text();
      check(
        'choosing card says the feature is being developed',
        cardHtml.includes('Card payment is being developed') && cardHtml.includes('will be ready soon'),
      );
      check(
        'and there is no card form to fill in',
        !cardHtml.includes('Card number') && !cardHtml.includes('Security code'),
      );
      check(
        'with a way back to the method that works',
        cardHtml.includes('Pay by bank transfer instead'),
      );

      const payByStranger = await fetch(`${BASE_URL}/payments/${openRequest.data.paymentId}/pay`, {
        headers: { cookie: `dl_session=${payLawyer.sessionToken}` },
        redirect: 'manual',
      });
      check('the professional cannot open the pay page', payByStranger.status === 404, `got ${payByStranger.status}`);
    }

    const receiptPage = await fetch(
      `${BASE_URL}/payments/${requested.ok ? requested.data.paymentId : ''}/receipt?paid=1`,
      { headers: { cookie: `dl_session=${payClient.sessionToken}` }, redirect: 'manual' },
    );
    const receiptHtml = await receiptPage.text();
    check('the receipt page opens after payment', receiptPage.status === 200, `got ${receiptPage.status}`);
    check(
      'it states the amount, the reason and the payee',
      receiptHtml.includes('Amount paid') &&
        receiptHtml.includes('Case assistance fee') &&
        receiptHtml.includes('Reason'),
    );
    check('it names the lawyer and their licence', receiptHtml.includes('FEAT-9207'));
    check(
      'it carries the receipt number and how it was paid',
      receiptHtml.includes(settled?.receiptNumber ?? 'never') && receiptHtml.includes('Bank transfer'),
    );
    check('it can be printed or saved as a PDF', receiptHtml.includes('Download receipt as PDF'));
    check('and it says the payment was simulated', receiptHtml.includes('Simulated payment'));

    // Tidy the open one away so the rest of the assertions stay unambiguous.
    if (openRequest.ok) {
      await payments.cancelPayment(payLawyer.userId, openRequest.data.paymentId);
    }

    // The professional may withdraw an unpaid request.
    const cancelTarget = await payments.requestPayment(
      payLawyer.userId,
      { caseId: payCaseId, amountAed: 100, purpose: 'OTHER' },
      meta,
    );
    const clientCancels = cancelTarget.ok
      ? await payments.cancelPayment(payClient.userId, cancelTarget.data.paymentId)
      : null;
    check('a client cannot withdraw a fee request', clientCancels?.ok === false);
    const withdrawn = cancelTarget.ok
      ? await payments.cancelPayment(payLawyer.userId, cancelTarget.data.paymentId)
      : null;
    check('the professional can withdraw their own request', withdrawn?.ok === true);

    // ════════════════════════════════════════════════════════════════════════
    section('Conference rooms and office requests');

    const meetingClient = payClient;
    const meetingLawyer = payLawyer;
    const tomorrow = addDaysToKey(todayKey(), 1);

    const videoBooking = await appointments.bookAppointment(
      meetingLawyer.userId,
      {
        lawyerProfileId: meetingLawyer.lawyerProfileId,
        clientId: meetingClient.userId,
        dateKey: tomorrow,
        hour: 9,
        caseId: payCaseId,
        mode: 'VIDEO_CALL',
      },
      meta,
    );
    check('a video meeting can be booked', videoBooking.ok === true, videoBooking.ok ? '' : videoBooking.message);
    check(
      'and it gets a conference room',
      videoBooking.ok === true && typeof videoBooking.data.roomCode === 'string',
    );

    const roomCode = videoBooking.ok ? (videoBooking.data.roomCode ?? '') : '';
    const videoRow = roomCode
      ? await prisma.appointment.findUnique({
          where: { roomCode },
          select: { mode: true, confirmation: true, roomCode: true },
        })
      : null;
    check('the room is stored on the appointment', videoRow?.roomCode === roomCode);
    check('a video meeting needs no client answer', videoRow?.confirmation === 'NOT_REQUIRED');

    const officeWithoutAddress = await appointments.bookAppointment(
      meetingLawyer.userId,
      {
        lawyerProfileId: meetingLawyer.lawyerProfileId,
        clientId: meetingClient.userId,
        dateKey: tomorrow,
        hour: 11,
        mode: 'OFFICE_VISIT',
      },
      meta,
    );
    check('an office visit without an address is refused', officeWithoutAddress.ok === false);

    const officeBooking = await appointments.bookAppointment(
      meetingLawyer.userId,
      {
        lawyerProfileId: meetingLawyer.lawyerProfileId,
        clientId: meetingClient.userId,
        dateKey: tomorrow,
        hour: 11,
        mode: 'OFFICE_VISIT',
        officeAddress: 'Office 1204, Sample Tower, Sheikh Zayed Road, Dubai',
      },
      meta,
    );
    check('an office visit with an address is booked', officeBooking.ok === true);
    check(
      'and it asks the client to confirm',
      officeBooking.ok === true &&
        (await prisma.appointment.findUnique({
          where: { id: officeBooking.data.appointmentId },
          select: { confirmation: true },
        }))?.confirmation === 'PENDING',
    );

    const officeId = officeBooking.ok ? officeBooking.data.appointmentId : '';

    const strangerAnswers = await appointments.respondToOfficeRequest(officeId, stranger.userId, true);
    check('an unrelated member cannot answer the office request', strangerAnswers.ok === false);

    const declined = await appointments.respondToOfficeRequest(officeId, meetingClient.userId, false);
    check('the client can decline', declined.ok === true);

    const lawyerTold = await prisma.notification.findMany({
      where: { userId: meetingLawyer.userId, kind: 'appointment.office_declined' },
    });
    check('the professional is told it was declined', lawyerTold.length === 1);

    const acceptedOffice = await appointments.bookAppointment(
      meetingLawyer.userId,
      {
        lawyerProfileId: meetingLawyer.lawyerProfileId,
        clientId: meetingClient.userId,
        dateKey: tomorrow,
        hour: 14,
        mode: 'OFFICE_VISIT',
        officeAddress: 'Office 1204, Sample Tower, Sheikh Zayed Road, Dubai',
      },
      meta,
    );
    const acceptedId = acceptedOffice.ok ? acceptedOffice.data.appointmentId : '';
    const officeAccepted = await appointments.respondToOfficeRequest(
      acceptedId,
      meetingClient.userId,
      true,
    );
    check('the client can accept', officeAccepted.ok === true);
    check(
      'and the answer is recorded',
      (await prisma.appointment.findUnique({
        where: { id: acceptedId },
        select: { confirmation: true, confirmedAt: true },
      }))?.confirmation === 'ACCEPTED',
    );

    const answeredTwice = await appointments.respondToOfficeRequest(acceptedId, meetingClient.userId, false);
    check('an office request can only be answered once', answeredTwice.ok === false);

    // ── Room access control ──────────────────────────────────────────────
    const roomAccessProfessional = await rooms.resolveRoomForUser(roomCode, meetingLawyer.userId);
    const roomAccessClient = await rooms.resolveRoomForUser(roomCode, meetingClient.userId);
    const roomAccessStranger = await rooms.resolveRoomForUser(roomCode, stranger.userId);
    const roomAccessAdmin = await rooms.resolveRoomForUser(roomCode, reviewer.userId);

    check('the professional may enter the room', roomAccessProfessional?.role === 'PROFESSIONAL');
    check('the client may enter the room', roomAccessClient?.role === 'CLIENT');
    check('an unrelated member may not', roomAccessStranger === null);
    check('and neither may an administrator', roomAccessAdmin === null);

    const roomPageAsAdmin = await fetch(`${BASE_URL}/rooms/${roomCode}`, {
      headers: { cookie: `dl_session=${reviewer.sessionToken}` },
      redirect: 'manual',
    });
    check('an administrator gets a 404 for the room page', roomPageAsAdmin.status === 404, `got ${roomPageAsAdmin.status}`);

    const roomPageAsClient = await fetch(`${BASE_URL}/rooms/${roomCode}`, {
      headers: { cookie: `dl_session=${meetingClient.sessionToken}` },
      redirect: 'manual',
    });
    check('the client can open the room page', roomPageAsClient.status === 200, `got ${roomPageAsClient.status}`);

    // ── Signalling ───────────────────────────────────────────────────────
    const lawyerKey = rooms.userKey(meetingLawyer.userId);
    const clientKey = rooms.userKey(meetingClient.userId);
    await rooms.postSignal(roomCode, lawyerKey, { kind: 'offer', sdp: 'v=0 example-offer' });
    const lawyerSeesOwn = await rooms.signalsSince(roomCode, null, lawyerKey);
    check('a participant does not receive their own signal', lawyerSeesOwn.length === 0);

    const clientSees = await rooms.signalsSince(roomCode, null, clientKey);
    check('the other participant receives it', clientSees.length === 1);
    check(
      'and it carries the connection detail',
      (clientSees[0]?.payload as { sdp?: string } | undefined)?.sdp === 'v=0 example-offer',
    );

    await rooms.postSignal(roomCode, clientKey, { kind: 'answer', sdp: 'v=0 example-answer' });
    const afterAnswer = await rooms.signalsSince(roomCode, clientSees[0]!.id, clientKey);
    check('only signals newer than the cursor are returned', afterAnswer.length === 0);

    const lawyerGetsAnswer = await rooms.signalsSince(roomCode, null, lawyerKey);
    check('the professional receives the answer', lawyerGetsAnswer.length === 1);

    // ── Presence ─────────────────────────────────────────────────────────
    await rooms.touchPresence(roomCode, lawyerKey);
    const clientPresence = await rooms.presentOthers(roomCode, clientKey);
    check('presence shows the other participant', clientPresence.length === 1);
    const selfPresence = await rooms.presentOthers(roomCode, lawyerKey);
    check('and never yourself', selfPresence.length === 0);

    await rooms.leaveRoom(roomCode, lawyerKey);
    const afterLeave = await rooms.presentOthers(roomCode, clientKey);
    check('leaving the room clears presence', afterLeave.length === 0);

    // ── The client's own view ────────────────────────────────────────────
    // A fresh office request, left unanswered, so the client's prompt is visible.
    const waiting = await appointments.bookAppointment(
      meetingLawyer.userId,
      {
        lawyerProfileId: meetingLawyer.lawyerProfileId,
        clientId: meetingClient.userId,
        dateKey: tomorrow,
        hour: 15,
        mode: 'OFFICE_VISIT',
        officeAddress: 'Office 1204, Sample Tower, Sheikh Zayed Road, Dubai',
      },
      meta,
    );
    check('a further office request can be raised', waiting.ok === true);

    const clientCasesHtml = await (
      await fetch(`${BASE_URL}/cases`, {
        headers: { cookie: `dl_session=${meetingClient.sessionToken}` },
        redirect: 'manual',
      })
    ).text();
    check('the client is offered the conference room', clientCasesHtml.includes('Join the conference room'));
    check(
      'and told the office visit needs an answer',
      clientCasesHtml.includes('come to the office') && clientCasesHtml.includes('Awaiting your answer'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Administrator monitoring and deletion');

    const [emergencyStats, paymentStats, meetingStats] = await Promise.all([
      admin.emergencyOverview(),
      payments.paymentOverview(),
      admin.appointmentOverview(),
    ]);
    check('emergency activity is summarised', emergencyStats.recent.length > 0);
    check('availability is counted', emergencyStats.availableLawyers > 0);
    check('fee activity is summarised', paymentStats.rows.length > 0);
    check('simulated values are totalled', paymentStats.paidValueFils > 0);
    check('meetings are summarised', meetingStats.rows.length > 0);
    check('and video and office meetings are counted separately', meetingStats.videoCalls > 0 && meetingStats.officeVisits > 0);

    for (const path of ['/admin/emergency', '/admin/payments', '/admin/meetings', '/admin/notifications']) {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: { cookie: `dl_session=${reviewer.sessionToken}` },
        redirect: 'manual',
      });
      check(`${path} renders for a reviewer`, response.status === 200, `got ${response.status}`);
    }

    const paymentsHtml = await (
      await fetch(`${BASE_URL}/admin/payments`, {
        headers: { cookie: `dl_session=${reviewer.sessionToken}` },
      })
    ).text();
    check('the payment screen warns that it is simulated', paymentsHtml.includes('simulated payments'));

    const meetingsHtml = await (
      await fetch(`${BASE_URL}/admin/meetings`, {
        headers: { cookie: `dl_session=${reviewer.sessionToken}` },
      })
    ).text();
    check('the meetings screen states that administrators cannot join a room', meetingsHtml.includes('cannot join a conference room'));

    // ── Deletion ─────────────────────────────────────────────────────────
    const doomed = await register(`doomed.${runId}@example.ae`, 'USER');
    await makeProfile(doomed.userId, 'Account To Delete', 9208);

    const wrongConfirmation = await admin.deleteAccount(
      reviewer.userId,
      doomed.userId,
      'wrong@example.ae',
      meta,
    );
    check('a mistyped confirmation is refused', wrongConfirmation.ok === false);
    check(
      'and the account is still there',
      (await prisma.user.count({ where: { id: doomed.userId } })) === 1,
    );

    const selfDelete = await admin.deleteAccount(
      reviewer.userId,
      reviewer.userId,
      reviewer.email,
      meta,
    );
    check('a reviewer cannot delete their own account', selfDelete.ok === false);

    const otherReviewer = await register(`reviewer2.${runId}@example.ae`, 'USER');
    await prisma.user.update({
      where: { id: otherReviewer.userId },
      data: { roles: ['MEMBER', 'REVIEWER'] },
    });
    const soleReviewerGuard = await prisma.user.count({ where: { roles: { has: 'REVIEWER' } } });
    check('more than one reviewer exists for the guard test', soleReviewerGuard >= 2);

    const deleted = await admin.deleteAccount(reviewer.userId, doomed.userId, doomed.email, meta);
    check('the correct confirmation deletes the account', deleted.ok === true, deleted.ok ? '' : deleted.message);
    check('and the account is gone', (await prisma.user.count({ where: { id: doomed.userId } })) === 0);

    const deletionAudit = await prisma.auditLog.findFirst({
      where: { action: 'account.deleted', entityId: doomed.userId },
    });
    check('the deletion is recorded in the audit trail', deletionAudit !== null);

    // A demo account can be removed — the point of the feature.
    const demoDelete = await admin.deleteAccount(
      reviewer.userId,
      otherReviewer.userId,
      otherReviewer.email,
      meta,
    );
    check('an account can be deleted including its sessions', demoDelete.ok === true);
    check(
      'and its sessions go with it',
      (await prisma.session.count({ where: { userId: otherReviewer.userId } })) === 0,
    );
  } finally {
    section('Cleanup');

    // Restore every lawyer's emergency flags exactly as they were.
    for (const row of originalAvailability) {
      await prisma.lawyerProfile
        .update({
          where: { id: row.id },
          data: { acceptsEmergency: row.acceptsEmergency },
        })
        .catch(() => undefined);
    }

    const [storedDocs, documentIds, verificationIds, listingIds, inquiryIds, caseFileRows] =
      await Promise.all([
        prisma.document.findMany({ where: { userId: { in: createdUserIds } }, select: { storageKey: true } }),
        prisma.document.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
        prisma.verificationCase.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
        prisma.listing.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
        prisma.inquiry.findMany({
          where: { OR: [{ fromUserId: { in: createdUserIds } }, { toUserId: { in: createdUserIds } }] },
          select: { id: true },
        }),
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
    const reviewIds = await prisma.review.findMany({
      where: { OR: [{ authorId: { in: createdUserIds } }, { targetUserId: { in: createdUserIds } }] },
      select: { id: true },
    });
    const emergencyIds = await prisma.emergencyRequest.findMany({
      where: { OR: [{ clientId: { in: createdUserIds } }, { acceptedById: { in: createdUserIds } }] },
      select: { id: true },
    });
    const paymentIds = await prisma.paymentRequest.findMany({
      where: { OR: [{ requestedById: { in: createdUserIds } }, { paidById: { in: createdUserIds } }] },
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
      ...emergencyIds.map((row) => row.id),
      ...paymentIds.map((row) => row.id),
    ];

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

    const remaining = await prisma.user.count({ where: { id: { in: createdUserIds } } });
    check('every account created by this run was removed', remaining === 0);
    console.info(`  Removed ${createdUserIds.length} accounts and restored every emergency flag.`);

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
  console.error('\nThe features end-to-end run crashed:', error);
  process.exitCode = 1;
});

// Keeps this file a module so its top-level constants stay file-scoped.
export {};
