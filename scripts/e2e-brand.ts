/**
 * End-to-end verification of the branding round:
 *
 *   · the supplied mark is shipped as a real SVG and transparent PNG, and is what
 *     the interface actually shows;
 *   · it appears in the chat, on every receipt, on the emergency pages and in the
 *     conference rooms;
 *   · a lawyer or firm can put their own letterhead on their receipts, or stay on
 *     the standard one, and the platform mark is on the receipt either way;
 *   · an administrator's letterhead is the platform one and cannot be changed;
 *   · an administrator can still update their profile, password and two-factor,
 *     exactly as any other account can.
 *
 *   npm run e2e:brand
 *
 * Every account it creates is removed at the end, and every file it stores.
 */

process.loadEnvFile('.env');

import { readFile } from 'node:fs/promises';
import path from 'node:path';

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
  const { addDaysToKey, todayKey } = await import('../src/lib/time');
  const auth = await import('../src/server/services/auth-service');
  const { updateProfile } = await import('../src/server/services/profile-service');
  const { saveLawyerCredential } = await import('../src/server/services/credential-service');
  const { saveListing } = await import('../src/server/services/listing-service');
  const { uploadDocument } = await import('../src/server/services/document-service');
  const verification = await import('../src/server/services/verification-service');
  const cases = await import('../src/server/services/case-service');
  const payments = await import('../src/server/services/payment-service');
  const receiptTemplates = await import('../src/server/services/receipt-template-service');
  const twoFactor = await import('../src/server/services/two-factor-service');

  const runStartedAt = new Date();
  const meta = { ip: '203.0.118.10', userAgent: 'dubai-legal-e2e-brand' };
  let registrationIndex = 0;
  const createdUserIds: string[] = [];

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  );
  const file = (name: string) => new File([new Uint8Array(png)], name, { type: 'image/png' });

  function idFor(sequence: number): string {
    return `7841993${String(sequence).padStart(7, '0')}1`;
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
      { ...meta, ip: `203.0.118.${100 + registrationIndex}` },
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
        dateOfBirth: '1987-07-07',
        placeOfBirth: 'Dubai',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 888 2020',
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

  /** The markup only: Next streams the component tree as data as well as HTML. */
  function markup(page: string): string {
    return page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  }

  try {
    // ════════════════════════════════════════════════════════════════════════
    section('The supplied mark is shipped as real vector art');

    const svg = await readFile(path.resolve('public/logo.svg'), 'utf8');
    check('public/logo.svg exists and is well formed', svg.startsWith('<svg') && svg.includes('</svg>'));
    check('it is vector art, not an image in a wrapper', svg.includes('<path') && !svg.includes('<image'));
    check('it has a viewBox, so it scales', /viewBox="0 0 \d+ \d+"/.test(svg));
    check('it carries the navy of the artwork', svg.toUpperCase().includes('#132E4C'));
    check('and the gold', svg.toUpperCase().includes('#BE974A'));
    check('no plate or circle is drawn behind it', !svg.includes('<circle') && !svg.includes('<rect'));
    check('it is small enough to sit in a header', svg.length < 200_000, `${svg.length} bytes`);

    for (const asset of [
      'public/logo.png',
      'public/logo-mark.png',
      'public/icon-192.png',
      'public/icon-512.png',
      'public/apple-touch-icon.png',
      'src/app/icon.png',
    ]) {
      const bytes = await readFile(path.resolve(asset)).catch(() => null);
      check(`${asset} exists`, bytes !== null && bytes.length > 0);
      check(
        `${asset} is a PNG`,
        bytes !== null && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
      );
    }

    check('the mark is served', (await get('/logo.svg')).status === 200);
    check('so are the icons', (await get('/icon-192.png')).status === 200);
    check('and the browser icon', (await get('/icon.png')).status === 200);

    const transparent = await readFile(path.resolve('public/logo.png'));
    check(
      'the transparent mark is small enough to load on every page',
      transparent.length < 40_000,
      `${transparent.length} bytes`,
    );

    // ════════════════════════════════════════════════════════════════════════
    section('The mark is what the interface shows');

    const landing = markup(await html('/'));
    check('the landing page shows the mark', landing.includes('/logo.svg'));
    check('with the product name beside it', landing.includes('Dubai<span'));

    const admin = await register(`brand.admin.${runId}@example.ae`, 'USER');
    await makeProfile(admin.userId, 'Brand Reviewer', 8101);
    await prisma.user.update({
      where: { id: admin.userId },
      data: { roles: ['MEMBER', 'REVIEWER'], verificationStatus: 'APPROVED' },
    });

    const lawyer = await register(`brand.lawyer.${runId}@example.ae`, 'LAWYER');
    await makeProfile(lawyer.userId, 'Brand Lawyer', 8102);
    await saveLawyerCredential(
      lawyer.userId,
      {
        licenseNumber: `BRD-${runId}`,
        licensingAuthority: 'Dubai Legal Affairs Department',
        licenseExpiresOn: '2032-01-01',
        yearsOfExperience: '8',
        bankAccountName: 'Brand Lawyer',
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
        displayName: 'Brand Lawyer',
        headline: 'Commercial work',
        bio: 'Fixture listing for the branding suite.',
        primaryEmirate: 'DUBAI',
        emirates: ['DUBAI'],
        areas: ['COMMERCIAL'],
        languages: 'Arabic, English',
        acceptsNewClients: 'on',
        published: 'on',
      },
      meta,
    );
    const submission = await verification.submitForVerification(lawyer.userId, meta);
    if (!submission.ok) throw new Error(submission.message);
    await verification.claimCase(submission.data.caseId, admin.userId, meta);
    for (const doc of await prisma.document.findMany({
      where: { caseId: submission.data.caseId },
      select: { id: true },
    })) {
      await verification.reviewDocument(doc.id, admin.userId, 'APPROVED', 'ok', meta);
    }
    await verification.decideCase(
      submission.data.caseId,
      admin.userId,
      { caseId: submission.data.caseId, decision: 'APPROVED', notes: 'Brand fixture.' },
      meta,
    );

    const client = await register(`brand.client.${runId}@example.ae`, 'USER');
    await makeProfile(client.userId, 'Brand Client', 8103);

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
        title: 'Branding suite case',
        caseType: 'COMMERCIAL',
        description: 'A case opened so a receipt exists to look at.',
      },
      [],
      meta,
    );
    if (!opened.ok) throw new Error(opened.message);
    const caseId = opened.data.caseId;
    await cases.reviewCase(caseId, lawyer.userId, meta);
    await cases.acceptCase(caseId, lawyer.userId, meta);

    const fee = await payments.requestPayment(
      lawyer.userId,
      { caseId, amountAed: 1250, purpose: 'CONSULTATION', details: 'Initial review.' },
      meta,
    );
    if (!fee.ok) throw new Error(fee.message);
    const paid = await payments.recordBankTransfer(
      client.userId,
      { paymentId: fee.data.paymentId, reference: `BRD-REF-${runId}` },
      meta,
    );
    check('a fee can be paid so a receipt exists', paid.ok === true, paid.ok ? '' : paid.message);

    const chatHtml = markup(await html(`/cases/${caseId}`, client.sessionToken));
    check('the conversation carries the mark', chatHtml.includes('/logo.svg'));
    check(
      'and says who the conversation is between',
      chatHtml.includes('private to the two parties on this case'),
    );

    const emergencyPublic = markup(await html('/emergency'));
    check('the public emergency page carries the mark', emergencyPublic.includes('/logo.svg'));
    check(
      'above the headline rather than buried',
      emergencyPublic.indexOf('/logo.svg') < emergencyPublic.indexOf('Get a lawyer on video now'),
    );

    const deskHtml = markup(await html('/emergency/desk', lawyer.sessionToken));
    check('so does the professional emergency desk', deskHtml.includes('/logo.svg'));

    // ════════════════════════════════════════════════════════════════════════
    section('A new account starts on the standard receipt layout');

    const before = await receiptTemplates.getReceiptTemplate(lawyer.userId);
    check('a new professional has no template of their own', before === null);

    const standard = await receiptTemplates.receiptPresentationForPayment({
      requestedById: lawyer.userId,
      case: { firm: null, lawyer: { licenseNumber: 'X', licensingAuthority: 'Y' } },
      requestedBy: { email: lawyer.email, profile: { fullName: 'Brand Lawyer' } },
    });
    check('so their receipts use the standard layout', standard.mode === 'STANDARD');
    check('with the platform mark', standard.logoUrl === '/logo.svg');
    check('and the platform name', standard.brandName === 'Dubai Legal');

    const standardReceipt = markup(
      await html(`/payments/${fee.data.paymentId}/receipt`, client.sessionToken),
    );
    check('the receipt shows the mark', standardReceipt.includes('/logo.svg'));
    check('and the platform lockup', standardReceipt.includes('Lawyers and legal firms of the United Arab Emirates'));
    check('and says the payment was simulated', standardReceipt.includes('Simulated payment'));
    check('and offers the printable receipt', standardReceipt.includes('Download receipt as PDF'));
    check(
      'the receipt is reachable from the conversation',
      chatHtml.includes('View or print the receipt'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('A lawyer or firm can have their own letterhead');

    const rejectsBadColour = await receiptTemplates.saveReceiptTemplate(
      lawyer.userId,
      { layout: 'CUSTOM', brandName: 'Rahman Legal', accentColor: 'not-a-colour' },
      null,
      meta,
    );
    check('a colour that is not a hex value is refused', rejectsBadColour.ok === false);

    const rejectsNameless = await receiptTemplates.saveReceiptTemplate(
      lawyer.userId,
      { layout: 'CUSTOM', brandName: '   ' },
      null,
      meta,
    );
    check('a custom layout without a name is refused', rejectsNameless.ok === false);

    const saved = await receiptTemplates.saveReceiptTemplate(
      lawyer.userId,
      {
        layout: 'CUSTOM',
        brandName: 'Rahman Legal Consultancy',
        headerLine: 'Advocates and legal consultants',
        footerNote: 'Queries: billing@example.ae',
        accentColor: '#0F3D5C',
        showLicence: true,
        showFirm: false,
        showContact: true,
      },
      file('mark.png'),
      meta,
    );
    check('a lawyer can save their own letterhead', saved.ok === true, saved.ok ? '' : saved.message);

    const stored = await receiptTemplates.getReceiptTemplate(lawyer.userId);
    check('the layout is recorded as custom', stored?.layout === 'CUSTOM');
    check('with the name they chose', stored?.brandName === 'Rahman Legal Consultancy');
    check('and their mark', Boolean(stored?.logoDocumentId));

    const markDocument = await prisma.document.findUnique({
      where: { id: stored!.logoDocumentId! },
      select: { kind: true, userId: true, status: true },
    });
    check('the mark is stored as a brand logo', markDocument?.kind === 'BRAND_LOGO');
    check('against the account that uploaded it', markDocument?.userId === lawyer.userId);

    const overview = await verification.getVerificationOverview(lawyer.userId);
    check(
      'a billing mark is not treated as verification evidence',
      (overview?.documents ?? []).every((doc) => doc.kind !== 'BRAND_LOGO'),
    );

    // The client holding the receipt has to be able to load the mark.
    const markForClient = await get(`/api/documents/${stored!.logoDocumentId}`, client.sessionToken);
    check('the client can load the mark on their receipt', markForClient.status === 200, `got ${markForClient.status}`);
    check(
      'and it is served as an image',
      (markForClient.headers.get('content-type') ?? '').startsWith('image/'),
    );

    // …but that must not have opened up identity documents.
    const identity = await prisma.document.findFirst({
      where: { userId: lawyer.userId, kind: 'EMIRATES_ID' },
      select: { id: true },
    });
    const identityForClient = await get(`/api/documents/${identity!.id}`, client.sessionToken);
    check(
      'the client still cannot read the lawyer’s Emirates ID',
      identityForClient.status === 404,
      `got ${identityForClient.status}`,
    );

    const custom = await receiptTemplates.receiptPresentationForPayment({
      requestedById: lawyer.userId,
      case: { firm: null, lawyer: { licenseNumber: 'BRD-1', licensingAuthority: 'DLAD' } },
      requestedBy: { email: lawyer.email, profile: { fullName: 'Brand Lawyer' } },
    });
    check('the receipt switches to the custom layout', custom.mode === 'CUSTOM');
    check('with their name', custom.brandName === 'Rahman Legal Consultancy');
    check('their colour', custom.accentColor === '#0F3D5C');
    check('their mark', custom.logoUrl === `/api/documents/${stored!.logoDocumentId}`);
    check('and their own decision on what to show', custom.showFirm === false && custom.showContact === true);

    const customReceipt = markup(
      await html(`/payments/${fee.data.paymentId}/receipt`, client.sessionToken),
    );
    check('the printed receipt carries their letterhead', customReceipt.includes('Rahman Legal Consultancy'));
    check('and their strapline', customReceipt.includes('Advocates and legal consultants'));
    check('and their colour', customReceipt.includes('#0F3D5C'));
    check('and their footer note', customReceipt.includes('billing@example.ae'));
    check(
      'the platform mark stays on the receipt, at the foot',
      customReceipt.includes('/logo.svg') && customReceipt.includes('Issued through Dubai Legal'),
    );

    const lawyerSeesSame = markup(
      await html(`/payments/${fee.data.paymentId}/receipt`, lawyer.sessionToken),
    );
    check('the professional sees the same receipt', lawyerSeesSame.includes('Rahman Legal Consultancy'));

    const templatePage = await get('/receipt-template', lawyer.sessionToken);
    const templateHtml = await templatePage.text();
    check('the layout page opens for a professional', templatePage.status === 200, `got ${templatePage.status}`);
    check(
      'and offers both choices',
      templateHtml.includes('The standard Dubai Legal layout') && templateHtml.includes('My own letterhead'),
    );

    const postPage = await get('/payments', lawyer.sessionToken);
    check('the fees page opens', postPage.status === 200, `got ${postPage.status}`);
    check('and links the receipt layout', (await postPage.text()).includes('/receipt-template'));

    const replacedFrom = await receiptTemplates.saveReceiptTemplate(
      lawyer.userId,
      { layout: 'CUSTOM', brandName: 'Rahman Legal', accentColor: '#0F3D5C', showLicence: true },
      file('mark2.png'),
      meta,
    );
    check('the mark can be replaced', replacedFrom.ok === true);
    const afterReplace = await prisma.receiptTemplate.findUnique({
      where: { userId: lawyer.userId },
      select: { logoDocumentId: true },
    });
    check('and the new one is what is used', afterReplace?.logoDocumentId !== stored!.logoDocumentId);
    check(
      'the replaced mark is no longer on file',
      (await prisma.document.findUnique({
        where: { id: stored!.logoDocumentId! },
        select: { id: true },
      })) === null,
    );

    const reset = await receiptTemplates.resetReceiptTemplate(lawyer.userId, meta);
    check('the account can go back to the standard layout', reset.ok === true);
    check(
      'and the template row is gone',
      (await prisma.receiptTemplate.findUnique({ where: { userId: lawyer.userId } })) === null,
    );
    const backToStandard = await receiptTemplates.receiptPresentationForPayment({
      requestedById: lawyer.userId,
      case: { firm: null, lawyer: { licenseNumber: 'X', licensingAuthority: 'Y' } },
      requestedBy: { email: lawyer.email, profile: { fullName: 'Brand Lawyer' } },
    });
    check('which is what the receipt uses again', backToStandard.mode === 'STANDARD');

    // ════════════════════════════════════════════════════════════════════════
    section('The administrator’s letterhead is the platform one, and is fixed');

    const adminRefused = await receiptTemplates.saveReceiptTemplate(
      admin.userId,
      { layout: 'CUSTOM', brandName: 'Reviewer Legal' },
      file('admin-mark.png'),
      meta,
    );
    check('an administrator cannot set a receipt layout', adminRefused.ok === false);
    check(
      'with a message that says why',
      (adminRefused.ok === false ? adminRefused.message : '').includes('cannot be changed'),
    );
    check(
      'and nothing was written',
      (await prisma.receiptTemplate.findUnique({ where: { userId: admin.userId } })) === null,
    );

    const adminTemplatePage = await get('/receipt-template', admin.sessionToken);
    check(
      'the layout page is not offered to an administrator',
      adminTemplatePage.status >= 300 && adminTemplatePage.status < 400,
      `got ${adminTemplatePage.status}`,
    );

    // ════════════════════════════════════════════════════════════════════════
    section('An administrator’s own account works like anybody else’s');

    const adminProfile = await get('/profile', admin.sessionToken);
    const adminProfileHtml = await adminProfile.text();
    check('an administrator can open their profile', adminProfile.status === 200, `got ${adminProfile.status}`);
    check('and the form is there to use', adminProfileHtml.includes('Full name'));

    const adminAccount = await get('/account', admin.sessionToken);
    const adminAccountHtml = await adminAccount.text();
    check('they can open account and security', adminAccount.status === 200, `got ${adminAccount.status}`);
    check('with the password form', adminAccountHtml.includes('Current password'));
    check('and the two-factor control', adminAccountHtml.includes('Two-factor'));

    const updated = await updateProfile(
      admin.userId,
      {
        fullName: 'Brand Reviewer Updated',
        dateOfBirth: '1987-07-07',
        placeOfBirth: 'Dubai',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 888 2021',
        emiratesIdNumber: idFor(8101),
        emiratesIdExpiry: '2034-01-01',
        workDescription: 'Updated by the operator.',
        educationBackground: 'Updated by the operator.',
      },
      meta,
    );
    check('an administrator can update their own profile', updated.ok === true, updated.ok ? '' : updated.message);

    const changed = await auth.changePassword(
      admin.userId,
      {
        currentPassword: 'CorrectHorse9Battery',
        password: 'CorrectHorse9Battery2',
        confirmPassword: 'CorrectHorse9Battery2',
      },
      meta,
      null,
    );
    check('an administrator can change their password', changed.ok === true, changed.ok ? '' : changed.message);

    const enrolment = await twoFactor.beginEnrolment(admin.userId);
    check(
      'an administrator can begin two-factor enrolment',
      enrolment.ok === true && enrolment.data.secret.length >= 16,
      enrolment.ok ? '' : enrolment.message,
    );
    check(
      'and is given what they need to set the app up',
      enrolment.ok === true && enrolment.data.qrDataUrl.startsWith('data:image/png'),
    );

    // Changing a password signs the other sessions out, so the operator signs in
    // again — and then the console has to offer the way to their own account, or
    // the pages may as well not exist.
    check(
      'changing the password signed the old session out',
      (await get('/admin/verifications', admin.sessionToken)).status !== 200,
    );

    const { createSession } = await import('../src/lib/auth');
    const freshToken = (await createSession(admin.userId, meta)).token;
    const consoleHtml = markup(await html('/admin/verifications', freshToken));
    check('the console links their own details', consoleHtml.includes('/profile'));
    check('and their account and security', consoleHtml.includes('/account'));

    // ════════════════════════════════════════════════════════════════════════
    section('Clean up');

    const storedDocuments = await prisma.document.findMany({
      where: { userId: { in: createdUserIds } },
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
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });

    const { deleteUpload } = await import('../src/lib/storage');
    for (const row of [...storedDocuments, ...caseFiles]) {
      await deleteUpload(row.storageKey).catch(() => undefined);
    }

    check(
      'every account created by this run was removed',
      (await prisma.user.count({ where: { id: { in: createdUserIds } } })) === 0,
    );
    check(
      'and every billing mark with them',
      (await prisma.document.count({ where: { kind: 'BRAND_LOGO' } })) === 0,
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
  console.error('\nThe branding end-to-end run crashed:', error);
  process.exitCode = 1;
});

export {};
