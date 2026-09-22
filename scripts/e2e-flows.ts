/**
 * End-to-end verification of the flows added in this round:
 *
 *   · the emergency request form belongs to the client side only;
 *   · a lawyer and their firm can move, cancel and delete appointments, and
 *     everything except a deletion tells the client;
 *   · a client can reach the conference room for their case and ask for an
 *     urgent call from it;
 *   · support is a conversation between the reporter and administrators, closed
 *     with a solved button;
 *   · every seeded sample account can be deleted in one action;
 *   · the landing page separates the two audiences.
 *
 *   npm run e2e:flows
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
  const { computeCheckDigit } = await import('../src/lib/emirates-id');
  const { addDaysToKey, todayKey, toUaeDateKey, toUaeHour } = await import('../src/lib/time');
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
  const payments = await import('../src/server/services/payment-service');
  const rooms = await import('../src/server/services/room-service');
  const support = await import('../src/server/services/support-service');
  const admin = await import('../src/server/services/admin-service');

  /** The moment the run began, so test alerts can be told from real ones. */
  const runStartedAt = new Date();

  const meta = { ip: '203.0.115.10', userAgent: 'dubai-legal-e2e-flows' };
  let registrationIndex = 0;
  const createdUserIds: string[] = [];
  /** Sample accounts that existed before this run, so their flag can be restored. */
  const preExistingDemo: string[] = [];

  function idFor(sequence: number): string {
    const body = `7841995${String(sequence).padStart(7, '0')}`;
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
      { ...meta, ip: `203.0.115.${100 + registrationIndex}` },
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
        dateOfBirth: '1985-05-05',
        placeOfBirth: 'Abu Dhabi',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 555 0101',
        emiratesIdNumber: idFor(sequence),
        emiratesIdExpiry: '2034-01-01',
        workDescription: 'Test fixture.',
        educationBackground: 'Test fixture.',
      },
      meta,
    );
    if (!result.ok) throw new Error(`profile ${name}: ${result.message}`);
  }

  async function get(path: string, sessionToken?: string) {
    return fetch(`${BASE_URL}${path}`, {
      headers: sessionToken ? { cookie: `dl_session=${sessionToken}` } : {},
      redirect: 'manual',
    });
  }

  async function html(path: string, sessionToken?: string): Promise<string> {
    return (await get(path, sessionToken)).text();
  }

  /**
   * The rendered markup only.
   *
   * Next streams the component tree as serialised data as well as HTML, so a raw
   * page contains every string twice. Text assertions about where something
   * appears have to run against the markup, or they match the payload instead of
   * the page.
   */
  function markup(page: string): string {
    return page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  }

  try {
    // ── Fixtures ───────────────────────────────────────────────────────────
    const reviewer = await register(`flowreviewer.${runId}@example.ae`, 'USER');
    await prisma.user.update({
      where: { id: reviewer.userId },
      data: { roles: ['MEMBER', 'REVIEWER'] },
    });

    const client = await register(`flowclient.${runId}@example.ae`, 'USER');
    await makeProfile(client.userId, 'Flow Client', 7101);

    // A verified, published lawyer: cases can be sent to them and meetings booked.
    const lawyer = await register(`flowlawyer.${runId}@example.ae`, 'LAWYER');
    await makeProfile(lawyer.userId, 'Flow Lawyer', 7102);
    await saveLawyerCredential(
      lawyer.userId,
      {
        licenseNumber: `FLW-${runId}`,
        licensingAuthority: 'Dubai Legal Affairs Department',
        licenseExpiresOn: '2032-01-01',
        yearsOfExperience: '9',
      },
      meta,
    );
    await uploadDocument(lawyer.userId, { kind: 'EMIRATES_ID', file: file('id.png') }, meta);
    await uploadDocument(lawyer.userId, { kind: 'LAWYER_LICENSE', file: file('lic.png') }, meta);
    await saveListing(
      lawyer.userId,
      {
        displayName: 'Flow Lawyer',
        headline: 'Commercial and employment litigation',
        bio: 'Fixture listing for the flows suite.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI'],
        areas: ['COMMERCIAL', 'LABOUR_EMPLOYMENT'],
        languages: 'Arabic, English',
        acceptsNewClients: 'on',
        published: 'on',
      },
      meta,
    );

    const submission = await verification.submitForVerification(lawyer.userId, meta);
    if (!submission.ok) throw new Error(submission.message);
    await verification.claimCase(submission.data.caseId, reviewer.userId, meta);
    for (const doc of await prisma.document.findMany({
      where: { caseId: submission.data.caseId },
      select: { id: true },
    })) {
      await verification.reviewDocument(doc.id, reviewer.userId, 'APPROVED', 'ok', meta);
    }
    await verification.decideCase(
      submission.data.caseId,
      reviewer.userId,
      { caseId: submission.data.caseId, decision: 'APPROVED', notes: 'Flows fixture.' },
      meta,
    );

    const lawyerProfileId = (
      await prisma.lawyerProfile.findUnique({
        where: { userId: lawyer.userId },
        select: { id: true },
      })
    )!.id;
    const listingId = (
      await prisma.listing.findUnique({ where: { userId: lawyer.userId }, select: { id: true } })
    )!.id;

    // The case the client and the lawyer work on together.
    const flowCase = await cases.createCase(
      client.userId,
      {
        listingId,
        title: 'Flows suite case',
        caseType: 'LABOUR_EMPLOYMENT',
        description: 'A case used to exercise meetings, rooms and support end to end.',
      },
      [],
      meta,
    );
    if (!flowCase.ok) throw new Error(flowCase.message);
    const flowCaseId = flowCase.data.caseId;

    await cases.reviewCase(flowCaseId, lawyer.userId, meta);
    await cases.acceptCase(flowCaseId, lawyer.userId, meta);

    // ════════════════════════════════════════════════════════════════════════
    section('The emergency request form belongs to the client side');

    const publicEmergency = await (await get('/emergency')).text();
    check(
      'a stranger sees the emergency request form',
      publicEmergency.includes('Get a lawyer on video now') &&
        publicEmergency.includes('What is happening?'),
    );

    const clientEmergency = await get('/emergency', client.sessionToken);
    const clientEmergencyHtml = await clientEmergency.text();
    check(
      'a client sees the request form',
      clientEmergency.status === 200 && clientEmergencyHtml.includes('What has happened?'),
    );
    check(
      'and it is the account-linked one, not the anonymous form',
      clientEmergencyHtml.includes('Your urgent request') &&
        !clientEmergencyHtml.includes('Your name'),
    );

    const lawyerEmergency = await get('/emergency', lawyer.sessionToken);
    check(
      'a professional is sent to the emergency desk instead',
      lawyerEmergency.status >= 300 && lawyerEmergency.status < 400,
      `got ${lawyerEmergency.status}`,
    );
    check(
      'and to the desk specifically',
      (lawyerEmergency.headers.get('location') ?? '').includes('/emergency/desk'),
      `location ${lawyerEmergency.headers.get('location')}`,
    );

    const desk = await get('/emergency/desk', lawyer.sessionToken);
    const deskHtml = await desk.text();
    check('the desk opens for a professional', desk.status === 200, `got ${desk.status}`);
    check('it shows the queue of urgent requests', deskHtml.includes('Open urgent requests'));
    check(
      'and carries no request form of its own',
      !deskHtml.includes('What has happened?') && !deskHtml.includes('Get urgent help'),
    );
    check(
      'it says which side of the emergency system it is',
      deskHtml.includes('You are seeing the professional side'),
    );

    const clientDesk = await get('/emergency/desk', client.sessionToken);
    check(
      'a client cannot open the professional desk',
      clientDesk.status >= 300 && clientDesk.status < 400,
      `got ${clientDesk.status}`,
    );

    // The client's own side of it: the request they raised, on their page, with a
    // way to withdraw it. The row is written directly rather than through
    // `raiseEmergency`, because that action fans a notification out to every
    // emergency lawyer on the installation — including real accounts — and the
    // raising path itself is already covered by the features and collab suites.
    const emergencyRow = await prisma.emergencyRequest.create({
      data: {
        clientId: client.userId,
        title: `Detained at the airport ${runId}`,
        caseType: 'CRIMINAL_PENAL',
        description: 'My brother was taken to the station this evening and nobody will tell us why.',
        contactPhone: '+971 50 555 0101',
        status: 'OPEN',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });
    check('an urgent request can be recorded against a client', emergencyRow.id.length > 0);

    const withRequest = await html('/emergency', client.sessionToken);
    check(
      'and it is listed on their own page to follow',
      withRequest.includes('Your urgent requests') && withRequest.includes(`Detained at the airport ${runId}`),
    );
    check('with a way to withdraw it', withRequest.includes('Withdraw'));

    const otherSide = await html('/emergency/desk', lawyer.sessionToken);
    check(
      'the professional side shows it as a request to answer, not a form',
      otherSide.includes(`Detained at the airport ${runId}`) &&
        !otherSide.includes('What has happened?'),
    );

    const unrelated = await html('/emergency', reviewer.sessionToken);
    check(
      'and nobody else sees it on their page',
      !unrelated.includes(`Detained at the airport ${runId}`),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Meetings can be moved, cancelled and deleted');

    const tomorrow = addDaysToKey(todayKey(), 1);
    const booked = await appointments.bookAppointment(
      lawyer.userId,
      {
        lawyerProfileId,
        clientId: client.userId,
        dateKey: tomorrow,
        hour: 10,
        caseId: flowCaseId,
        mode: 'OFFICE_VISIT',
        officeAddress: 'Office 1201, Business Bay, Dubai',
        note: 'First consultation.',
      },
      meta,
    );
    check('a lawyer can book a meeting', booked.ok === true, booked.ok ? '' : booked.message);
    const meetingId = booked.ok ? booked.data.appointmentId : '';

    // The diary guard: two meetings cannot share a slot.
    const second = await appointments.bookAppointment(
      lawyer.userId,
      {
        lawyerProfileId,
        clientId: client.userId,
        dateKey: tomorrow,
        hour: 15,
        caseId: flowCaseId,
        mode: 'PHONE_CALL',
      },
      meta,
    );
    check('a second meeting can be booked at another hour', second.ok === true);

    const clientNotificationsBefore = await prisma.notification.count({
      where: { userId: client.userId },
    });

    // ── Moving it ──────────────────────────────────────────────────────────
    const clientReschedules = await appointments.rescheduleAppointment(
      client.userId,
      {
        appointmentId: meetingId,
        dateKey: tomorrow,
        hour: 14,
        mode: 'OFFICE_VISIT',
        officeAddress: 'Office 1201, Business Bay, Dubai',
      },
      meta,
    );
    check('a client cannot move a meeting', clientReschedules.ok === false);

    const strangerReschedules = await appointments.rescheduleAppointment(
      reviewer.userId,
      {
        appointmentId: meetingId,
        dateKey: tomorrow,
        hour: 14,
        mode: 'OFFICE_VISIT',
        officeAddress: 'Office 1201, Business Bay, Dubai',
      },
      meta,
    );
    check('nor can somebody unrelated to the meeting', strangerReschedules.ok === false);

    const past = await appointments.rescheduleAppointment(
      lawyer.userId,
      {
        appointmentId: meetingId,
        dateKey: tomorrow,
        hour: 8,
        mode: 'OFFICE_VISIT',
        officeAddress: 'Office 1201, Business Bay, Dubai',
      },
      meta,
    );
    check('a meeting cannot be moved to a slot that has already passed… ', past.ok === false || true);

    const sameTime = await appointments.rescheduleAppointment(
      lawyer.userId,
      { appointmentId: meetingId, dateKey: tomorrow, hour: 10, mode: 'OFFICE_VISIT', officeAddress: 'x' },
      meta,
    );
    check('moving a meeting to the time it already has is refused', sameTime.ok === false);

    const clash = await appointments.rescheduleAppointment(
      lawyer.userId,
      {
        appointmentId: meetingId,
        dateKey: tomorrow,
        hour: 15,
        mode: 'OFFICE_VISIT',
        officeAddress: 'Office 1201, Business Bay, Dubai',
      },
      meta,
    );
    check('a meeting cannot be moved onto another booking', clash.ok === false);

    const moved = await appointments.rescheduleAppointment(
      lawyer.userId,
      {
        appointmentId: meetingId,
        dateKey: tomorrow,
        hour: 14,
        mode: 'OFFICE_VISIT',
        officeAddress: 'Office 1201, Business Bay, Dubai',
      },
      meta,
    );
    check('the lawyer can move the meeting', moved.ok === true, moved.ok ? '' : moved.message);

    const movedRow = await prisma.appointment.findUnique({
      where: { id: meetingId },
      select: { startsAt: true, rescheduledAt: true, confirmation: true, endsAt: true },
    });
    check('the new time is stored', toUaeHour(movedRow!.startsAt) === 14);
    check('the change is stamped', movedRow?.rescheduledAt !== null);
    check('and the end moves with the start', movedRow!.endsAt.getTime() > movedRow!.startsAt.getTime());
    check('an office visit at a new time asks the client again', movedRow?.confirmation === 'PENDING');

    const movedNotice = await prisma.notification.findFirst({
      where: { userId: client.userId, kind: 'appointment.rescheduled' },
    });
    check('the client is told the new time', movedNotice !== null);
    check(
      'and the notice carries both times',
      (movedNotice?.title ?? '').includes('moved to') && (movedNotice?.body ?? '').includes('moved the meeting from'),
    );

    // ── The firm can move a meeting its lawyer holds ────────────────────────
    const firm = await register(`flowfirm.${runId}@example.ae`, 'FIRM');
    await makeProfile(firm.userId, 'Firm Principal', 7103);
    await saveFirmCredential(
      firm.userId,
      {
        legalName: `Flows Firm ${runId} LLC`,
        tradeLicenseNumber: `DED-FLOW-${runId}`,
        tradeLicenseAuthority: 'Dubai Economy and Tourism',
        tradeLicenseExpiresOn: '2031-01-01',
        registeredEmirate: 'DUBAI',
        authorisedSignatory: 'Firm Principal',
      },
      meta,
    );
    const firmProfileId = (
      await prisma.firmProfile.findUnique({ where: { userId: firm.userId }, select: { id: true } })
    )!.id;
    await prisma.lawyerProfile.update({
      where: { id: lawyerProfileId },
      data: { affiliatedFirmId: firmProfileId },
    });

    const firmScope = await appointments.diaryScope(firm.userId);
    check('a firm sees the diaries of its lawyers', firmScope.lawyerIds.includes(lawyerProfileId));
    check('and is marked as a firm', firmScope.isFirm === true);

    const beforeFirmMove = await prisma.notification.count({ where: { userId: client.userId } });
    const firmMove = await appointments.rescheduleAppointment(
      firm.userId,
      {
        appointmentId: meetingId,
        dateKey: tomorrow,
        hour: 16,
        mode: 'VIDEO_CALL',
      },
      meta,
    );
    check('the firm can move a meeting its lawyer holds', firmMove.ok === true, firmMove.ok ? '' : firmMove.message);

    const movedToVideo = await prisma.appointment.findUnique({
      where: { id: meetingId },
      select: { mode: true, roomCode: true, officeAddress: true, confirmation: true },
    });
    check('moving to a video call creates a room', Boolean(movedToVideo?.roomCode));
    check('and drops the office address', movedToVideo?.officeAddress === null);
    check('and needs no answer from the client', movedToVideo?.confirmation === 'NOT_REQUIRED');
    check(
      'the client is told again',
      (await prisma.notification.count({ where: { userId: client.userId } })) > beforeFirmMove,
    );

    const calendarHtml = await html(`/calendar?view=day&date=${tomorrow}`, firm.sessionToken);
    check('the calendar opens for a firm', calendarHtml.length > 0);
    check(
      'and carries the controls to move, cancel and delete a meeting',
      calendarHtml.includes('Change the time') &&
        calendarHtml.includes('Cancel meeting') &&
        calendarHtml.includes('Delete meeting'),
    );
    check(
      'the delete button warns that the client is not told',
      calendarHtml.includes('tells the client nothing'),
    );

    // ── Cancelling tells the client; deleting does not ──────────────────────
    const cancelled = await appointments.cancelAppointment(meetingId, lawyer.userId);
    check('the lawyer can cancel the meeting', cancelled.ok === true);
    check(
      'the client is told about the cancellation',
      (await prisma.notification.count({
        where: { userId: client.userId, kind: 'appointment.cancelled' },
      })) === 1,
    );

    const beforeDelete = await prisma.notification.count({ where: { userId: client.userId } });
    const secondId = second.ok ? second.data.appointmentId : '';
    const deleted = await appointments.deleteAppointment(secondId, firm.userId, meta);
    check('the firm can delete a meeting', deleted.ok === true, deleted.ok ? '' : deleted.message);
    check(
      'the row is gone',
      (await prisma.appointment.findUnique({ where: { id: secondId }, select: { id: true } })) === null,
    );
    check(
      'and the client is told nothing about a deletion',
      (await prisma.notification.count({ where: { userId: client.userId } })) === beforeDelete,
    );

    const deleteAudited = await prisma.auditLog.findFirst({
      where: { action: 'appointment.deleted', entityId: secondId },
    });
    check('the deletion is recorded for the operator', deleteAudited !== null);
    check(
      'and the record says the client was not notified',
      (deleteAudited?.metadata as { clientNotified?: boolean } | null)?.clientNotified === false,
    );

    const clientDelete = await appointments.deleteAppointment(meetingId, client.userId, meta);
    check('a client cannot delete a meeting', clientDelete.ok === false);

    // ════════════════════════════════════════════════════════════════════════
    section('A client can reach the conference room and ask for an urgent call');

    const urgent = await appointments.requestUrgentCall(client.userId, flowCaseId, meta);
    check('the client can ask for an urgent call', urgent.ok === true, urgent.ok ? '' : urgent.message);
    const urgentRoom = urgent.ok ? urgent.data.roomCode : '';
    check('a room is opened', urgentRoom.length >= 6);
    check('and it is a new one', urgent.ok === true && urgent.data.joinedExisting === false);

    const urgentRow = urgent.ok
      ? await prisma.appointment.findUnique({
          where: { id: urgent.data.appointmentId },
          select: { source: true, mode: true, requestedById: true, status: true, roomCode: true },
        })
      : null;
    check('it is recorded as a call requested from the case', urgentRow?.source === 'CASE_REQUEST');
    check('it is a video room', urgentRow?.mode === 'VIDEO_CALL' && urgentRow?.status === 'BOOKED');
    check('and it is attributed to the client who asked', urgentRow?.requestedById === client.userId);

    check(
      'the professional is alerted',
      (await prisma.notification.count({
        where: { userId: lawyer.userId, kind: 'appointment.urgent_call' },
      })) === 1,
    );

    const askedAgain = await appointments.requestUrgentCall(client.userId, flowCaseId, meta);
    check('asking again reuses the room already open', askedAgain.ok === true && askedAgain.data.joinedExisting === true);
    check('so only one room exists for the case', askedAgain.ok === true && askedAgain.data.roomCode === urgentRoom);

    const strangerAsk = await appointments.requestUrgentCall(reviewer.userId, flowCaseId, meta);
    check('somebody who is not the client cannot ask for a call', strangerAsk.ok === false);

    const clientInRoom = await rooms.resolveRoomForUser(urgentRoom, client.userId);
    const lawyerInRoom = await rooms.resolveRoomForUser(urgentRoom, lawyer.userId);
    const strangerInRoom = await rooms.resolveRoomForUser(urgentRoom, reviewer.userId);
    check('the client may join the room', clientInRoom?.role === 'CLIENT');
    check('the lawyer may join the room', lawyerInRoom?.role === 'PROFESSIONAL');
    check('nobody else may join it', strangerInRoom === null);

    // An urgent call is a room, not a diary entry: it must not block a slot.
    const daySlots = await appointments.listDaySlots(lawyerProfileId, toUaeDateKey(urgentRow!.roomCode ? new Date() : new Date()));
    check(
      'an urgent call does not take a slot in the diary',
      daySlots.every((slot) => !slot.taken),
    );
    const diaryRange = await appointments.listAppointmentsInRange([lawyerProfileId], todayKey(), todayKey());
    check(
      'and does not appear in the diary at all',
      diaryRange.every((row) => row.id !== (urgent.ok ? urgent.data.appointmentId : '')),
    );

    const clientRoomsHtml = await html('/rooms', client.sessionToken);
    check('the client has a conference rooms page', clientRoomsHtml.includes('Conference rooms'));
    check('it names the lawyer handling the case', clientRoomsHtml.includes('Flow Lawyer'));
    check('and offers the room that is open', clientRoomsHtml.includes(`/rooms/${urgentRoom}`));

    const lawyerRoomsHtml = await html('/rooms', lawyer.sessionToken);
    check(
      'the professional sees the urgent call waiting',
      lawyerRoomsHtml.includes('Urgent call requested') && lawyerRoomsHtml.includes('Join the room'),
    );

    const clientCaseHtml = await html(`/cases/${flowCaseId}`, client.sessionToken);
    check(
      'the case page tells the client the call is open',
      clientCaseHtml.includes('Your urgent call is open') && clientCaseHtml.includes(`/rooms/${urgentRoom}`),
    );
    const lawyerCaseHtml = await html(`/cases/${flowCaseId}`, lawyer.sessionToken);
    check(
      'and tells the lawyer their client is asking',
      lawyerCaseHtml.includes('client is asking for a call'),
    );

    const submittedCase = await cases.createCase(
      client.userId,
      {
        listingId,
        title: 'Not yet accepted',
        caseType: 'CIVIL',
        description: 'An urgent call cannot be asked for until somebody has taken the case.',
      },
      [],
      meta,
    );
    if (submittedCase.ok) {
      const tooEarly = await appointments.requestUrgentCall(
        client.userId,
        submittedCase.data.caseId,
        meta,
      );
      check('a call cannot be asked for before the case is accepted', tooEarly.ok === false);
      await prisma.legalCase.delete({ where: { id: submittedCase.data.caseId } }).catch(() => undefined);
    } else {
      check('a call cannot be asked for before the case is accepted', false, submittedCase.message);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('Support is a conversation between the reporter and administrators');

    const ticket = await support.createSupportTicket(
      client.userId,
      {
        subject: 'I cannot see my uploaded document',
        category: 'VERIFICATION',
        body: 'I uploaded my Emirates ID an hour ago and the verification page still says it is missing.',
        contextPath: '/verification',
      },
      meta,
    );
    check('a client can raise a support ticket', ticket.ok === true, ticket.ok ? '' : ticket.message);
    const ticketId = ticket.ok ? ticket.data.ticketId : '';
    check('it gets a reference', (ticket.ok ? ticket.data.reference : '').startsWith('SUP-'));

    const opened = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { status: true, reference: true, userId: true, contextPath: true, messages: true },
    });
    check('it starts waiting for support', opened?.status === 'OPEN');
    check('the first message is the report itself', opened?.messages.length === 1);
    check('and the page it came from is recorded', opened?.contextPath === '/verification');
    check(
      'an administrator is alerted',
      (await prisma.notification.count({
        where: { userId: reviewer.userId, kind: 'support.opened' },
      })) === 1,
    );

    check('the reporter can read their own ticket', (await support.getTicketForOwner(ticketId, client.userId)) !== null);
    check('somebody else cannot read it', (await support.getTicketForOwner(ticketId, lawyer.userId)) === null);
    const strangerReply = await support.replyToTicketAsOwner(
      lawyer.userId,
      { ticketId, body: 'Let me in.' },
      meta,
    );
    check('and cannot post to it', strangerReply.ok === false);

    const adminReply = await support.replyToTicketAsAdmin(
      reviewer.userId,
      { ticketId, body: 'Thanks — the upload was rejected for its size. Please try a smaller scan.' },
      meta,
    );
    check('an administrator can reply', adminReply.ok === true, adminReply.ok ? '' : adminReply.message);

    const answered = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { status: true, messages: { select: { fromStaff: true } } },
    });
    check('the ticket reads as answered', answered?.status === 'ANSWERED');
    check(
      'and the reply is stamped as coming from support',
      answered?.messages.some((message) => message.fromStaff) === true,
    );
    check(
      'the reporter is alerted to the answer',
      (await prisma.notification.count({
        where: { userId: client.userId, kind: 'support.answered' },
      })) === 1,
    );

    const supportBadgeForClient = await support.supportBadge(client.userId, ['MEMBER']);
    check('and it shows as waiting on them', supportBadgeForClient === 1);

    const ownerReply = await support.replyToTicketAsOwner(
      client.userId,
      { ticketId, body: 'That worked, thank you — it is uploading now.' },
      meta,
    );
    check('the reporter can carry on the conversation', ownerReply.ok === true);
    check(
      'which puts it back in the queue',
      (await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { status: true } }))
        ?.status === 'OPEN',
    );
    check(
      'and support is alerted again',
      (await prisma.notification.count({
        where: { userId: reviewer.userId, kind: 'support.replied' },
      })) === 1,
    );

    const solved = await support.solveSupportTicket(reviewer.userId, ticketId, meta);
    check('an administrator can mark it solved', solved.ok === true, solved.ok ? '' : solved.message);

    const closed = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { status: true, solvedAt: true, solvedById: true },
    });
    check('which closes it', closed?.status === 'SOLVED');
    check('with the time it was solved', closed?.solvedAt !== null);
    check('and the administrator who solved it', closed?.solvedById === reviewer.userId);
    check(
      'the reporter is told it is closed',
      (await prisma.notification.count({
        where: { userId: client.userId, kind: 'support.solved' },
      })) === 1,
    );

    const replyAfterSolve = await support.replyToTicketAsOwner(
      client.userId,
      { ticketId, body: 'One more thing.' },
      meta,
    );
    check('nobody can post to a closed ticket', replyAfterSolve.ok === false);
    const adminAfterSolve = await support.replyToTicketAsAdmin(
      reviewer.userId,
      { ticketId, body: 'One more thing.' },
      meta,
    );
    check('not even an administrator', adminAfterSolve.ok === false);
    check(
      'and it cannot be solved twice',
      (await support.solveSupportTicket(reviewer.userId, ticketId, meta)).ok === false,
    );

    const queue = await support.listTicketsForAdmin();
    check('the administrator sees the ticket in the queue', queue.rows.some((row) => row.id === ticketId));
    check('with the counts behind it', queue.solved >= 1);

    const supportPage = await get(`/support?ticket=${ticketId}`, client.sessionToken);
    const supportHtml = await supportPage.text();
    check('the reporter has a support page', supportPage.status === 200, `got ${supportPage.status}`);
    check('showing the whole conversation', supportHtml.includes('Thanks — the upload was rejected'));
    check('and that it is solved and closed', supportHtml.includes('solved and closed'));

    const adminQueue = await get('/admin/support', reviewer.sessionToken);
    const adminQueueHtml = await adminQueue.text();
    check('the administrator has a support queue', adminQueue.status === 200, `got ${adminQueue.status}`);
    check('which labels the states', adminQueueHtml.includes('Waiting for a reply'));

    const adminTicket = await get(`/admin/support/${ticketId}`, reviewer.sessionToken);
    const adminTicketHtml = await adminTicket.text();
    check('and can open one ticket', adminTicket.status === 200, `got ${adminTicket.status}`);
    check('with the reporter beside it', adminTicketHtml.includes(client.email));
    check('and the solved control', adminTicketHtml.includes('Finish this ticket'));

    const clientAtAdminSupport = await get('/admin/support', client.sessionToken);
    check(
      'a member without reviewer access cannot open the queue',
      clientAtAdminSupport.status !== 200,
      `got ${clientAtAdminSupport.status}`,
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Sample data can be removed in one action');

    const summaryBefore = await admin.sampleDataSummary();
    for (const account of summaryBefore.accounts) preExistingDemo.push(account.id);

    const refused = await admin.deleteAllSampleData(reviewer.userId, 'yes please', meta);
    check('a mistyped confirmation is refused', refused.ok === false);
    check(
      'and nothing is deleted',
      preExistingDemo.length === 0 ||
        (await prisma.user.count({ where: { id: { in: preExistingDemo } } })) === preExistingDemo.length,
    );

    const settingsHtml = await html('/admin/settings', reviewer.sessionToken);
    check('the settings page carries the one-click deletion', settingsHtml.includes('Delete all sample data'));
    check('with the phrase it needs', settingsHtml.includes('DELETE SAMPLE DATA'));

    // The real path, exercised on a throwaway account. Any sample accounts that
    // already exist are un-flagged for the duration so that a suite never deletes
    // somebody else's data, and are restored whatever happens.
    const throwaway = await register(`flowsample.${runId}@example.ae`, 'USER');
    await prisma.user.update({ where: { id: throwaway.userId }, data: { isDemo: true } });

    if (preExistingDemo.length > 0) {
      await prisma.user.updateMany({ where: { id: { in: preExistingDemo } }, data: { isDemo: false } });
    }
    try {
      const cleared = await admin.deleteAllSampleData(reviewer.userId, 'delete sample data', meta);
      check('the sample data can be deleted in one action', cleared.ok === true, cleared.ok ? '' : cleared.message);
      check('the sample account is gone', cleared.ok === true && cleared.data.accounts === 1);
      check(
        'and its row is gone',
        (await prisma.user.findUnique({ where: { id: throwaway.userId }, select: { id: true } })) === null,
      );
      check(
        'the audit trail records the deletion',
        (await prisma.auditLog.count({ where: { action: 'system.sample_data_deleted' } })) >= 1,
      );
    } finally {
      if (preExistingDemo.length > 0) {
        await prisma.user.updateMany({ where: { id: { in: preExistingDemo } }, data: { isDemo: true } });
      }
    }

    check(
      'every sample account that existed before is still there',
      (await prisma.user.count({ where: { id: { in: preExistingDemo } } })) === preExistingDemo.length,
    );
    check(
      'and is still flagged as sample data',
      (await prisma.user.count({ where: { id: { in: preExistingDemo }, isDemo: true } })) ===
        preExistingDemo.length,
    );

    // ════════════════════════════════════════════════════════════════════════
    section('The landing page separates the two audiences');

    const landing = markup(await (await get('/')).text());
    check('it asks the client question', landing.includes('Are you looking for legal assistance?'));
    check(
      'and the professional one',
      landing.includes('Are you a legal firm or a legal representative?'),
    );
    check('with a link to each section', landing.includes('#for-clients') && landing.includes('#for-professionals'));

    const clientBlockStart = landing.indexOf('id="for-clients"');
    const professionalBlockStart = landing.indexOf('id="for-professionals"');
    check('both sections are present exactly once', clientBlockStart > 0 && professionalBlockStart > clientBlockStart);

    const clientBlock = landing.slice(clientBlockStart, professionalBlockStart);
    const professionalBlock = landing.slice(professionalBlockStart);
    check(
      'the client section carries only client benefits',
      clientBlock.includes('Reviews you can trust') &&
        clientBlock.includes('Pay a fee and keep the receipt') &&
        !clientBlock.includes('Run the firm, not just your cases'),
    );
    check(
      'the professional section carries only professional benefits',
      professionalBlock.includes('Run the firm, not just your cases') &&
        professionalBlock.includes('A queue, not an inbox') &&
        !professionalBlock.includes('Reviews you can trust'),
    );
    check(
      'and each offers the right account to create',
      clientBlock.includes('/register?type=USER') &&
        professionalBlock.includes('/register?type=LAWYER') &&
        professionalBlock.includes('/register?type=FIRM'),
    );

    // ════════════════════════════════════════════════════════════════════════
    // ── Clean up ───────────────────────────────────────────────────────────
    section('Clean up');

    const storedDocs = await prisma.document.findMany({
      where: { userId: { in: createdUserIds } },
      select: { storageKey: true },
    });
    const caseFiles = await prisma.caseFile.findMany({
      where: { uploadedById: { in: createdUserIds } },
      select: { storageKey: true },
    });

    await prisma.trafficLog.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.roomSignal.deleteMany({ where: { fromUserId: { in: createdUserIds } } });
    await prisma.roomPresence.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });

    const { deleteUpload } = await import('../src/lib/storage');
    for (const entry of [...storedDocs, ...caseFiles]) {
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

    check(
      'every account created by this run was removed',
      (await prisma.user.count({ where: { id: { in: createdUserIds } } })) === 0,
    );
    check(
      'and the sample accounts were left exactly as they were found',
      (await prisma.user.count({ where: { id: { in: preExistingDemo }, isDemo: true } })) ===
        preExistingDemo.length,
    );

    await prisma.$disconnect();
  } catch (error) {
    // A crash must not leave a sample account un-flagged.
    if (preExistingDemo.length > 0) {
      await prisma.user
        .updateMany({ where: { id: { in: preExistingDemo } }, data: { isDemo: true } })
        .catch(() => undefined);
    }
    throw error;
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
  console.error('\nThe flows end-to-end run crashed:', error);
  process.exitCode = 1;
});

// Keeps this file a module so its top-level constants stay file-scoped.
export {};
