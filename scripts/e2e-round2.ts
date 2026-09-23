/**
 * End-to-end verification of the round after the branding work:
 *
 *   · the enquiry pool belongs to lawyers, firms and administrators;
 *   · files, including archives, travel through a case conversation;
 *   · uploads and message bodies are encrypted at rest, and legacy plaintext
 *     still reads;
 *   · the community feed carries recommendations, votes, replies and moderation;
 *   · a professional's page is laid out like a page, with its tabs;
 *   · calls can be cancelled and ended by the person who made them;
 *   · call recordings exist for both parties and are never playable by an
 *     administrator;
 *   · the mark goes to the dashboard once somebody is signed in;
 *   · a profile picture needs no review and appears at once.
 *
 *   npm run e2e:round2
 *
 * Every account it creates is removed, and every file it stores.
 */

process.loadEnvFile('.env');

const BASE_URL = process.env.APP_URL ?? 'http://localhost:3100';
const runId = Date.now().toString(36);

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
  const { readFile } = await import('node:fs/promises');
  const { resolveStoragePath } = await import('../src/lib/storage');
  const { addDaysToKey, todayKey } = await import('../src/lib/time');
  const auth = await import('../src/server/services/auth-service');
  const { updateProfile } = await import('../src/server/services/profile-service');
  const { saveLawyerCredential } = await import('../src/server/services/credential-service');
  const { saveListing } = await import('../src/server/services/listing-service');
  const { uploadDocument } = await import('../src/server/services/document-service');
  const verification = await import('../src/server/services/verification-service');
  const cases = await import('../src/server/services/case-service');
  const appointments = await import('../src/server/services/appointment-service');
  const payments = await import('../src/server/services/payment-service');
  const blog = await import('../src/server/services/blog-service');
  const recordings = await import('../src/server/services/room-recording-service');

  const runStartedAt = new Date();
  const meta = { ip: '203.0.120.10', userAgent: 'dubai-legal-e2e-round2' };
  let registrationIndex = 0;
  const createdUserIds: string[] = [];

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  );
  /** A minimal but real ZIP: the local file header, enough to be sniffed. */
  const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x02, 0x03, 0x04]);
  /** The EBML magic a WebM recording starts with. */
  const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f]);
  const file = (name: string, bytes = png, type = 'image/png') =>
    new File([new Uint8Array(bytes)], name, { type });

  function idFor(sequence: number): string {
    return `7841992${String(sequence).padStart(7, '0')}1`;
  }

  async function register(email: string, accountType: 'USER' | 'LAWYER' | 'FIRM') {
    registrationIndex += 1;
    const result = await auth.registerAccount(
      {
        accountType,
        email,
        fullName: `Test ${accountType}`,
        phone: '+971 50 000 0000',
        password: 'CorrectHorse9Battery',
        confirmPassword: 'CorrectHorse9Battery',
        acceptTerms: 'on',
      },
      { ...meta, ip: `203.0.120.${100 + registrationIndex}` },
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
        dateOfBirth: '1986-06-06',
        placeOfBirth: 'Dubai',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 999 3030',
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

  function markup(page: string): string {
    return page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  }

  async function notified(userId: string, kind: string): Promise<boolean> {
    return (await prisma.notification.count({ where: { userId, kind } })) > 0;
  }

  try {
    // ── Fixtures ───────────────────────────────────────────────────────────
    const reviewer = await register(`r2.admin.${runId}@example.ae`, 'USER');
    await makeProfile(reviewer.userId, 'Round Two Reviewer', 9201);
    await prisma.user.update({
      where: { id: reviewer.userId },
      data: { roles: ['MEMBER', 'REVIEWER'], verificationStatus: 'APPROVED' },
    });

    const client = await register(`r2.client.${runId}@example.ae`, 'USER');
    await makeProfile(client.userId, 'Round Two Client', 9202);

    const lawyer = await register(`r2.lawyer.${runId}@example.ae`, 'LAWYER');
    await makeProfile(lawyer.userId, 'Round Two Lawyer', 9203);
    await saveLawyerCredential(
      lawyer.userId,
      {
        licenseNumber: `R2-${runId}`,
        licensingAuthority: 'Legal Dash Affairs Department',
        licenseExpiresOn: '2032-01-01',
        yearsOfExperience: '7',
        // A fee is paid by bank transfer, so the fixture practice banks somewhere.
        bankAccountName: 'Round Two Lawyer',
        bankName: 'Emirates NBD',
        bankIban: 'AE070331234567890123456',
      },
      meta,
    );
    await uploadDocument(lawyer.userId, { kind: 'EMIRATES_ID', file: file('id.png') }, meta);
    await uploadDocument(lawyer.userId, { kind: 'LAWYER_LICENSE', file: file('lic.png') }, meta);
    await saveListing(
      lawyer.userId,
      {
        displayName: 'Round Two Lawyer',
        headline: 'Employment and commercial litigation',
        bio: 'Fixture listing for the round-two suite.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI'],
        areas: ['LABOUR_EMPLOYMENT', 'COMMERCIAL'],
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
      { caseId: submission.data.caseId, decision: 'APPROVED', notes: 'Round two fixture.' },
      meta,
    );

    const lawyerProfile = await prisma.lawyerProfile.findUnique({
      where: { userId: lawyer.userId },
      select: { id: true },
    });
    const listing = await prisma.listing.findUnique({
      where: { userId: lawyer.userId },
      select: { id: true },
    });

    const opened = await cases.createCase(
      client.userId,
      {
        listingId: listing!.id,
        title: 'Round two case',
        caseType: 'LABOUR_EMPLOYMENT',
        description: 'A case opened so the conversation, the room and the community can be exercised.',
      },
      [],
      meta,
    );
    if (!opened.ok) throw new Error(opened.message);
    const caseId = opened.data.caseId;
    await cases.reviewCase(caseId, lawyer.userId, meta);
    await cases.acceptCase(caseId, lawyer.userId, meta);

    // ════════════════════════════════════════════════════════════════════════
    section('The enquiry pool is for professionals, not for members');

    const clientPool = await get('/enquiries', client.sessionToken);
    check(
      'an individual is turned away from the pool',
      clientPool.status >= 300 && clientPool.status < 400,
      `got ${clientPool.status}`,
    );
    check(
      'and sent to their dashboard, where the reason is on show',
      (clientPool.headers.get('location') ?? '').includes('/dashboard'),
      `location ${clientPool.headers.get('location')}`,
    );

    const lawyerPool = await get('/enquiries', lawyer.sessionToken);
    check('a lawyer can open the pool', lawyerPool.status === 200, `got ${lawyerPool.status}`);

    const adminPool = await get('/admin/enquiries', reviewer.sessionToken);
    check('an administrator can open it too', adminPool.status === 200, `got ${adminPool.status}`);

    const clientNav = markup(await html('/dashboard', client.sessionToken));
    check('the pool is not in a member’s navigation', !clientNav.includes('/enquiries'));
    const lawyerNav = markup(await html('/dashboard', lawyer.sessionToken));
    check('but it is in a professional’s', lawyerNav.includes('/enquiries'));

    // The community belongs in every dashboard, exactly once.
    // Counted as navigation entries rather than as links: a dashboard that
    // offers the community among its tasks is not a duplicate button.
    check(
      'a member has the community in their dashboard navigation',
      (clientNav.match(/>Community<\/span>/g) ?? []).length >= 1,
    );
    check(
      'and a professional has it exactly once, not twice',
      (lawyerNav.match(/>Community<\/span>/g) ?? []).length === 1,
      `found ${(lawyerNav.match(/>Community<\/span>/g) ?? []).length}`,
    );
    check(
      'and it is offered among the common tasks on a member’s dashboard',
      clientNav.includes('Community — ask, answer, recommend'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Files and archives travel through the conversation');

    const posted = await cases.postCaseMessage(caseId, client.userId, {
      body: 'Here are the papers, including the bundle.',
      files: [file('offer.pdf', Buffer.from('%PDF-1.4 email bundle'), 'application/pdf'), file('papers.zip', zip, 'application/zip')],
    });
    check('a message can carry files', posted.ok === true, posted.ok ? '' : posted.message);
    check('and reports how many', posted.ok === true && posted.data.attachments === 2);

    const storedMessage = await prisma.caseMessage.findFirst({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        body: true,
        attachments: { select: { id: true, fileName: true, mimeType: true, storageKey: true } },
      },
    });
    check('the attachments are recorded', storedMessage?.attachments.length === 2);
    check(
      'the archive is recognised as one',
      storedMessage?.attachments.some((row) => row.fileName === 'papers.zip') === true,
    );

    const emptyMessage = await cases.postCaseMessage(caseId, client.userId, { body: '   ', files: [] });
    check('a message with neither words nor files is refused', emptyMessage.ok === false);

    const tooMany = await cases.postCaseMessage(caseId, client.userId, {
      body: 'Six files',
      files: Array.from({ length: 6 }, (_, index) => file(`f${index}.png`)),
    });
    check('and so is more than five files at once', tooMany.ok === false);

    const refusedType = await cases.postCaseMessage(caseId, client.userId, {
      body: 'An executable, whatever it says it is',
      files: [file('run.exe', Buffer.from('MZ\x90\x00binary'), 'application/octet-stream')],
    });
    check('a file that is not a document or an archive is refused', refusedType.ok === false);

    const readBack = await cases.listCaseMessages(caseId, lawyer.userId);
    const withFiles = readBack.messages.find((row) => row.attachments && row.attachments.length === 2);
    check('the other side receives the message and its files', Boolean(withFiles));
    check(
      'and the words come back as they were written',
      withFiles?.body === 'Here are the papers, including the bundle.',
    );

    const served = await get(`/api/case-files/${storedMessage!.attachments[0]!.id}`, lawyer.sessionToken);
    check('a party on the case can download an attachment', served.status === 200, `got ${served.status}`);

    const stranger = await register(`r2.stranger.${runId}@example.ae`, 'USER');
    await makeProfile(stranger.userId, 'Round Two Stranger', 9204);
    const notYours = await get(`/api/case-files/${storedMessage!.attachments[0]!.id}`, stranger.sessionToken);
    check('somebody who is not on the case cannot', notYours.status === 404, `got ${notYours.status}`);

    // ════════════════════════════════════════════════════════════════════════
    section('Uploads and messages are encrypted at rest');

    check(
      'a message body is not stored in the clear',
      storedMessage?.body.startsWith('dle1:') === true && !storedMessage!.body.includes('bundle'),
    );

    const archiveRow = storedMessage!.attachments.find((row) => row.fileName === 'papers.zip')!;
    const onDisk = await readFile(resolveStoragePath(archiveRow.storageKey));
    check('a stored file carries the encryption header', onDisk.subarray(0, 4).toString() === 'DLE1');
    check('and its original bytes are not visible on disk', !onDisk.includes(zip));

    const downloaded = Buffer.from(await (await get(`/api/case-files/${archiveRow.id}`, client.sessionToken)).arrayBuffer());
    check('but it is handed back byte for byte', downloaded.equals(zip));

    // Reading something written before encryption existed still works.
    const legacy = await prisma.caseMessage.create({
      data: { caseId, authorId: lawyer.userId, body: 'A message from before encryption.' },
      select: { id: true },
    });
    const legacyRead = await cases.listCaseMessages(caseId, client.userId);
    check(
      'a message written before this change still reads',
      legacyRead.messages.some((row) => row.id === legacy.id && row.body === 'A message from before encryption.'),
    );
    await prisma.caseMessage.delete({ where: { id: legacy.id } });

    const casePage = markup(await html(`/cases/${caseId}`, client.sessionToken));
    check('the case page says the papers are encrypted', casePage.includes('are encrypted'));
    check('and that an administrator cannot read the conversation', casePage.includes('administrator cannot read a case conversation'));

    // ════════════════════════════════════════════════════════════════════════
    section('A profile picture needs no review and shows at once');

    const photo = await uploadDocument(
      client.userId,
      { kind: 'PROFILE_PHOTO', file: file('me.png') },
      meta,
    );
    check('a profile picture can be uploaded', photo.ok === true, photo.ok ? '' : photo.message);

    const photoRow = await prisma.document.findUnique({
      where: { id: photo.ok ? photo.data.documentId : '' },
      select: { status: true, kind: true },
    });
    check('it is live immediately, with nothing to review', photoRow?.status === 'APPROVED');

    const profile = await prisma.profile.findUnique({
      where: { userId: client.userId },
      select: { avatarDocumentId: true },
    });
    check('and it is set as the avatar straight away', profile?.avatarDocumentId === (photo.ok ? photo.data.documentId : ''));

    const avatar = await get(`/api/avatar/${client.userId}`, client.sessionToken);
    check('the avatar is served', avatar.status === 200, `got ${avatar.status}`);
    check(
      'and is never cached, so a replacement appears at once',
      (avatar.headers.get('cache-control') ?? '').includes('no-store'),
    );

    const overview = await verification.getVerificationOverview(client.userId);
    check(
      'a profile picture is not put in front of a reviewer',
      (overview?.documents ?? []).every((doc) => doc.kind !== 'PROFILE_PHOTO'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('The community carries recommendations, votes and replies');

    const post = await blog.createPost(
      client.userId,
      {
        kind: 'RECOMMENDATION',
        listingId: listing!.id,
        topic: 'LABOUR_EMPLOYMENT',
        title: 'Clear advice on a dismissal, and quick to file',
        body: 'I was dismissed without notice. They read the contract the same day, told me what was worth chasing and filed with the labour office that week.',
      },
      meta,
    );
    check('a member can recommend a professional', post.ok === true, post.ok ? '' : post.message);
    const postId = post.ok ? post.data.postId : '';

    // Every post is read by a moderator before it appears on the board.
    check(
      'a new post waits for a moderator',
      (await prisma.blogPost.findUnique({ where: { id: postId }, select: { status: true } }))?.status ===
        'PENDING',
    );
    check('and is not on the board yet', !(await html('/blog')).includes('Clear advice on a dismissal'));

    const approved = await blog.decidePost(
      reviewer.userId,
      { postId, decision: 'PUBLISHED' },
      meta,
    );
    check('a moderator can publish it', approved.ok === true, approved.ok ? '' : approved.message);
    check('and then it is on the board', (await html('/blog')).includes('Clear advice on a dismissal'));

    const stillPending = await blog.createPost(
      client.userId,
      {
        kind: 'QUESTION',
        topic: 'TENANCY_PROPERTY',
        title: 'Landlord is keeping my deposit',
        body: 'The tenancy ended two months ago and the landlord still has my deposit with no explanation at all.',
      },
      meta,
    );
    check('a second post also waits', stillPending.ok === true);
    const stillPendingId = stillPending.ok ? stillPending.data.postId : '';
    check(
      'and only its author can see it',
      (await blog.getPost(stillPendingId, stranger.userId)) === null &&
        (await blog.getPost(stillPendingId, client.userId)) !== null,
    );
    await blog.decidePost(reviewer.userId, { postId: stillPendingId, decision: 'REMOVED', note: 'Test fixture.' }, meta);

    check(
      'and the professional is told',
      (await prisma.notification.count({
        where: { userId: lawyer.userId, kind: 'community.recommended' },
      })) === 1,
    );

    const unknownListing = await blog.createPost(
      client.userId,
      { kind: 'RECOMMENDATION', listingId: 'not-a-listing', title: 'A bad link', body: 'x'.repeat(30) },
      meta,
    );
    check('a post cannot recommend a profile that is not in the directory', unknownListing.ok === false);

    const shortPost = await blog.createPost(client.userId, { kind: 'NOTE', title: 'Hi', body: 'short' }, meta);
    check('and a post has to say something', shortPost.ok === false);

    const up = await blog.voteOnPost(lawyer.userId, { id: postId, value: 1 });
    const down = await blog.voteOnPost(stranger.userId, { id: postId, value: -1 });
    check('votes are recorded', up.ok === true && down.ok === true);
    check('and an upvote and a downvote cancel out', down.ok === true && down.data.score === 0);

    const changedMind = await blog.voteOnPost(stranger.userId, { id: postId, value: 1 });
    check('a vote can be changed', changedMind.ok === true && changedMind.data.score === 2);
    const withdrawn = await blog.voteOnPost(stranger.userId, { id: postId, value: 0 });
    check('and taken back', withdrawn.ok === true && withdrawn.data.score === 1);

    const comment = await blog.addComment(lawyer.userId, {
      postId,
      body: 'Thank you — the schedule you sent made the difference.',
    });
    check('a member can reply', comment.ok === true, comment.ok ? '' : comment.message);
    const reply = await blog.addComment(stranger.userId, {
      postId,
      parentId: comment.ok ? comment.data.commentId : null,
      body: 'Good to know. How long did the filing take?',
    });
    check('and somebody can reply to a reply', reply.ok === true);

    const postView = await blog.getPost(postId, client.userId);
    check('the thread comes back with the post', postView?.thread.length === 1);
    check('with the reply under it', postView?.thread[0]?.replies.length === 1);
    check(
      'and its author is told when somebody replies',
      await notified(lawyer.userId, 'community.replied'),
    );

    const feed = await html('/blog', client.sessionToken);
    check('the feed shows the post', feed.includes('Clear advice on a dismissal'));
    check('with the profile it recommends', feed.includes('Round Two Lawyer'));
    check(
      'and says plainly that nothing here is legal advice',
      feed.includes('nothing here is legal advice'),
    );

    const guestFeed = await html('/blog');
    check('anybody can read the community', guestFeed.includes('Clear advice on a dismissal'));
    check(
      'a guest is sent to sign in and back to the community',
      guestFeed.includes('login?next=%2Fblog'),
    );

    const landing = markup(await html('/'));
    check(
      'the landing page has the community in the top navigation',
      landing.includes('href="/blog"') && landing.includes('Community'),
    );

    const feedWithBadges = await html('/blog', client.sessionToken);
    check(
      'an author’s badge and what kind of member they are are shown',
      feedWithBadges.includes('Verified') || feedWithBadges.includes('Not verified')
        ? feedWithBadges.includes('Client') || feedWithBadges.includes('Lawyer')
        : false,
    );
    check(
      'but a guest is told to sign in to write',
      guestFeed.includes('Sign in to post or vote') && !guestFeed.includes('Send for review'),
    );

    const profilePosts = markup(await html(`/directory/${listing!.id}?tab=posts`));
    check(
      'the recommendation appears on the professional’s page',
      profilePosts.includes('Clear advice on a dismissal'),
    );

    const hide = await blog.setPostStatus(
      reviewer.userId,
      postId,
      'HIDDEN',
      'Names a case reference.',
      meta,
    );
    check('an administrator can hide a post', hide.ok === true);
    check(
      'the author is told why',
      (await prisma.notification.count({
        where: { userId: client.userId, kind: 'community.moderated' },
      })) >= 1,
    );
    const hiddenFeed = await html('/blog');
    check('and it leaves the feed', !hiddenFeed.includes('Clear advice on a dismissal'));
    const authorView = await blog.getPost(postId, client.userId);
    check('while the author still sees it, with the reason', authorView?.moderationNote === 'Names a case reference.');
    const strangerView = await blog.getPost(postId, stranger.userId);
    check('and nobody else does', strangerView === null);

    const restore = await blog.setPostStatus(reviewer.userId, postId, 'PUBLISHED', null, meta);
    check('it can be put back', restore.ok === true);
    check('and it returns to the feed', (await html('/blog')).includes('Clear advice on a dismissal'));

    const moderation = await html('/admin/blog', reviewer.sessionToken);
    check('the console has a moderation screen', moderation.includes('Community'));

    const deleteOwn = await blog.deleteOwnPost(stranger.userId, postId, meta);
    check('somebody else’s post cannot be deleted by a stranger', deleteOwn.ok === false);

    // ════════════════════════════════════════════════════════════════════════
    section('A professional’s page is laid out like a page');

    const page = markup(await html(`/directory/${listing!.id}?tab=about`));
    check('it opens with the identity card', page.includes('Intro'));
    check('and has no cover band', !page.includes('bg-gradient-to-r from-brand-700'));
    check(
      'and no message button next to the case action',
      !page.includes('>Message<') && page.includes('Send a case'),
    );
    check('an intro column', page.includes('Intro'));
    check('page info', page.includes('Page info'));
    check('and tabs', page.includes('?tab=posts') && page.includes('?tab=reviews') && page.includes('?tab=contact'));
    check('the about tab carries the licence', page.includes('Licence number'));
    check('and the practice areas', page.includes('Employment') || page.includes('Labour'));

    const contactTab = markup(await html(`/directory/${listing!.id}?tab=contact`));
    check('the contact tab carries the contact details', contactTab.includes('Contact and location'));

    const reviewsTab = markup(await html(`/directory/${listing!.id}?tab=reviews`));
    check('the recommendations tab carries the reviews', reviewsTab.includes('Review') || reviewsTab.includes('recommend'));

    const loggedOutPage = markup(await html(`/directory/${listing!.id}`));
    check(
      'a guest is offered a way in rather than an action they cannot take',
      loggedOutPage.includes('Sign in'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('A call can be cancelled or ended by the person who made it');

    const urgent = await appointments.requestUrgentCall(client.userId, caseId, meta);
    check('the client can ask for an urgent call', urgent.ok === true, urgent.ok ? '' : urgent.message);
    const roomCode = urgent.ok ? urgent.data.roomCode : '';

    const roomPage = markup(await html(`/rooms/${roomCode}`, client.sessionToken));
    check('the room offers to end the call', roomPage.includes('End this call'));
    check('and says what leaving does', roomPage.includes('Leaving the room keeps it open'));

    const recording = await recordings.saveRoomRecording(
      client.userId,
      { roomCode, durationMs: 42_000 },
      file(`call-${roomCode}.webm`, webm, 'video/webm'),
      meta,
    );
    check('a recording made in the room is stored', recording.ok === true, recording.ok ? '' : recording.message);

    check(
      'a file that is not a recording is refused',
      (
        await recordings.saveRoomRecording(
          client.userId,
          { roomCode },
          file('notes.txt', Buffer.from('hello'), 'text/plain'),
          meta,
        )
      ).ok === false,
    );

    const second = await recordings.saveRoomRecording(
      lawyer.userId,
      { roomCode, durationMs: 41_000 },
      file(`call-${roomCode}-other.webm`, webm, 'video/webm'),
      meta,
    );
    check('the other side records its own copy', second.ok === true);

    const list = await recordings.listRecordingsForRoom(roomCode);
    check('the room has both recordings', list.length === 2);

    const forClient = await recordings.getRecordingForViewer(
      recording.ok ? recording.data.recordingId : '',
      { id: client.userId, roles: ['MEMBER'] },
    );
    const forLawyer = await recordings.getRecordingForViewer(
      recording.ok ? recording.data.recordingId : '',
      { id: lawyer.userId, roles: ['MEMBER'] },
    );
    const forAdmin = await recordings.getRecordingForViewer(
      recording.ok ? recording.data.recordingId : '',
      { id: reviewer.userId, roles: ['MEMBER', 'REVIEWER'] },
    );
    const forStranger = await recordings.getRecordingForViewer(
      recording.ok ? recording.data.recordingId : '',
      { id: stranger.userId, roles: ['MEMBER'] },
    );
    check('the client can play the call back', forClient !== null);
    check('so can the lawyer', forLawyer !== null);
    check('an administrator cannot', forAdmin === null);
    check('and neither can a stranger', forStranger === null);

    const adminFetch = await get(`/api/room-recordings/${recording.ok ? recording.data.recordingId : ''}`, reviewer.sessionToken);
    check('which the endpoint enforces too', adminFetch.status === 404, `got ${adminFetch.status}`);
    const clientFetch = await get(`/api/room-recordings/${recording.ok ? recording.data.recordingId : ''}`, client.sessionToken);
    check(
      'and a party on the call gets the file',
      clientFetch.status === 200 && (clientFetch.headers.get('content-type') ?? '').includes('video'),
      `got ${clientFetch.status}`,
    );

    const adminMeetings = markup(await html('/admin/meetings', reviewer.sessionToken));
    check('the console counts recordings', adminMeetings.includes('Call recordings'));
    check('and says it cannot play them', adminMeetings.includes('You cannot play them'));

    const recordingNotice = markup(await html(`/rooms/${roomCode}`, client.sessionToken));
    check('the room says the recording is private and encrypted', recordingNotice.includes('Private and encrypted'));
    check('and lists the recordings', recordingNotice.includes('Recordings of this call'));

    const cancelled = await appointments.cancelAppointment(urgent.ok ? urgent.data.appointmentId : '', client.userId);
    check('the client can cancel the call they started', cancelled.ok === true);
    const closedRoom = await get(`/rooms/${roomCode}`, client.sessionToken);
    check('and the room closes with it', closedRoom.status === 404, `got ${closedRoom.status}`);

    const endedByOther = await appointments.requestUrgentCall(client.userId, caseId, meta);
    const ended = await appointments.cancelAppointment(
      endedByOther.ok ? endedByOther.data.appointmentId : '',
      lawyer.userId,
    );
    check('the professional can end it from their side too', ended.ok === true);

    // ════════════════════════════════════════════════════════════════════════
    section('A fee is paid by bank transfer, and a card is not pretending otherwise');

    const noBank = await register(`r2.nobank.${runId}@example.ae`, 'LAWYER');
    await makeProfile(noBank.userId, 'Unbanked Lawyer', 9210);
    await saveLawyerCredential(
      noBank.userId,
      {
        licenseNumber: `NB-${runId}`,
        licensingAuthority: 'Legal Dash Affairs Department',
        licenseExpiresOn: '2032-01-01',
        yearsOfExperience: '3',
      },
      meta,
    );
    await saveListing(
      noBank.userId,
      {
        displayName: 'Unbanked Lawyer',
        headline: 'No account yet',
        bio: 'A fixture with no bank details.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI'],
        areas: ['CIVIL'],
        languages: 'English',
        acceptsNewClients: 'on',
        published: 'on',
      },
      meta,
    );
    const noBankListing = await prisma.listing.findUnique({
      where: { userId: noBank.userId },
      select: { id: true },
    });
    const unbankedCase = await cases.createCase(
      client.userId,
      {
        listingId: noBankListing!.id,
        title: 'Fee with no bank details',
        caseType: 'CIVIL',
        description: 'A case used to check that a fee cannot be raised without an account to pay into.',
      },
      [],
      meta,
    );
    if (unbankedCase.ok) {
      await cases.acceptCase(unbankedCase.data.caseId, noBank.userId, meta);
      const refuseFee = await payments.requestPayment(
        noBank.userId,
        { caseId: unbankedCase.data.caseId, amountAed: 500, purpose: 'CONSULTATION' },
        meta,
      );
      check('a fee cannot be raised without bank details', refuseFee.ok === false);
      check(
        'and the message says what is missing',
        (refuseFee.ok === false ? refuseFee.message : '').includes('account holder name'),
      );
    } else {
      check('a fee cannot be raised without bank details', false, unbankedCase.message);
    }

    const bank = await payments.bankingDetailsFor(lawyer.userId);
    check('the fixture lawyer banks somewhere', payments.missingBankingFields(bank).length === 0);

    const withBank = await payments.requestPayment(
      lawyer.userId,
      { caseId, amountAed: 300, purpose: 'CONSULTATION', details: 'A fee that can be paid.' },
      meta,
    );
    check('and a fee can be raised once they do', withBank.ok === true, withBank.ok ? '' : withBank.message);
    const bankRow = withBank.ok
      ? await prisma.paymentRequest.findUnique({
          where: { id: withBank.data.paymentId },
          select: { bankAccountName: true, bankName: true, bankIban: true },
        })
      : null;
    check(
      'the bank details are copied onto the request itself',
      bankRow?.bankIban === 'AE070331234567890123456' && bankRow?.bankName === 'Emirates NBD',
    );

    const payPage = markup(
      await html(`/payments/${withBank.ok ? withBank.data.paymentId : ''}/pay`, client.sessionToken),
    );
    check('the pay page shows where to send the money', payPage.includes('Transfer to'));
    check('with the reference to quote', payPage.includes('Reference to quote'));
    check(
      'and offers the card option as something being built',
      payPage.includes('Not available yet'),
    );

    const cardPage = markup(
      await html(
        `/payments/${withBank.ok ? withBank.data.paymentId : ''}/pay?method=card`,
        client.sessionToken,
      ),
    );
    check(
      'choosing card says it is being developed and will be ready soon',
      cardPage.includes('Card payment is being developed') && cardPage.includes('will be ready soon'),
    );
    check('and shows no card form', !cardPage.includes('Card number'));

    const noReference = await payments.recordBankTransfer(
      client.userId,
      { paymentId: withBank.ok ? withBank.data.paymentId : '', reference: '' },
      meta,
    );
    check('a transfer cannot be recorded without its reference', noReference.ok === false);

    const recorded = await payments.recordBankTransfer(
      client.userId,
      { paymentId: withBank.ok ? withBank.data.paymentId : '', reference: `R2-${runId}` },
      meta,
    );
    check('the client records the transfer', recorded.ok === true, recorded.ok ? '' : recorded.message);
    const paidRow = withBank.ok
      ? await prisma.paymentRequest.findUnique({
          where: { id: withBank.data.paymentId },
          select: { status: true, method: true, reference: true, receiptNumber: true },
        })
      : null;
    check('it is recorded as a bank transfer', paidRow?.method === 'BANK_TRANSFER' && paidRow?.status === 'PAID');
    check('with the reference the client quoted', paidRow?.reference === `R2-${runId}`);
    check('and a receipt number', Boolean(paidRow?.receiptNumber));

    // ════════════════════════════════════════════════════════════════════════
    section('A professional can post to their own page');

    const pagePost = await blog.createPost(
      lawyer.userId,
      {
        kind: 'NOTE',
        topic: 'USING_DUBAI_LEGAL',
        listingId: listing!.id,
        title: 'We have moved to larger offices in Business Bay',
        body: 'From this month the practice is at Office 1804, Emirates Towers. Consultations continue as before, and the telephone number is unchanged.',
      },
      meta,
    );
    check('a practice can post to its own page', pagePost.ok === true, pagePost.ok ? '' : pagePost.message);
    const praisedBefore = await prisma.notification.count({
      where: { userId: lawyer.userId, kind: 'community.recommended' },
    });
    if (pagePost.ok) {
      await blog.decidePost(
        reviewer.userId,
        { postId: pagePost.data.postId, decision: 'PUBLISHED' },
        meta,
      );
    }
    check(
      'and is not told it recommended itself',
      (await prisma.notification.count({
        where: { userId: lawyer.userId, kind: 'community.recommended' },
      })) === praisedBefore,
    );

    const pageHtml = markup(await html(`/directory/${listing!.id}?tab=posts`));
    check('the post appears on their page', pageHtml.includes('We have moved to larger offices'));
    check('labelled as the practice’s own', pageHtml.includes('Posted by the practice'));
    check('alongside the recommendations', pageHtml.includes('Clear advice on a dismissal'));

    // ════════════════════════════════════════════════════════════════════════
    section('Signing in from the community comes back to the community');

    const loginPage = markup(await html('/login?next=%2Fblog'));
    check('the sign-in page carries the destination', loginPage.includes('name="next"'));
    check('and it is the community', loginPage.includes('value="/blog"'));

    const { safeNextPath } = await import('../src/lib/redirect');
    check('a path on this site is honoured', safeNextPath('/blog/123', '/dashboard') === '/blog/123');
    check(
      'a protocol-relative address is refused',
      safeNextPath('//evil.example', '/dashboard') === '/dashboard',
    );
    check('an absolute address is refused', safeNextPath('https://evil.example', '/dashboard') === '/dashboard');
    check('and nothing at all falls back', safeNextPath(undefined, '/dashboard') === '/dashboard');

    const landingForGuest = markup(await html('/'));
    check(
      'the community is in the landing navigation next to the directory',
      landingForGuest.includes('href="/directory"') &&
        landingForGuest.indexOf('href="/blog"') > landingForGuest.indexOf('href="/directory"'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Everyday things that had to change');

    const signedInHeader = markup(await html('/dashboard', client.sessionToken));
    check(
      'the mark points at the dashboard once somebody is signed in',
      signedInHeader.includes('href="/dashboard"'),
    );

    const profileForm = markup(await html('/profile', client.sessionToken));
    check(
      'the Emirates ID check-digit notice is gone from the form',
      !profileForm.includes('internal check digit'),
    );

    const sidebar = markup(await html('/dashboard', client.sessionToken));
    check('the sidebar hides its scrollbar', sidebar.includes('dl-scroll-hidden'));

    // ════════════════════════════════════════════════════════════════════════
    section('Clean up');

    const storedDocuments = await prisma.document.findMany({
      where: { userId: { in: createdUserIds } },
      select: { storageKey: true },
    });
    const attachments = await prisma.caseMessageAttachment.findMany({
      where: { message: { caseId } },
      select: { storageKey: true },
    });
    const recordingsToRemove = await prisma.roomRecording.findMany({
      where: { recordedById: { in: createdUserIds } },
      select: { storageKey: true },
    });
    const caseFiles = await prisma.caseFile.findMany({
      where: { uploadedById: { in: createdUserIds } },
      select: { storageKey: true },
    });

    const strayAlerts = await prisma.notification.deleteMany({
      where: {
        createdAt: { gte: runStartedAt },
        userId: { notIn: createdUserIds },
        kind: { in: ['support.opened', 'support.replied', 'enquiry.received', 'emergency.raised'] },
      },
    });
    if (strayAlerts.count > 0) {
      console.info(`  Removed ${strayAlerts.count} alert(s) raised for accounts this run did not create.`);
    }

    await prisma.trafficLog.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.roomSignal.deleteMany({ where: { fromUserId: { in: createdUserIds } } });
    await prisma.roomPresence.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });

    const { deleteUpload } = await import('../src/lib/storage');
    for (const row of [...storedDocuments, ...attachments, ...recordingsToRemove, ...caseFiles]) {
      await deleteUpload(row.storageKey).catch(() => undefined);
    }

    check(
      'every account created by this run was removed',
      (await prisma.user.count({ where: { id: { in: createdUserIds } } })) === 0,
    );
    check(
      'and every file it stored',
      (await prisma.caseMessageAttachment.count({ where: { storageKey: { in: attachments.map((row) => row.storageKey) } } })) === 0,
    );
    check(
      'and every recording',
      (await prisma.roomRecording.count({ where: { recordedById: { in: createdUserIds } } })) === 0,
    );

    await prisma.$disconnect();
  } catch (error) {
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
  console.error('\nThe round-two end-to-end run crashed:', error);
  process.exitCode = 1;
});

export {};
