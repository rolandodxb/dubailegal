/**
 * Take pictures of the product, so a change can be looked at rather than
 * imagined.
 *
 *   npm run shots                    every page, three widths
 *   npm run shots -- receipt room     only pages whose name matches
 *   npm run shots -- --keep           leave the fixture accounts behind
 *
 * It builds a throwaway installation's worth of content — a verified lawyer and
 * firm, a client with a case, a booked meeting, a paid fee with its receipt, an
 * urgent call room, a support ticket and an emergency request — then fetches each
 * page as the right account, and hands the saved HTML to headless Chrome.
 *
 * The HTML is saved with a <base> pointing at the running app, so the stylesheet,
 * the mark and the fonts all load exactly as they would in a browser. Output goes
 * to `var/shots/`.
 *
 * This is a development tool. It is not part of the application, it is never
 * imported by it, and it refuses to run when NODE_ENV is production.
 */

process.loadEnvFile('.env');

import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const BASE_URL = process.env.APP_URL ?? 'http://localhost:3100';
const OUT_DIR = path.resolve('var/shots');
const CHROME = process.env.CHROME_PATH ?? 'google-chrome';

/** A phone, a tablet and a laptop. */
const WIDTHS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1280, height: 900 },
];

type Shot = {
  name: string;
  path: string;
  /** Which signed-in account to fetch as. */
  as: 'client' | 'lawyer' | 'firm' | 'admin' | 'guest';
  /** Resolved once the fixtures exist. */
  resolve?: (ids: Ids) => string;
};

type Ids = {
  clientToken: string;
  lawyerToken: string;
  firmToken: string;
  adminToken: string;
  caseId: string;
  paymentId: string;
  receiptPaymentId: string;
  ticketId: string;
  roomCode: string;
  listingId: string;
  postId: string;
  pendingPostId: string;
};

