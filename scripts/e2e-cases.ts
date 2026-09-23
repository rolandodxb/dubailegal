/**
 * End-to-end verification of the case workflow, the practice dashboard and the
 * firm roster, against the real database and the running server.
 *
 *   npm run e2e:cases
 *
 * Everything runs through the same services and HTTP routes the application
 * uses. Every account it creates is removed at the end.
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
  const firmService = await import('../src/server/services/firm-service');
  const { listNotifications } = await import('../src/server/services/notification-service');

  const meta = { ip: '203.0.113.20', userAgent: 'dubai-legal-e2e-cases' };
  const createdUserIds: string[] = [];

  function idFor(sequence: number): string {
    const body = `7841985${String(sequence).padStart(7, '0')}`;
    const check = computeCheckDigit(`${body}0`);
    if (check === null) throw new Error('check digit');
    return `${body}${check}`;
  }

  function file(name: string): File {
    return new File([new Uint8Array(PNG_BYTES)], name, { type: 'image/png' });
  }

  async function register(email: string, accountType: 'USER' | 'LAWYER' | 'FIRM', inviteToken?: string) {
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
      { inviteToken: inviteToken ?? null },
    );
    if (!result.ok) throw new Error(`register ${email}: ${result.message}`);
    createdUserIds.push(result.data.userId);
    // The service returns `token`; the HTTP checks below pass it as a cookie.
    return { ...result.data, sessionToken: result.data.token };
  }

  async function makeProfile(userId: string, name: string, sequence: number) {
    const result = await updateProfile(
      userId,
      {
        fullName: name,
        dateOfBirth: '1985-03-03',
        placeOfBirth: 'Dubai',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 111 2222',
        emiratesIdNumber: idFor(sequence),
        emiratesIdExpiry: '2032-01-01',
        workDescription: 'Test fixture.',
        educationBackground: 'Test fixture.',
      },
      meta,
    );
    if (!result.ok) throw new Error(`profile ${name}: ${result.message}`);
  }

  /** Registers a lawyer and drives them to a verified badge. */
  async function verifiedLawyer(email: string, sequence: number, reviewerId: string) {
    const account = await register(email, 'LAWYER');
    await makeProfile(account.userId, `Lawyer ${sequence}`, sequence);
    await saveLawyerCredential(
      account.userId,
      {
        licenseNumber: `LIC-${sequence}`,
        licensingAuthority: 'Legal Dash Affairs Department',
        licenseExpiresOn: '2030-01-01',
        yearsOfExperience: '8',
      },
      meta,
    );
    await uploadDocument(account.userId, { kind: 'EMIRATES_ID', file: file('id.png') }, meta);
    await uploadDocument(account.userId, { kind: 'LAWYER_LICENSE', file: file('lic.png') }, meta);
    const listing = await saveListing(
      account.userId,
      {
        displayName: `Lawyer ${sequence} Practice`,
        headline: 'Commercial litigation',
        bio: 'Test fixture listing.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI'],
        areas: ['COMMERCIAL'],
        languages: 'Arabic, English',
        yearsOfExperience: '8',
        acceptsNewClients: 'on',
        published: 'on',
      },
      meta,
    );
    if (!listing.ok) throw new Error(`listing: ${listing.message}`);

    const submission = await verification.submitForVerification(account.userId, meta);
    if (!submission.ok) throw new Error(`submit: ${submission.message}`);
    const caseId = submission.data.caseId;
    await verification.claimCase(caseId, reviewerId, meta);
    const docs = await prisma.document.findMany({ where: { caseId }, select: { id: true } });
    for (const doc of docs) {
      await verification.reviewDocument(doc.id, reviewerId, 'APPROVED', 'ok', meta);
    }
    const decision = await verification.decideCase(
      caseId,
      reviewerId,
      { caseId, decision: 'APPROVED', notes: 'Verified test lawyer.' },
      meta,
    );
    if (!decision.ok) throw new Error(`decide: ${decision.message}`);

    const listingRow = await prisma.listing.findUnique({
      where: { userId: account.userId },
      select: { id: true },
    });
    return { ...account, listingId: listingRow?.id ?? '' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  section('Email confirmation is off until a mail provider exists');

  const early = await register(`off.${runId}@example.ae`, 'USER');
  const earlyRow = await prisma.user.findUnique({
    where: { id: early.userId },
    select: { status: true, emailVerifiedAt: true },
  });
  check('a new account is active immediately', earlyRow?.status === 'ACTIVE');
  check('its email is treated as confirmed', earlyRow?.emailVerifiedAt !== null);
  const confirmationEmails = await prisma.emailMessage.count({
    where: { userId: early.userId, purpose: 'EMAIL_VERIFICATION' },
  });
  check('no undeliverable confirmation message is queued', confirmationEmails === 0);

  // The reviewer used to approve fixtures.
  const reviewer = await register(`reviewer.${runId}@example.ae`, 'USER');
  await prisma.user.update({
    where: { id: reviewer.userId },
    data: { roles: ['MEMBER', 'REVIEWER'] },
  });

  section('A client sends a case to a lawyer');

  const client = await register(`client.${runId}@example.ae`, 'USER');
  await makeProfile(client.userId, 'Client One', 7001);
  const lawyer = await verifiedLawyer(`lawyer.${runId}@example.ae`, 7002, reviewer.userId);

  const created = await cases.createCase(
    client.userId,
    {
      listingId: lawyer.listingId,
      title: 'Commercial lease dispute in Deira',
      caseType: 'COMMERCIAL',
      description:
        'The landlord is claiming arrears that were already settled. I need a review of the lease and the receipts before the next hearing.',
    },
    [file('lease.pdf'), file('receipts.png')],
    meta,
  );
  check('the case is created', created.ok === true, created.ok ? '' : created.message);
  const caseId = created.ok ? created.data.caseId : '';
  check(
    'it gets a human-readable reference',
    created.ok === true && /^DL-\d{4}-\d{4}$/.test(created.data.reference),
    created.ok ? created.data.reference : '',
  );

  const caseRow = await prisma.legalCase.findUnique({
    where: { id: caseId },
    select: { status: true, lawyerId: true, clientId: true, _count: { select: { files: true } } },
  });
  check('the client sees it as Submitted', caseRow?.status === 'SUBMITTED');
  check('the attachments were stored', caseRow?._count.files === 2);

  const clientNotifications = await listNotifications(lawyer.userId);
  check(
    'the lawyer is alerted about the new case',
    clientNotifications.some((item) => item.kind === 'case.submitted'),
  );

  const lawyerPending = await cases.listCasesForLawyer(lawyer.userId);
  check('it appears in the lawyer\u2019s pending queue', lawyerPending.pending.some((item) => item.id === caseId));

  section('Access control on a case');

  const stranger = await register(`stranger.${runId}@example.ae`, 'USER');
  const strangerView = await cases.getCaseForViewer(caseId, stranger.userId);
  check('an unrelated member cannot open the case', strangerView === null);

  const clientView = await cases.getCaseForViewer(caseId, client.userId);
  check('the client can open their own case', clientView?.access.role === 'CLIENT');
  check('the client is not allowed to accept it', clientView?.access.canAccept === false);

  const clientAccept = await cases.acceptCase(caseId, client.userId, meta);
  check('a client cannot accept their own case', clientAccept.ok === false);

  const strangerAccept = await cases.acceptCase(caseId, stranger.userId, meta);
  check('a stranger cannot accept it either', strangerAccept.ok === false);

  section('Submitted → Under review → Assigned');

  const review = await cases.reviewCase(caseId, lawyer.userId, meta);
  check('the lawyer can open the case for review', review.ok === true, review.ok ? '' : review.message);
  const afterReview = await prisma.legalCase.findUnique({ where: { id: caseId }, select: { status: true } });
  check('the case is now Under review', afterReview?.status === 'UNDER_REVIEW');

  const clientAlerts = await listNotifications(client.userId);
  check(
    'the client is told it is under review',
    clientAlerts.some((item) => item.kind === 'case.under_review'),
  );

  const accept = await cases.acceptCase(caseId, lawyer.userId, meta);
  check('the lawyer can accept the case', accept.ok === true, accept.ok ? '' : accept.message);
  const afterAccept = await prisma.legalCase.findUnique({
    where: { id: caseId },
    select: { status: true, lawyerId: true, assignedAt: true },
  });
  check('the case is now Assigned', afterAccept?.status === 'ASSIGNED');
  check('it is assigned to the accepting lawyer', afterAccept?.lawyerId !== null && afterAccept?.assignedAt !== null);

  const clientAlerts2 = await listNotifications(client.userId);
  check(
    'the client is told it has been assigned',
    clientAlerts2.some((item) => item.kind === 'case.assigned'),
  );

  section('Chat inside the case');

  const m1 = await cases.postCaseMessage(caseId, client.userId, { body: 'I have attached the receipts.' });
  check('the client can post a message', m1.ok === true);

  const m2 = await cases.postCaseMessage(caseId, lawyer.userId, { body: 'Received. I will review them today.' });
  check('the lawyer can post a message', m2.ok === true);

  const strangerPost = await cases.postCaseMessage(caseId, stranger.userId, { body: 'Let me in.' });
  check('an unrelated member cannot post', strangerPost.ok === false);

  const thread = await cases.listCaseMessages(caseId, client.userId);
  check('both messages are in the thread', thread.messages.length === 2);
  check('and no older page is reported', thread.hasMore === false);
  check(
    'each message names its author',
    thread.messages[0]!.authorId === client.userId &&
      thread.messages[1]!.authorId === lawyer.userId,
  );

  // Reading as the client marks the lawyer's message read — for the client.
  // The lawyer still has the client's message waiting.
  const unreadForClient = await cases.unreadCaseMessageCount(client.userId);
  const unreadForLawyer = await cases.unreadCaseMessageCount(lawyer.userId);
  check('reading the thread clears the reader\u2019s unread count', unreadForClient === 0);
  check('the lawyer still has one unread message', unreadForLawyer === 1, `got ${unreadForLawyer}`);

  const progress = await cases.advanceCase(caseId, lawyer.userId, 'IN_PROGRESS', meta);
  check('the assigned lawyer can start the work', progress.ok === true);

  const clientProgress = await cases.advanceCase(caseId, client.userId, 'COMPLETED', meta);
  check('the client cannot mark the case complete', clientProgress.ok === false);

  const complete = await cases.advanceCase(caseId, lawyer.userId, 'COMPLETED', meta);
  check('the assigned lawyer can complete it', complete.ok === true);

  section('A firm case may be accepted by any of its lawyers');

  const firm = await register(`firm.${runId}@example.ae`, 'FIRM');
  await makeProfile(firm.userId, 'Firm Admin', 7003);
  await saveFirmCredential(
    firm.userId,
    {
      legalName: `Firm ${runId} Legal LLC`,
      tradeLicenseNumber: `DED-${runId}`,
      tradeLicenseAuthority: 'Dubai Economy and Tourism',
      tradeLicenseExpiresOn: '2030-01-01',
      registeredEmirate: 'DUBAI',
      authorisedSignatory: 'Firm Admin',
    },
    meta,
  );
  await uploadDocument(firm.userId, { kind: 'EMIRATES_ID', file: file('fid.png') }, meta);
  await uploadDocument(firm.userId, { kind: 'LAWYER_LICENSE', file: file('flic.png') }, meta);
  await uploadDocument(firm.userId, { kind: 'FIRM_TRADE_LICENSE', file: file('ftl.png') }, meta);
  const firmListing = await saveListing(
    firm.userId,
    {
      displayName: `Firm ${runId} Legal`,
      headline: 'Property and employment',
      bio: 'Test fixture firm.',
      primaryEmirate: 'DUBAI',
      emirates: ['DUBAI'],
      areas: ['REAL_ESTATE_PROPERTY', 'LABOUR_EMPLOYMENT'],
      languages: 'Arabic, English',
      acceptsNewClients: 'on',
      published: 'on',
    },
    meta,
  );
  check('the firm can publish a listing', firmListing.ok === true);
  const firmListingId = (
    await prisma.listing.findUnique({ where: { userId: firm.userId }, select: { id: true } })
  )?.id;

  const firmCase = await cases.createCase(
    client.userId,
    {
      listingId: firmListingId ?? '',
      title: 'Unpaid salary claim',
      caseType: 'LABOUR_EMPLOYMENT',
      description: 'My employer has not paid three months of salary and I need to file a claim.',
    },
    [file('payslip.png')],
    meta,
  );
  check('a case can be sent to a firm', firmCase.ok === true, firmCase.ok ? '' : firmCase.message);
  const firmCaseId = firmCase.ok ? firmCase.data.caseId : '';

  const firmRow = await prisma.legalCase.findUnique({
    where: { id: firmCaseId },
    select: { firmId: true, lawyerId: true, status: true },
  });
  check('it is addressed to the firm and unassigned', firmRow?.firmId !== null && firmRow?.lawyerId === null);

  const firmDashboard = await cases.listCasesForFirm(firm.userId);
  check('it shows in the firm dashboard as new', firmDashboard.submitted.some((item) => item.id === firmCaseId));

  const firmOwnerAccept = await cases.acceptCase(firmCaseId, firm.userId, meta);
  check(
    'the firm account itself cannot accept a case',
    firmOwnerAccept.ok === false,
    firmOwnerAccept.ok ? 'it was allowed' : undefined,
  );

  // A lawyer joins the firm through the invitation flow.
  const invite = await firmService.inviteLawyerToFirm(
    firm.userId,
    { email: `firmlawyer.${runId}@example.ae` },
    meta,
  );
  check('the firm can register a new professional', invite.ok === true, invite.ok ? '' : invite.message);
  const inviteToken = invite.ok ? invite.data.token : '';

  const described = await firmService.describeInvitationToken(inviteToken);
  check('the invitation link names the firm', described?.firm.legalName === `Firm ${runId} Legal LLC`);

  const firmLawyer = await register(`firmlawyer.${runId}@example.ae`, 'LAWYER', inviteToken);
  check('the invited lawyer can register through the link', Boolean(firmLawyer.userId));

  await makeProfile(firmLawyer.userId, 'Firm Lawyer', 7004);
  const savedCredential = await saveLawyerCredential(
    firmLawyer.userId,
    {
      licenseNumber: `FLIC-${runId}`,
      licensingAuthority: 'Legal Dash Affairs Department',
      licenseExpiresOn: '2031-01-01',
      yearsOfExperience: '6',
    },
    meta,
  );
  check(
    'saving their licence links them to the firm',
    savedCredential.ok === true && savedCredential.data.joinedFirm === `Firm ${runId} Legal LLC`,
    savedCredential.ok ? String(savedCredential.data.joinedFirm) : savedCredential.message,
  );

  const roster = await firmService.listFirmLawyers(firm.userId);
  check('they appear under lawyers registered', roster.lawyers.some((row) => row.user.id === firmLawyer.userId));

  const firmlawyerPending = await cases.listCasesForLawyer(firmLawyer.userId);
  check(
    'the firm\u2019s case appears for its lawyer to review',
    firmlawyerPending.pending.some((item) => item.id === firmCaseId),
  );

  const firmLawyerReview = await cases.reviewCase(firmCaseId, firmLawyer.userId, meta);
  check('a firm lawyer can open the case for review', firmLawyerReview.ok === true);

  const firmLawyerAccept = await cases.acceptCase(firmCaseId, firmLawyer.userId, meta);
  check('a firm lawyer can accept the case', firmLawyerAccept.ok === true, firmLawyerAccept.ok ? '' : firmLawyerAccept.message);

  const firmAfterAccept = await prisma.legalCase.findUnique({
    where: { id: firmCaseId },
    select: { status: true, lawyerId: true },
  });
  check('it is assigned to the accepting lawyer', firmAfterAccept?.status === 'ASSIGNED' && firmAfterAccept.lawyerId !== null);

  section('The calendar books meetings and alerts the client');

  const tomorrow = addDaysToKey(todayKey(), 1);
  const lawyerProfileId = (
    await prisma.lawyerProfile.findUnique({ where: { userId: lawyer.userId }, select: { id: true } })
  )!.id;

  const slotsBefore = await appointments.listDaySlots(lawyerProfileId, tomorrow);
  check('the day offers bookable slots', slotsBefore.length > 0 && slotsBefore.every((slot) => !slot.taken));

  const booking = await appointments.bookAppointment(
    lawyer.userId,
    {
      lawyerProfileId,
      clientId: client.userId,
      dateKey: tomorrow,
      hour: 10,
      caseId,
      note: 'Review the receipts before the hearing.',
      mode: 'OFFICE_VISIT',
      officeAddress: 'Office 1, Test Tower, Dubai',
    },
    meta,
  );
  check('the lawyer can book a meeting with a client', booking.ok === true, booking.ok ? '' : booking.message);

  const slotsAfter = await appointments.listDaySlots(lawyerProfileId, tomorrow);
  check('the booked slot is no longer offered', slotsAfter.find((slot) => slot.hour === 10)?.taken === true);

  const doubleBooking = await appointments.bookAppointment(
    lawyer.userId,
    {
      lawyerProfileId,
      clientId: client.userId,
      dateKey: tomorrow,
      hour: 10,
      mode: 'OFFICE_VISIT',
      officeAddress: 'Office 1, Test Tower, Dubai',
    },
    meta,
  );
  check('the same slot cannot be booked twice', doubleBooking.ok === false);

  const notAClient = await appointments.bookAppointment(
    lawyer.userId,
    {
      lawyerProfileId,
      clientId: stranger.userId,
      dateKey: tomorrow,
      hour: 11,
      mode: 'OFFICE_VISIT',
      officeAddress: 'Office 1, Test Tower, Dubai',
    },
    meta,
  );
  check('a meeting cannot be booked with someone who is not a client', notAClient.ok === false);

  const otherDiary = await appointments.bookAppointment(
    firmLawyer.userId,
    {
      lawyerProfileId,
      clientId: client.userId,
      dateKey: tomorrow,
      hour: 12,
      mode: 'OFFICE_VISIT',
      officeAddress: 'Office 1, Test Tower, Dubai',
    },
    meta,
  );
  check('a lawyer cannot book into another lawyer\u2019s diary', otherDiary.ok === false);

  const clientMeetings = await appointments.listAppointmentsForClient(client.userId);
  check('the client sees the meeting', clientMeetings.some((item) => item.startsAt.getUTCHours() === 6));

  const alerts = await listNotifications(client.userId);
  // An office visit is raised as a request the client has to answer, not as a
  // booking that simply happens to them.
  check(
    'the client is asked to confirm they will attend the office',
    alerts.some((item) => item.kind === 'appointment.office_requested'),
  );

  const clientsOfLawyer = await cases.listClientsForLawyer(lawyer.userId);
  check('the client appears in the lawyer\u2019s client list', clientsOfLawyer.some((row) => row.client.id === client.userId));

  // Cancelling must free the slot again. A plain unique constraint on
  // (lawyer, start) would have blocked that slot for good.
  const bookedId = booking.ok ? booking.data.appointmentId : '';
  const cancelled = await appointments.cancelAppointment(bookedId, lawyer.userId);
  check('the lawyer can cancel the meeting', cancelled.ok === true);

  const slotsAfterCancel = await appointments.listDaySlots(lawyerProfileId, tomorrow);
  check(
    'the cancelled slot is offered again',
    slotsAfterCancel.find((slot) => slot.hour === 10)?.taken === false,
  );

  const rebook = await appointments.bookAppointment(
    lawyer.userId,
    {
      lawyerProfileId,
      clientId: client.userId,
      dateKey: tomorrow,
      hour: 10,
      mode: 'OFFICE_VISIT',
      officeAddress: 'Office 1, Test Tower, Dubai',
    },
    meta,
  );
  check('the freed slot can be booked again', rebook.ok === true, rebook.ok ? '' : rebook.message);

  const someoneElses = await appointments.cancelAppointment(bookedId, stranger.userId);
  check('a stranger cannot cancel someone else\u2019s meeting', someoneElses.ok === false);

  section('Case files are private over HTTP');

  const caseFile = await prisma.caseFile.findFirst({ where: { caseId }, select: { id: true } });

  const anonFile = await fetch(`${BASE_URL}/api/case-files/${caseFile?.id}`, { redirect: 'manual' });
  check('an anonymous request for a case file is refused', anonFile.status === 401, `got ${anonFile.status}`);

  const strangerFile = await fetch(`${BASE_URL}/api/case-files/${caseFile?.id}`, {
    headers: { cookie: `dl_session=${stranger.sessionToken}` },
    redirect: 'manual',
  });
  check('an unrelated member cannot read a case file', strangerFile.status === 404, `got ${strangerFile.status}`);

  const clientFile = await fetch(`${BASE_URL}/api/case-files/${caseFile?.id}`, {
    headers: { cookie: `dl_session=${client.sessionToken}` },
    redirect: 'manual',
  });
  check('the client can read their own attachment', clientFile.status === 200, `got ${clientFile.status}`);

  const lawyerFile = await fetch(`${BASE_URL}/api/case-files/${caseFile?.id}`, {
    headers: { cookie: `dl_session=${lawyer.sessionToken}` },
    redirect: 'manual',
  });
  check('the assigned lawyer can read it', lawyerFile.status === 200, `got ${lawyerFile.status}`);

  section('Practice pages are closed to client accounts');

  for (const path of ['/portfolio', '/pending', '/clients', '/calendar', '/firm/lawyers']) {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { cookie: `dl_session=${client.sessionToken}` },
      redirect: 'manual',
    });
    check(`a client account is redirected away from ${path}`, response.status === 307, `got ${response.status}`);
  }

  const lawyerCalendar = await fetch(`${BASE_URL}/calendar`, {
    headers: { cookie: `dl_session=${lawyer.sessionToken}` },
    redirect: 'manual',
  });
  check('a lawyer can open the calendar', lawyerCalendar.status === 200, `got ${lawyerCalendar.status}`);

  const firmRosterPage = await fetch(`${BASE_URL}/firm/lawyers`, {
    headers: { cookie: `dl_session=${firm.sessionToken}` },
    redirect: 'manual',
  });
  check('a firm can open its roster', firmRosterPage.status === 200, `got ${firmRosterPage.status}`);

  const clientCasePage = await fetch(`${BASE_URL}/cases/${caseId}`, {
    headers: { cookie: `dl_session=${client.sessionToken}` },
    redirect: 'manual',
  });
  check('the client can open the case page', clientCasePage.status === 200, `got ${clientCasePage.status}`);

  const strangerCasePage = await fetch(`${BASE_URL}/cases/${caseId}`, {
    headers: { cookie: `dl_session=${stranger.sessionToken}` },
    redirect: 'manual',
  });
  check('a stranger gets a 404 for the case page', strangerCasePage.status === 404, `got ${strangerCasePage.status}`);

  const calendarWithSlots = await fetch(`${BASE_URL}/calendar?view=day&date=${tomorrow}`, {
    headers: { cookie: `dl_session=${lawyer.sessionToken}` },
    redirect: 'manual',
  });
  const dayHtml = await calendarWithSlots.text();
  check('the day view renders the booked meeting', dayHtml.includes('Client One'));

  // ══════════════════════════════════════════════════════════════════════════
  section('Cleanup');
  const [storedDocs, storedCaseFiles, documentIds, caseIds, inquiryIds, listingIds] = await Promise.all([
    prisma.document.findMany({ where: { userId: { in: createdUserIds } }, select: { storageKey: true } }),
    prisma.caseFile.findMany({ where: { uploadedById: { in: createdUserIds } }, select: { storageKey: true } }),
    prisma.document.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
    prisma.verificationCase.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
    prisma.inquiry.findMany({
      where: { OR: [{ fromUserId: { in: createdUserIds } }, { toUserId: { in: createdUserIds } }] },
      select: { id: true },
    }),
    prisma.listing.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
  ]);
  const legalCaseIds = await prisma.legalCase.findMany({
    where: { OR: [{ clientId: { in: createdUserIds } }, { firm: { userId: { in: createdUserIds } } }] },
    select: { id: true },
  });

  const entityIds = [
    ...createdUserIds,
    ...documentIds.map((row) => row.id),
    ...caseIds.map((row) => row.id),
    ...inquiryIds.map((row) => row.id),
    ...listingIds.map((row) => row.id),
    ...legalCaseIds.map((row) => row.id),
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
  for (const entry of [...storedDocs, ...storedCaseFiles]) {
    await deleteUpload(entry.storageKey).catch(() => undefined);
  }

  const remaining = await prisma.user.count({ where: { id: { in: createdUserIds } } });
  check('every account created by this run was removed', remaining === 0);
  console.info(`  Removed ${createdUserIds.length} accounts, ${emailRows.count} messages, ${auditRows.count} audit entries, and all uploaded files.`);

  await prisma.$disconnect();

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
  console.error('\nThe case end-to-end run crashed:', error);
  process.exitCode = 1;
});

// Keeps this file a module so its top-level constants stay file-scoped.
export {};
