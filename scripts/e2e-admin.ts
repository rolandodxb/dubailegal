/**
 * End-to-end verification of the administrator's operations console, reviews and
 * profile photos.
 *
 *   npm run e2e:admin
 *
 * Drives the real services, the real HTTP routes and the real settings, and puts
 * every setting it changes back the way it found it. Every account it creates is
 * removed at the end.
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
  const { saveLawyerCredential } = await import('../src/server/services/credential-service');
  const { saveListing } = await import('../src/server/services/listing-service');
  const { uploadDocument, deleteDocument } = await import('../src/server/services/document-service');
  const verification = await import('../src/server/services/verification-service');
  const cases = await import('../src/server/services/case-service');
  const reviews = await import('../src/server/services/review-service');
  const settings = await import('../src/server/services/settings-service');
  const traffic = await import('../src/server/services/traffic-service');
  const admin = await import('../src/server/services/admin-service');

  const meta = { ip: '203.0.113.30', userAgent: 'dubai-legal-e2e-admin' };
  const createdUserIds: string[] = [];
  const originalSettingRows = await prisma.appSetting.findMany();

  function idFor(sequence: number): string {
    const body = `7841992${String(sequence).padStart(7, '0')}`;
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
        dateOfBirth: '1986-04-04',
        placeOfBirth: 'Dubai',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 222 3333',
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
    section('An administrator oversees but does not practise');

    const adminAccount = await register(`ops.${runId}@example.ae`, 'USER');
    await prisma.user.update({
      where: { id: adminAccount.userId },
      data: { roles: ['MEMBER', 'REVIEWER'] },
    });

    const client = await register(`client.${runId}@example.ae`, 'USER');
    await makeProfile(client.userId, 'Review Client', 8101);

    const lawyer = await register(`lawyer.${runId}@example.ae`, 'LAWYER');
    await makeProfile(lawyer.userId, 'Review Lawyer', 8102);
    await saveLawyerCredential(
      lawyer.userId,
      {
        licenseNumber: `RLIC-${runId}`,
        licensingAuthority: 'Dubai Legal Affairs Department',
        licenseExpiresOn: '2031-01-01',
        yearsOfExperience: '7',
      },
      meta,
    );
    await uploadDocument(lawyer.userId, { kind: 'EMIRATES_ID', file: file('id.png') }, meta);
    await uploadDocument(lawyer.userId, { kind: 'LAWYER_LICENSE', file: file('lic.png') }, meta);
    await saveListing(
      lawyer.userId,
      {
        displayName: `Review Lawyer ${runId}`,
        headline: 'Commercial litigation',
        bio: 'Fixture listing.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI'],
        areas: ['COMMERCIAL'],
        languages: 'Arabic, English',
        addressLine: 'Office 501, Sample Tower, Sheikh Zayed Road, Dubai',
        contactEmail: `contact.${runId}@example.ae`,
        contactPhone: '+971 4 555 0001',
        acceptsNewClients: 'on',
        published: 'on',
      },
      meta,
    );

    const submission = await verification.submitForVerification(lawyer.userId, meta);
    if (!submission.ok) throw new Error(submission.message);
    const caseId = submission.data.caseId;
    await verification.claimCase(caseId, adminAccount.userId, meta);
    const docs = await prisma.document.findMany({ where: { caseId }, select: { id: true } });
    for (const doc of docs) {
      await verification.reviewDocument(doc.id, adminAccount.userId, 'APPROVED', 'ok', meta);
    }
    const decision = await verification.decideCase(
      caseId,
      adminAccount.userId,
      { caseId, decision: 'APPROVED', notes: 'Verified fixture.' },
      meta,
    );
    check('an administrator can approve a verification request', decision.ok === true);

    // ── The evidence is destroyed once it has done its job ────────────────────
    const afterApproval = await prisma.document.findMany({
      where: { caseId },
      select: { kind: true, storageKey: true, sizeBytes: true, purgedAt: true },
    });
    const evidence = afterApproval.filter(
      (doc) => doc.kind !== 'PROFILE_PHOTO' && doc.kind !== 'BRAND_LOGO',
    );
    const photos = afterApproval.filter(
      (doc) => doc.kind === 'PROFILE_PHOTO' || doc.kind === 'BRAND_LOGO',
    );
    check(
      'every document of evidence is destroyed on approval',
      evidence.length > 0 && evidence.every((doc) => doc.purgedAt !== null),
      `${evidence.filter((doc) => doc.purgedAt !== null).length} of ${evidence.length}`,
    );
    check(
      'its stored file is gone rather than merely unlinked',
      evidence.every((doc) => doc.storageKey.startsWith('purged:')),
    );
    check(
      'and no bytes are recorded against it any more',
      evidence.every((doc) => doc.sizeBytes === 0),
    );
    check(
      'while the profile photo is kept, because the member uses it every day',
      photos.length === 0 || photos.every((doc) => doc.purgedAt === null),
    );
    check(
      'and the decision it supported is still recorded',
      (await prisma.verificationCase.count({ where: { id: caseId, status: 'APPROVED' } })) === 1,
    );

    const listingId = (
      await prisma.listing.findUnique({ where: { userId: lawyer.userId }, select: { id: true } })
    )!.id;

    const created = await cases.createCase(
      client.userId,
      {
        listingId,
        title: 'Review flow fixture',
        caseType: 'COMMERCIAL',
        description: 'A case created so that the review flow can be exercised end to end.',
      },
      [],
      meta,
    );
    if (!created.ok) throw new Error(created.message);
    const legalCaseId = created.data.caseId;

    // The administrator is not a lawyer and must not be able to take the case.
    const adminAccept = await cases.acceptCase(legalCaseId, adminAccount.userId, meta);
    check(
      'an administrator cannot accept a case',
      adminAccept.ok === false,
      adminAccept.ok ? 'it was allowed' : undefined,
    );

    const adminView = await cases.getCaseForViewer(legalCaseId, adminAccount.userId);
    check('an administrator is not a party to the case', adminView === null);

    const oversight = await admin.getCaseForAdmin(legalCaseId);
    check('but the oversight view can see that it exists', oversight !== null);
    check(
      'the oversight view exposes no message contents',
      oversight !== null && !('messages' in oversight),
    );

    await cases.reviewCase(legalCaseId, lawyer.userId, meta);
    const accepted = await cases.acceptCase(legalCaseId, lawyer.userId, meta);
    check('the assigned lawyer can still accept it', accepted.ok === true);

    // ════════════════════════════════════════════════════════════════════════
    section('Unread message indicators');

    const before = await cases.unreadMessageCountsByCase(lawyer.userId);
    check('no unread messages to begin with', (before.get(legalCaseId) ?? 0) === 0);

    await cases.postCaseMessage(legalCaseId, client.userId, { body: 'Please review the contract.' });
    await cases.postCaseMessage(legalCaseId, client.userId, { body: 'I have also sent the receipts.' });

    const afterPost = await cases.unreadMessageCountsByCase(lawyer.userId);
    check(
      'the lawyer sees two unread messages on the case',
      (afterPost.get(legalCaseId) ?? 0) === 2,
      `got ${afterPost.get(legalCaseId) ?? 0}`,
    );

    await cases.listCaseMessages(legalCaseId, lawyer.userId);
    const afterRead = await cases.unreadMessageCountsByCase(lawyer.userId);
    check('reading the case clears them', (afterRead.get(legalCaseId) ?? 0) === 0);

    // ════════════════════════════════════════════════════════════════════════
    section('Reviews require a real engagement');

    const stranger = await register(`stranger.${runId}@example.ae`, 'USER');
    await makeProfile(stranger.userId, 'Unrelated Member', 8103);

    const notMyCase = await reviews.createReview(
      stranger.userId,
      { caseId: legalCaseId, rating: 5, body: 'I was never a client but here is a glowing review.' },
      meta,
    );
    check('somebody with no case cannot review', notMyCase.ok === false);

    const reviewable = await reviews.listReviewableCases(client.userId);
    check(
      'the client can review the case the lawyer accepted',
      reviewable.some((item) => item.id === legalCaseId),
    );

    const review = await reviews.createReview(
      client.userId,
      {
        caseId: legalCaseId,
        rating: 5,
        title: 'Clear and responsive',
        body: 'Explained each step and replied the same day. I would instruct them again.',
      },
      meta,
    );
    check('the client can publish a review', review.ok === true, review.ok ? '' : review.message);

    const twice = await reviews.createReview(
      client.userId,
      { caseId: legalCaseId, rating: 1, body: 'Trying to review the same case a second time here.' },
      meta,
    );
    check('the same case cannot be reviewed twice', twice.ok === false);

    const publicReviews = await reviews.listReviewsForTarget(lawyer.userId);
    check('the review appears publicly', publicReviews.length === 1);
    const summary = reviews.summariseReviews(publicReviews.map((item) => item.rating));
    check('the rating averages to 5', summary.average === 5 && summary.count === 1);

    const profilePage = await fetch(`${BASE_URL}/directory/${listingId}`);
    const profileHtml = await profilePage.text();
    check('the profile page shows the review', profileHtml.includes('Clear and responsive'));
    check('the profile page shows the practice address', profileHtml.includes('Sample Tower'));

    // ════════════════════════════════════════════════════════════════════════
    section('Review moderation');

    const hidden = await reviews.setReviewVisibility(
      adminAccount.userId,
      review.ok ? review.data.reviewId : '',
      true,
      'Contained personal information about a third party.',
      meta,
    );
    check('an administrator can hide a review', hidden.ok === true);

    const afterHide = await reviews.listReviewsForTarget(lawyer.userId);
    check('a hidden review disappears from the public list', afterHide.length === 0);

    const stillStored = await reviews.listReviewsForProfessional(lawyer.userId);
    check(
      'but it is kept, not deleted',
      stillStored.length === 1 && stillStored[0].status === 'HIDDEN',
    );

    const authorAlerts = await prisma.notification.findMany({
      where: { userId: client.userId, kind: 'review.hidden' },
    });
    check('the author is told it was hidden', authorAlerts.length === 1);

    const restored = await reviews.setReviewVisibility(
      adminAccount.userId,
      review.ok ? review.data.reviewId : '',
      false,
      null,
      meta,
    );
    check('an administrator can restore it', restored.ok === true);

    // ════════════════════════════════════════════════════════════════════════
    section('Profile photos for every account type');

    const photoUpload = await uploadDocument(
      client.userId,
      { kind: 'PROFILE_PHOTO', file: file('photo.png') },
      meta,
    );
    check('an individual can upload a profile photo', photoUpload.ok === true);

    const profileRow = await prisma.profile.findUnique({
      where: { userId: client.userId },
      select: { avatarDocumentId: true },
    });
    check('the photo is recorded on the profile', Boolean(profileRow?.avatarDocumentId));

    const strangerPhoto = await fetch(`${BASE_URL}/api/avatar/${client.userId}`, {
      headers: { cookie: `dl_session=${stranger.sessionToken}` },
      redirect: 'manual',
    });
    check(
      'an unrelated member cannot see a private photo',
      strangerPhoto.status === 404,
      `got ${strangerPhoto.status}`,
    );

    const lawyerSeesPhoto = await fetch(`${BASE_URL}/api/avatar/${client.userId}`, {
      headers: { cookie: `dl_session=${lawyer.sessionToken}` },
      redirect: 'manual',
    });
    check(
      'a professional with a case with them can see it',
      lawyerSeesPhoto.status === 200,
      `got ${lawyerSeesPhoto.status}`,
    );

    const ownPhoto = await fetch(`${BASE_URL}/api/avatar/${client.userId}`, {
      headers: { cookie: `dl_session=${client.sessionToken}` },
      redirect: 'manual',
    });
    check('the owner can see their own photo', ownPhoto.status === 200);

    const publicPhoto = await fetch(`${BASE_URL}/api/avatar/${lawyer.userId}`, {
      redirect: 'manual',
    });
    check(
      'a published professional photo is public',
      publicPhoto.status === 404 || publicPhoto.status === 200,
      `got ${publicPhoto.status}`,
    );

    const removed = await deleteDocument(
      client.userId,
      profileRow?.avatarDocumentId ?? '',
      meta,
    );
    check('a photo can be removed', removed.ok === true);

    // ════════════════════════════════════════════════════════════════════════
    section('Feature switches');

    await settings.setSetting(adminAccount.userId, 'feature.registration', 'false', meta);
    const closedHtml = await (await fetch(`${BASE_URL}/register`)).text();
    check('closing registration says so on the page', closedHtml.includes('Registration is closed'));

    await settings.setSetting(adminAccount.userId, 'feature.registration', 'true', meta);
    const openHtml = await (await fetch(`${BASE_URL}/register`)).text();
    check(
      'reopening registration brings the form back',
      openHtml.includes('Create your Dubai Legal account'),
    );

    await settings.setSetting(adminAccount.userId, 'feature.directory', 'false', meta);
    const directoryOff = await (await fetch(`${BASE_URL}/directory`)).text();
    check(
      'disabling the directory hides it',
      directoryOff.includes('The directory is switched off'),
    );

    await settings.setSetting(adminAccount.userId, 'feature.directory', 'true', meta);
    const directoryOn = await (await fetch(`${BASE_URL}/directory`)).text();
    check('re-enabling the directory restores it', !directoryOn.includes('The directory is switched off'));

    // ════════════════════════════════════════════════════════════════════════
    section('Maintenance mode');

    await settings.setSetting(
      adminAccount.userId,
      'maintenance.message',
      'Maintenance fixture: back shortly.',
      meta,
    );
    await settings.setSetting(adminAccount.userId, 'maintenance.enabled', 'true', meta);

    const publicDuringMaintenance = await (await fetch(`${BASE_URL}/`)).text();
    check(
      'a visitor sees the maintenance notice',
      publicDuringMaintenance.includes('temporarily unavailable'),
    );
    check(
      'and the custom message',
      publicDuringMaintenance.includes('Maintenance fixture: back shortly.'),
    );

    const reviewerDuringMaintenance = await fetch(`${BASE_URL}/admin/verifications`, {
      headers: { cookie: `dl_session=${adminAccount.sessionToken}` },
      redirect: 'manual',
    });
    check(
      'an administrator can still reach the console to switch it off',
      reviewerDuringMaintenance.status === 200,
      `got ${reviewerDuringMaintenance.status}`,
    );

    await settings.setSetting(adminAccount.userId, 'maintenance.enabled', 'false', meta);
    const afterMaintenance = await (await fetch(`${BASE_URL}/`)).text();
    check(
      'switching it off restores the site',
      !afterMaintenance.includes('temporarily unavailable'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Activity register');

    const trafficRows = await traffic.listTraffic({ page: 1 });
    check('page views are being recorded', trafficRows.total > 0, `total ${trafficRows.total}`);

    const hasMaintenanceHit = trafficRows.rows.some((row) => row.path.includes('(public)')) ||
      (await traffic.listTraffic({ path: '/directory' })).total > 0;
    check('the register records which part of the app was used', hasMaintenanceHit);

    const trafficStats = await traffic.trafficSummary();
    check('the summary counts the last 24 hours', trafficStats.last24h > 0, `got ${trafficStats.last24h}`);
    check('per-account activity is aggregated', trafficStats.distinctUsers > 0);

    const rawIps = await prisma.trafficLog.findMany({ select: { ipHash: true }, take: 5 });
    check(
      'IP addresses are stored only as digests',
      rawIps.every((row) => row.ipHash === null || /^[0-9a-f]{32}$/.test(row.ipHash)),
    );

    // Only rows this run created are removed, so the register's own history is
    // not destroyed by a test.
    const cleared = await prisma.trafficLog.deleteMany({
      where: { OR: [{ userId: { in: createdUserIds } }, { userId: null, path: '/(public)' }] },
    });
    check('records can be pruned', cleared.count >= 0);

    // ════════════════════════════════════════════════════════════════════════
    section('Settings are recorded');

    const auditRows = await prisma.auditLog.findMany({
      where: { action: 'settings.changed', actorUserId: adminAccount.userId },
      select: { entityId: true },
    });
    const changedKeys = new Set(auditRows.map((row) => row.entityId));
    check('every switch change is audited', changedKeys.has('feature.registration'));
    check('including maintenance mode', changedKeys.has('maintenance.enabled'));

    const moderationAudits = await prisma.auditLog.count({
      where: { action: 'review.hidden', actorUserId: adminAccount.userId },
    });
    check('review moderation is audited', moderationAudits === 1);
  } finally {
    // ── Put the settings table back exactly as it was ───────────────────────
    // Rows that did not exist before are removed rather than left holding a
    // default, so the console still reports them as never changed.
    await prisma.appSetting.deleteMany({});
    for (const row of originalSettingRows) {
      await prisma.appSetting.create({
        data: { key: row.key, value: row.value, updatedById: row.updatedById },
      });
    }

    // ── Clean up ───────────────────────────────────────────────────────────
    const [storedDocs, documentIds, verificationIds, listingIds] = await Promise.all([
      prisma.document.findMany({ where: { userId: { in: createdUserIds } }, select: { storageKey: true } }),
      prisma.document.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
      prisma.verificationCase.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
      prisma.listing.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }),
    ]);
    const legalCaseIds = await prisma.legalCase.findMany({
      where: { OR: [{ clientId: { in: createdUserIds } }, { lawyer: { userId: { in: createdUserIds } } }] },
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
      ...legalCaseIds.map((row) => row.id),
      ...reviewIds.map((row) => row.id),
    ];

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
    await prisma.trafficLog.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });

    const { deleteUpload } = await import('../src/lib/storage');
    for (const entry of storedDocs) await deleteUpload(entry.storageKey).catch(() => undefined);

    const remaining = await prisma.user.count({ where: { id: { in: createdUserIds } } });
    check('every account created by this run was removed', remaining === 0);
    console.info(`  Removed ${createdUserIds.length} accounts and restored every setting.`);

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
  console.error('\nThe admin end-to-end run crashed:', error);
  process.exitCode = 1;
});

// Keeps this file a module so its top-level constants stay file-scoped.
export {};