const SHOTS: Shot[] = [
  { name: 'landing', path: '/', as: 'guest' },
  { name: 'directory', path: '/directory', as: 'guest' },
  { name: 'emergency-public', path: '/emergency', as: 'guest' },
  { name: 'how-verification-works', path: '/how-verification-works', as: 'guest' },
  { name: 'login', path: '/login', as: 'guest' },
  { name: 'register', path: '/register', as: 'guest' },
  { name: 'dashboard-client', path: '/dashboard', as: 'client' },
  { name: 'case-chat', path: '', as: 'client', resolve: (ids) => `/cases/${ids.caseId}` },
  { name: 'payments-client', path: '/payments', as: 'client' },
  { name: 'receipt', path: '', as: 'client', resolve: (ids) => `/payments/${ids.receiptPaymentId}/receipt` },
  { name: 'pay-transfer', path: '', as: 'client', resolve: (ids) => `/payments/${ids.paymentId}/pay` },
  {
    name: 'pay-card',
    path: '',
    as: 'client',
    resolve: (ids) => `/payments/${ids.paymentId}/pay?method=card`,
  },
  { name: 'rooms-client', path: '/rooms', as: 'client' },
  { name: 'support-client', path: '/support', as: 'client' },
  { name: 'support-ticket', path: '', as: 'client', resolve: (ids) => `/support?ticket=${ids.ticketId}` },
  { name: 'landing-community', path: '/?tab=community', as: 'guest' },
  {
    name: 'landing-community-joined',
    path: '/?tab=community',
    as: 'client',
  },
  { name: 'community', path: '/blog', as: 'client' },
  { name: 'community-board', path: '/blog?topic=LABOUR_EMPLOYMENT', as: 'guest' },
  { name: 'community-post', path: '', as: 'client', resolve: (ids) => `/blog/${ids.postId}` },
  { name: 'admin-community', path: '/admin/blog', as: 'admin' },
  {
    name: 'admin-community-review',
    path: '',
    as: 'admin',
    resolve: (ids) => `/admin/blog/${ids.pendingPostId}`,
  },
  { name: 'profile-page', path: '', as: 'guest', resolve: (ids) => `/directory/${ids.listingId}` },
  { name: 'profile-about', path: '', as: 'guest', resolve: (ids) => `/directory/${ids.listingId}?tab=about` },
  { name: 'calendar', path: '/calendar?view=day', as: 'lawyer' },
  { name: 'portfolio', path: '/portfolio', as: 'lawyer' },
  { name: 'receipt-template', path: '/receipt-template', as: 'lawyer' },
  { name: 'rooms-lawyer', path: '/rooms', as: 'lawyer' },
  { name: 'emergency-desk', path: '/emergency/desk', as: 'lawyer' },
  { name: 'firm-lawyers', path: '/firm/lawyers', as: 'firm' },
  { name: 'firm-calendar', path: '/calendar?view=day', as: 'firm' },
  { name: 'admin-verifications', path: '/admin/verifications', as: 'admin' },
  { name: 'admin-support', path: '/admin/support', as: 'admin' },
  { name: 'admin-support-ticket', path: '', as: 'admin', resolve: (ids) => `/admin/support/${ids.ticketId}` },
  { name: 'admin-settings', path: '/admin/settings', as: 'admin' },
  { name: 'admin-profile', path: '/profile', as: 'admin' },
  { name: 'admin-account', path: '/account', as: 'admin' },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The screenshot tool is a development utility and will not run in production.');
  }

  const filters = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const keep = process.argv.includes('--keep');
  /** One tall capture per page, so a long page can be read in a single picture. */
  const tall = process.argv.includes('--tall');
  /** Leave the fixtures on the standard receipt layout instead of a custom one. */
  const standardLayout = process.argv.includes('--standard');

  const { prisma } = await import('../src/lib/db');
  const { createSession } = await import('../src/lib/auth');
  const auth = await import('../src/server/services/auth-service');
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
  const support = await import('../src/server/services/support-service');
  const receiptTemplates = await import('../src/server/services/receipt-template-service');
  const { addDaysToKey, todayKey } = await import('../src/lib/time');

  const stamp = Date.now().toString(36);
  /** The moment the fixtures started, so test alerts can be told from real ones. */
  const startedAt = new Date();
  const meta = { ip: '203.0.117.10', userAgent: 'dubai-legal-shots' };
  const created: string[] = [];

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  );
  const file = (name: string) => new File([new Uint8Array(png)], name, { type: 'image/png' });

  async function account(email: string, type: 'USER' | 'LAWYER' | 'FIRM') {
    const result = await auth.registerAccount(
      {
        accountType: type,
        email,
        password: 'CorrectHorse9Battery',
        confirmPassword: 'CorrectHorse9Battery',
        acceptTerms: 'on',
      },
      { ...meta, ip: `203.0.117.${20 + created.length}` },
    );
    if (!result.ok) throw new Error(result.message);
    created.push(result.data.userId);
    return result.data.userId;
  }

  async function profile(userId: string, name: string, sequence: number) {
    const result = await updateProfile(
      userId,
      {
        fullName: name,
        dateOfBirth: '1989-04-04',
        placeOfBirth: 'Dubai',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 777 1234',
        emiratesIdNumber: `7841994${String(sequence).padStart(7, '0')}1`,
        emiratesIdExpiry: '2034-01-01',
        workDescription: 'Screenshot fixture.',
        educationBackground: 'Screenshot fixture.',
      },
      meta,
    );
    if (!result.ok) throw new Error(`profile ${name}: ${result.message}`);
  }

  async function token(userId: string) {
    return (await createSession(userId, meta)).token;
  }

  console.info('Building fixtures…');

  try {
  const adminId = await account(`shots.admin.${stamp}@example.ae`, 'USER');
  await prisma.user.update({
    where: { id: adminId },
    data: { roles: ['MEMBER', 'REVIEWER'], verificationStatus: 'APPROVED' },
  });
  await profile(adminId, 'Amira Haddad', 1);

  const clientId = await account(`shots.client.${stamp}@example.ae`, 'USER');
  await profile(clientId, 'Yousef Al Marri', 2);

  const lawyerId = await account(`shots.lawyer.${stamp}@example.ae`, 'LAWYER');
  await profile(lawyerId, 'Nadia Rahman', 3);
  await saveLawyerCredential(
    lawyerId,
    {
      licenseNumber: 'DIFC-ADV-4412',
      licensingAuthority: 'Dubai Legal Affairs Department',
      licenseExpiresOn: '2032-06-30',
      yearsOfExperience: '12',
      // A fee is paid by bank transfer, so the fixture practice banks somewhere.
      bankAccountName: 'Rahman Legal Consultancy FZ-LLC',
      bankName: 'Emirates NBD',
      bankIban: 'AE070331234567890123456',
      bankSwift: 'EBILAEAD',
      bankBranch: 'Business Bay',
      bankInstructions: 'Quote the case reference as the transfer reference.',
    },
    meta,
  );
  await uploadDocument(lawyerId, { kind: 'EMIRATES_ID', file: file('id.png') }, meta);
  await uploadDocument(lawyerId, { kind: 'LAWYER_LICENSE', file: file('licence.png') }, meta);
  await saveListing(
    lawyerId,
    {
      displayName: 'Nadia Rahman',
      headline: 'Commercial litigation and arbitration',
      bio: 'Twelve years appearing before the UAE courts and in DIFC arbitration.',
      primaryEmirate: 'DUBAI',
      emirates: ['DUBAI', 'SHARJAH'],
      areas: ['COMMERCIAL', 'ARBITRATION', 'LABOUR_EMPLOYMENT'],
      languages: 'Arabic, English, French',
      acceptsNewClients: 'on',
      published: 'on',
    },
    meta,
  );
  const submission = await verification.submitForVerification(lawyerId, meta);
  if (!submission.ok) throw new Error(submission.message);
  await verification.claimCase(submission.data.caseId, adminId, meta);
  for (const doc of await prisma.document.findMany({
    where: { caseId: submission.data.caseId },
    select: { id: true },
  })) {
    await verification.reviewDocument(doc.id, adminId, 'APPROVED', 'Looks complete.', meta);
  }
  await verification.decideCase(
    submission.data.caseId,
    adminId,
    { caseId: submission.data.caseId, decision: 'APPROVED', notes: 'Documents in order.' },
    meta,
  );

  const firmId = await account(`shots.firm.${stamp}@example.ae`, 'FIRM');
  await profile(firmId, 'Tariq Bin Sultan', 4);
  await saveFirmCredential(
    firmId,
    {
      legalName: 'Bin Sultan & Partners',
      tradeLicenseNumber: 'DED-889412',
      tradeLicenseAuthority: 'Dubai Economy and Tourism',
      tradeLicenseExpiresOn: '2031-03-31',
      registeredEmirate: 'DUBAI',
      registeredAddress: 'Office 1804, Emirates Towers, Sheikh Zayed Road, Dubai',
      authorisedSignatory: 'Tariq Bin Sultan',
      website: 'https://example.ae',
    },
    meta,
  );
  const firmProfile = await prisma.firmProfile.findUnique({
    where: { userId: firmId },
    select: { id: true },
  });
  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerId },
    select: { id: true },
  });
  await prisma.lawyerProfile.update({
    where: { id: lawyerProfile!.id },
    data: { affiliatedFirmId: firmProfile!.id },
  });

  const listing = await prisma.listing.findUnique({ where: { userId: lawyerId }, select: { id: true } });

  const opened = await cases.createCase(
    clientId,
    {
      listingId: listing!.id,
      title: 'Unpaid commissions and a threatened dismissal',
      caseType: 'LABOUR_EMPLOYMENT',
      description:
        'My employer has withheld three months of commission and has now threatened to terminate my contract without notice. I have the offer letter, the commission schedule and the emails.',
    },
    [file('offer-letter.png')],
    meta,
  );
  if (!opened.ok) throw new Error(opened.message);
  const caseId = opened.data.caseId;
  await cases.reviewCase(caseId, lawyerId, meta);
  await cases.acceptCase(caseId, lawyerId, meta);
  await cases.postCaseMessage(caseId, clientId, {
    body: 'Thank you for taking this on. I have sent the commission schedule as well.',
  });
  await cases.postCaseMessage(caseId, lawyerId, {
    body: 'Received. I will file the complaint with the labour office this week and come back to you with a date.',
  });

  const tomorrow = addDaysToKey(todayKey(), 1);
  await appointments.bookAppointment(
    lawyerId,
    {
      lawyerProfileId: lawyerProfile!.id,
      clientId,
      dateKey: tomorrow,
      hour: 11,
      caseId,
      mode: 'VIDEO_CALL',
      note: 'First consultation.',
    },
    meta,
  );
  await appointments.bookAppointment(
    lawyerId,
    {
      lawyerProfileId: lawyerProfile!.id,
      clientId,
      dateKey: tomorrow,
      hour: 15,
      caseId,
      mode: 'OFFICE_VISIT',
      officeAddress: 'Office 1804, Emirates Towers, Sheikh Zayed Road, Dubai',
    },
    meta,
  );

  const fee = await payments.requestPayment(
    lawyerId,
    {
      caseId,
      amountAed: 3500,
      purpose: 'CASE_ASSISTANCE',
      details: 'Court filing fee and representation at the first hearing.',
    },
    meta,
  );
  if (!fee.ok) throw new Error(fee.message);
  const transfer = await payments.recordBankTransfer(
    clientId,
    { paymentId: fee.data.paymentId, reference: 'FT26265XK21' },
    meta,
  );
  if (!transfer.ok) throw new Error(transfer.message);
  const openFee = await payments.requestPayment(
    lawyerId,
    { caseId, amountAed: 750, purpose: 'CONSULTATION', details: 'Initial case review.' },
    meta,
  );
  if (!openFee.ok) throw new Error(openFee.message);

  // A letterhead of the professional's own, so the custom receipt is what gets
  // looked at. `--standard` leaves it on the platform layout instead.
  if (!standardLayout) {
    const mark = await import('node:fs/promises').then((fs) =>
      fs.readFile(path.resolve('public/logo.png')),
    );
    const saved = await receiptTemplates.saveReceiptTemplate(
      lawyerId,
      {
        layout: 'CUSTOM',
        brandName: 'Rahman Legal Consultancy',
        headerLine: 'Advocates and legal consultants · Dubai',
        footerNote:
          'Queries about this receipt: billing@rahmanlegal.example · +971 4 555 0199. Payment terms are 14 days from the date of the fee request.',
        accentColor: '#0F3D5C',
        showLicence: true,
        showFirm: true,
        showContact: true,
      },
      new File([new Uint8Array(mark)], 'rahman-legal.png', { type: 'image/png' }),
      meta,
    );
    if (!saved.ok) throw new Error(saved.message);
  }

  const ticket = await support.createSupportTicket(
    clientId,
    {
      subject: 'My UAE PASS document was rejected',
      category: 'VERIFICATION',
      body: 'I uploaded my Emirates ID as a PDF and it was rejected. Is a photo of the card acceptable instead?',
      contextPath: '/verification',
    },
    meta,
  );
  if (!ticket.ok) throw new Error(ticket.message);
  await support.replyToTicketAsAdmin(
    adminId,
    {
      ticketId: ticket.data.ticketId,
      body: 'A clear photo of both sides is fine. Upload it from the same page and it will go straight to the reviewer.',
    },
    meta,
  );

  // A recommendation in the community, recommending the fixture lawyer, so the
  // feed and their profile page both have something real in them.
  const blog = await import('../src/server/services/blog-service');
  const post = await blog.createPost(
    clientId,
    {
      kind: 'RECOMMENDATION',
      topic: 'LABOUR_EMPLOYMENT',
      listingId: listing!.id,
      title: 'Straight answer on an employment matter, and quick about it',
      body:
        'I was owed three months of commission and being pushed out. They read the contract in a day, told me plainly what was worth chasing and what was not, and filed with the labour office the same week. I always knew where the matter stood.',
    },
    meta,
  );
  if (!post.ok) throw new Error(post.message);
  // The published one, and one still waiting so the queue and the review tool
  // have something real to show.
  const published = await blog.decidePost(
    adminId,
    { postId: post.data.postId, decision: 'PUBLISHED' },
    meta,
  );
  if (!published.ok) throw new Error(published.message);

  const pendingPost = await blog.createPost(
    lawyerId,
    {
      kind: 'QUESTION',
      topic: 'LABOUR_EMPLOYMENT',
      title: 'Employee has not been paid for three months — what are the options?',
      body:
        'A client of the practice has an employer who stopped paying wages in June and is still requiring them to work. What is the usual route for unpaid salary, and is there a deadline to file?',
    },
    meta,
  );
  if (!pendingPost.ok) throw new Error(pendingPost.message);
  const comment = await blog.addComment(lawyerId, {
    postId: post.data.postId,
    body: 'Thank you — the commission schedule you sent made the difference.',
  });
  if (!comment.ok) throw new Error(`shot comment: ${comment.message}`);
  await blog.voteOnPost(clientId, { id: post.data.postId, value: 1 });
  await blog.voteOnPost(lawyerId, { id: post.data.postId, value: 1 });

  const urgent = await appointments.requestUrgentCall(clientId, caseId, meta);
  if (!urgent.ok) throw new Error(urgent.message);

  await prisma.emergencyRequest.create({
    data: {
      title: 'Detained at the airport, hearing tomorrow',
      caseType: 'IMMIGRATION_RESIDENCY',
      description: 'My brother is being held at the airport and there is a hearing in the morning.',
      contactPhone: '+971 50 777 1234',
      status: 'OPEN',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      clientId,
    },
  });

  const ids: Ids = {
    clientToken: await token(clientId),
    lawyerToken: await token(lawyerId),
    firmToken: await token(firmId),
    adminToken: await token(adminId),
    caseId,
    paymentId: openFee.data.paymentId,
    receiptPaymentId: fee.data.paymentId,
    ticketId: ticket.data.ticketId,
    roomCode: urgent.data.roomCode,
    listingId: listing!.id,
    postId: post.data.postId,
    pendingPostId: pendingPost.data.postId,
  };

  const tokenFor: Record<Shot['as'], string | null> = {
    guest: null,
    client: ids.clientToken,
    lawyer: ids.lawyerToken,
    firm: ids.firmToken,
    admin: ids.adminToken,
  };

  await mkdir(OUT_DIR, { recursive: true });

  const chosen = SHOTS.filter(
    (shot) => filters.length === 0 || filters.some((filter) => shot.name.includes(filter)),
  );

  console.info(`Taking ${chosen.length} page(s) at ${WIDTHS.length} widths…\n`);

  for (const shot of chosen) {
    const url = shot.resolve ? shot.resolve(ids) : shot.path;
    const sessionToken = tokenFor[shot.as];
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: sessionToken ? { cookie: `dl_session=${sessionToken}` } : {},
      redirect: 'manual',
    });
    const body = await response.text();
    if (response.status !== 200) {
      console.error(`  ${shot.name}: the app answered ${response.status} for ${url}`);
      continue;
    }

    // Private images — an uploaded billing mark, a profile photo — are served
    // behind the session cookie, which a page loaded from disk cannot send back.
    // They are fetched here with the right cookie and inlined, so the picture
    // shows what a browser would show.
    let inlined = body;
    for (const match of new Set(body.match(/\/api\/(?:documents|avatar)\/[A-Za-z0-9_-]+/g) ?? [])) {
      const image = await fetch(`${BASE_URL}${match}`, {
        headers: sessionToken ? { cookie: `dl_session=${sessionToken}` } : {},
      });
      if (!image.ok) continue;
      const type = image.headers.get('content-type') ?? 'image/png';
      const encoded = Buffer.from(await image.arrayBuffer()).toString('base64');
      inlined = inlined.split(match).join(`data:${type};base64,${encoded}`);
    }

    // The saved copy has to find the stylesheet, the mark and the fonts, and it
    // must not try to hydrate: these are pictures of the server-rendered page, so
    // the scripts are dropped and only the markup and the CSS remain.
    const html = inlined
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      .replace('<head>', `<head><base href="${BASE_URL}/">`);
    const htmlPath = path.join(OUT_DIR, `${shot.name}.html`);
    await writeFile(htmlPath, html);

    for (const width of WIDTHS) {
      if (tall && width.name !== 'desktop') continue;
      const out = path.join(OUT_DIR, `${shot.name}-${tall ? 'full' : width.name}.png`);
      await run(
        CHROME,
        [
          '--headless=new',
          '--disable-gpu',
          '--no-sandbox',
          '--hide-scrollbars',
          '--force-device-scale-factor=1',
          `--window-size=${width.width},${tall ? 2600 : width.height}`,
          `--screenshot=${out}`,
          `file://${htmlPath}`,
        ],
        { maxBuffer: 4 * 1024 * 1024 },
      );
      console.info(`  ${path.relative(process.cwd(), out)}`);
    }
  }

  } finally {
    await cleanup(keep);
  }

  async function cleanup(keepFixtures: boolean): Promise<void> {
  if (keepFixtures) {
    console.info(`\nFixtures kept. Accounts: shots.*.${stamp}@example.ae`);
  } else {
    const documents = await prisma.document.findMany({
      where: { userId: { in: created } },
      select: { storageKey: true },
    });
    const files = await prisma.caseFile.findMany({
      where: { uploadedById: { in: created } },
      select: { storageKey: true },
    });
    // Alerts this run raised for people it did not create. A support ticket
    // reaches every reviewer, and a screenshot fixture must not leave alerts
    // sitting in a real operator's list.
    const strays = await prisma.notification.deleteMany({
      where: {
        createdAt: { gte: startedAt },
        userId: { notIn: created },
        kind: {
          in: [
            'support.opened',
            'support.replied',
            'enquiry.received',
            'emergency.raised',
            'community.recommended',
            'community.pending',
            'community.published',
            'community.duplicate',
            'community.moderated',
          ],
        },
      },
    });
    if (strays.count > 0) {
      console.info(`  Removed ${strays.count} alert(s) raised for accounts this run did not create.`);
    }

    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: created } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    const { deleteUpload } = await import('../src/lib/storage');
    for (const row of [...documents, ...files]) await deleteUpload(row.storageKey).catch(() => undefined);
    console.info('\nFixtures removed.');
  }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export {};
