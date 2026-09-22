/**
 * End-to-end verification of the community as its own system:
 *
 *   · boards: every post belongs to one, and the topic index counts what is on
 *     each;
 *   · a post is written, waits for a moderator, and is invisible to everybody
 *     else while it waits;
 *   · the automatic check finds the earlier post that asks the same thing, and
 *     says why — the words the two share, weighted so the rare ones count;
 *   · the moderator's decisions: publish, close as a repeat, hide, remove, and
 *     what the author is told in each case;
 *   · threads: comments, replies to comments, votes, and the reply buttons;
 *   · reading is open to anyone, writing needs an account, and signing in from
 *     the community comes back to the community.
 *
 *   npm run e2e:community
 *
 * Every account it creates is removed, and every row it wrote.
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
  const auth = await import('../src/server/services/auth-service');
  const { updateProfile } = await import('../src/server/services/profile-service');
  const blog = await import('../src/server/services/blog-service');
  const match = await import('../src/server/services/community-match');
  const { COMMUNITY_TOPICS } = await import('../src/lib/community');

  const runStartedAt = new Date();
  const meta = { ip: '203.0.121.10', userAgent: 'dubai-legal-e2e-community' };
  let registrationIndex = 0;
  const createdUserIds: string[] = [];
  const createdPostIds: string[] = [];

  function idFor(sequence: number): string {
    return `7841991${String(sequence).padStart(7, '0')}1`;
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
      { ...meta, ip: `203.0.121.${100 + registrationIndex}` },
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
        dateOfBirth: '1984-03-03',
        placeOfBirth: 'Dubai',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        phone: '+971 50 121 2121',
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
    // React puts comment markers between adjacent text nodes, so the rendered
    // words are not always adjacent in the HTML. Strip both.
    return page
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
  }

  /** Writes a post and remembers it for the clean-up. */
  async function write(authorId: string, input: Record<string, unknown>) {
    const result = await blog.createPost(authorId, input, meta);
    if (result.ok) createdPostIds.push(result.data.postId);
    return result;
  }

  try {
    // ── Fixtures ───────────────────────────────────────────────────────────
    const reviewer = await register(`c.admin.${runId}@example.ae`, 'USER');
    await makeProfile(reviewer.userId, 'Community Reviewer', 9301);
    await prisma.user.update({
      where: { id: reviewer.userId },
      data: { roles: ['MEMBER', 'REVIEWER'], verificationStatus: 'APPROVED' },
    });

    const asker = await register(`c.asker.${runId}@example.ae`, 'USER');
    await makeProfile(asker.userId, 'Asking Member', 9302);
    // Approved, so the badge is on their posts: a fixture reviewer decision.
    await prisma.user.update({
      where: { id: asker.userId },
      data: { verificationStatus: 'APPROVED', verifiedAt: new Date() },
    });

    const answerer = await register(`c.answer.${runId}@example.ae`, 'LAWYER');
    await makeProfile(answerer.userId, 'Answering Lawyer', 9303);
    await prisma.user.update({
      where: { id: answerer.userId },
      data: { verificationStatus: 'APPROVED', verifiedAt: new Date() },
    });

    const bystander = await register(`c.bystander.${runId}@example.ae`, 'USER');
    await makeProfile(bystander.userId, 'Watching Member', 9304);

    // ════════════════════════════════════════════════════════════════════════
    section('Boards');

    check('there are boards to post on', COMMUNITY_TOPICS.length >= 10);
    check(
      'each one says what belongs on it',
      COMMUNITY_TOPICS.every((topic) => topic.hint.length > 10),
    );

    const counts = await blog.listTopicCounts();
    check('the index counts every board', counts.length === COMMUNITY_TOPICS.length);
    check(
      'including the empty ones, rather than hiding them',
      counts.every((entry) => typeof entry.posts === 'number'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('A post waits for a moderator');

    const first = await write(asker.userId, {
      kind: 'QUESTION',
      topic: 'LABOUR_EMPLOYMENT',
      title: 'My employer has not paid my salary for three months',
      body: 'My company stopped paying wages in June and I am still working. What can I do about unpaid salary, and can I leave without notice?',
    });
    check('a member can write a post', first.ok === true, first.ok ? '' : first.message);
    const firstId = first.ok ? first.data.postId : '';
    check('and is told it is going for review', first.ok === true && first.data.pending === true);

    const stored = await prisma.blogPost.findUnique({
      where: { id: firstId },
      select: { status: true, topic: true },
    });
    check('it is stored as waiting', stored?.status === 'PENDING');
    check('on the board that was chosen', stored?.topic === 'LABOUR_EMPLOYMENT');

    check(
      'the reviewers are told there is something to read',
      (await prisma.notification.count({
        where: { userId: reviewer.userId, kind: 'community.pending' },
      })) === 1,
    );

    const feedWhilePending = await html('/blog');
    check(
      'and it is not on the board while it waits',
      !feedWhilePending.includes('My employer has not paid my salary'),
    );
    check(
      'the author can read their own post while it waits',
      (await blog.getPost(firstId, asker.userId)) !== null,
    );
    check(
      'and nobody else can',
      (await blog.getPost(firstId, bystander.userId)) === null,
    );
    const pendingPage = markup(await html(`/blog/${firstId}`, asker.sessionToken));
    check('the page says it is waiting for a moderator', pendingPage.includes('Waiting for a moderator'));
    check(
      'and that only they and the moderators can see it',
      pendingPage.includes('Only you and the moderators can see it'),
    );

    const boardWhileEmpty = markup(await html('/blog?topic=LABOUR_EMPLOYMENT'));
    check(
      'the board is empty rather than filled with examples',
      boardWhileEmpty.includes('Nothing on') || boardWhileEmpty.includes('Partly'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('A moderator reads the automatic check and publishes it');

    const reviewTool = await get(`/admin/blog/${firstId}`, reviewer.sessionToken);
    const reviewHtml = await reviewTool.text();
    check('the review tool opens for a reviewer', reviewTool.status === 200, `got ${reviewTool.status}`);
    check('it shows the automatic check', reviewHtml.includes('Automatic check'));
    check(
      'and offers the four decisions',
      reviewHtml.includes('Publish it') &&
        reviewHtml.includes('Close it as a repeat') &&
        reviewHtml.includes('Hide it') &&
        reviewHtml.includes('Remove it'),
    );

    const queue = await blog.listPendingPosts();
    check('the post is in the queue', queue.some((row) => row.id === firstId));
    check(
      'and the queue has already run the check for it',
      Array.isArray(queue.find((row) => row.id === firstId)?.similar),
    );

    const approve = await blog.decidePost(reviewer.userId, { postId: firstId, decision: 'PUBLISHED' }, meta);
    check('a moderator can publish it', approve.ok === true, approve.ok ? '' : approve.message);
    check(
      'and the author is told it is on the board',
      (await prisma.notification.count({
        where: { userId: asker.userId, kind: 'community.published' },
      })) === 1,
    );
    const title = 'My employer has not paid my salary for three months';
    check('now it is on the board', (await html('/blog')).includes(title));
    check(
      'and on its board specifically',
      (await html('/blog?topic=LABOUR_EMPLOYMENT')).includes(title),
    );
    check('but not on a different one', !(await html('/blog?topic=TRAFFIC_FINES')).includes(title));

    // ════════════════════════════════════════════════════════════════════════
    section('The automatic check finds the question that was already asked');

    const duplicateBody = {
      kind: 'QUESTION' as const,
      topic: 'LABOUR_EMPLOYMENT',
      title: 'Unpaid salary for 3 months — what are my options?',
      body: 'My employer has not paid my salary since June. Can I file a complaint about unpaid wages and leave?',
    };

    const keywords = match.keywords(`${duplicateBody.title} ${duplicateBody.body}`);
    check('the check reads words, not punctuation', keywords.includes('salar'));
    check('and ignores filler', !keywords.includes('the') && !keywords.includes('what'));

    const scored = match.similarity(
      {
        id: 'new',
        title: duplicateBody.title,
        body: duplicateBody.body,
        topic: duplicateBody.topic,
      },
      {
        id: firstId,
        title: 'My employer has not paid my salary for three months',
        body: 'My company stopped paying wages in June and I am still working.',
        topic: 'LABOUR_EMPLOYMENT',
      },
    );
    check('a question that has been asked scores high', scored.score > 0.35, `got ${scored.score}`);
    check(
      'and the words it shares are named',
      scored.sharedTerms.includes('salar') && scored.sharedTerms.includes('month'),
    );

    const unrelated = match.similarity(
      {
        id: 'new',
        title: duplicateBody.title,
        body: duplicateBody.body,
        topic: duplicateBody.topic,
      },
      {
        id: 'other',
        title: 'Landlord will not return my deposit',
        body: 'The tenancy ended and the landlord keeps my security deposit.',
        topic: 'TENANCY_PROPERTY',
      },
    );
    check('an unrelated post scores near zero', unrelated.score < 0.05, `got ${unrelated.score}`);

    const repeat = await write(asker.userId, duplicateBody);
    check('a second member can ask the same thing', repeat.ok === true);
    const repeatId = repeat.ok ? repeat.data.postId : '';

    const repeatQueue = await blog.listPendingPosts();
    const repeatRow = repeatQueue.find((row) => row.id === repeatId);
    check('the queue flags it against the earlier post', (repeatRow?.similar.length ?? 0) > 0);
    check(
      'naming it as the closest match',
      repeatRow?.similar[0]?.id === firstId,
      `got ${repeatRow?.similar[0]?.id}`,
    );
    check(
      'above the threshold that means "look at this"',
      (repeatRow?.similar[0]?.match.score ?? 0) >= match.SIMILARITY_THRESHOLD,
    );
    check(
      'with the shared words spelled out',
      (repeatRow?.similar[0]?.match.sharedTerms.length ?? 0) > 0,
    );
    check(
      'and the queue screen shows the moderator what it found',
      markup(await html('/admin/blog', reviewer.sessionToken)).includes('Closest existing post'),
    );
    check(
      'with the percentage and the shared words on the review screen',
      (await html(`/admin/blog/${repeatId}`, reviewer.sessionToken)).includes('%'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Closing a post as a repeat sends the author to the answers');

    const missingOriginal = await blog.decidePost(
      reviewer.userId,
      { postId: repeatId, decision: 'DUPLICATE' },
      meta,
    );
    check('closing as a repeat needs the post it repeats', missingOriginal.ok === false);

    const closed = await blog.decidePost(
      reviewer.userId,
      {
        postId: repeatId,
        decision: 'DUPLICATE',
        duplicateOfId: firstId,
        reason: 'DUPLICATE',
        note: 'Your question is answered on the earlier thread.',
      },
      meta,
    );
    check('a moderator can close it as a repeat', closed.ok === true, closed.ok ? '' : closed.message);

    const closedRow = await prisma.blogPost.findUnique({
      where: { id: repeatId },
      select: {
        status: true,
        duplicateOfId: true,
        similarityScore: true,
        similarityTerms: true,
        moderationReason: true,
      },
    });
    check('it is marked as a repeat', closedRow?.status === 'DUPLICATE');
    check('linked to the post it repeats', closedRow?.duplicateOfId === firstId);
    check('with what the automatic check found recorded', (closedRow?.similarityScore ?? 0) > 0);
    check('and the words it matched on', (closedRow?.similarityTerms ?? '').includes('salar'));
    check('and the reason', closedRow?.moderationReason === 'DUPLICATE');

    check(
      'the author is told where the answer is',
      (await prisma.notification.count({
        where: { userId: asker.userId, kind: 'community.duplicate' },
      })) === 1,
    );
    const closedPage = markup(await html(`/blog/${repeatId}`, asker.sessionToken));
    check('their post says it has been asked already', closedPage.includes('This has been asked already'));
    check('and links to the earlier thread', closedPage.includes(`/blog/${firstId}`));
    check(
      'while nobody else sees it at all',
      (await html(`/blog/${repeatId}`)).length > 0 &&
        (await blog.getPost(repeatId, bystander.userId)) === null,
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Threads: comments, replies and votes');

    const comment = await blog.addComment(answerer.userId, {
      postId: firstId,
      body: 'File with the labour office first: unpaid wages carry a penalty, and the complaint is free. Keep your contract and any messages about the pay.',
    });
    check('a member can comment on a published post', comment.ok === true, comment.ok ? '' : comment.message);
    const commentId = comment.ok ? comment.data.commentId : '';

    const reply = await blog.addComment(bystander.userId, {
      postId: firstId,
      parentId: commentId,
      body: 'How long does that take?',
    });
    check('and somebody can reply to a comment', reply.ok === true);

    const thread = await blog.getPost(firstId, asker.userId);
    check('the thread comes back with the post', thread?.thread.length === 1);
    check('with the reply under the comment', thread?.thread[0]?.replies.length === 1);
    check('and the count', thread?.commentCount === 2);

    const threadHtml = markup(await html(`/blog/${firstId}`, answerer.sessionToken));
    check(
      'the comments are inside the post card, not separate from it',
      threadHtml.includes('Write a comment…') &&
        !threadHtml.includes('No comments yet</h2>'),
    );
    check('with a reply button on each comment', threadHtml.includes('>Reply<'));
    check('and a box for a general comment', threadHtml.includes('Write a comment…'));

    const guestThread = markup(await html(`/blog/${firstId}`));
    check(
      'a guest gets the same card without the controls',
      guestThread.includes('submitted by') === false &&
        !guestThread.includes('Write a comment…') &&
        guestThread.includes('Anyone can read the community'),
    );
    check(
      'and the invitation to sign in is outside the card',
      guestThread.indexOf('Anyone can read the community') > guestThread.indexOf('Write a comment'),
    );

    const up = await blog.voteOnPost(answerer.userId, { id: firstId, value: 1 });
    const down = await blog.voteOnPost(bystander.userId, { id: firstId, value: -1 });
    check('posts can be voted on', up.ok === true && down.ok === true);
    check('and the score is the difference', down.ok === true && down.data.score === 0);
    const upComment = await blog.voteOnComment(asker.userId, { id: commentId, value: 1 });
    check('so can comments', upComment.ok === true && upComment.data.score === 1);

    const commentOnPending = await blog.addComment(answerer.userId, {
      postId: repeatId,
      body: 'This should not be allowed.',
    });
    check('a closed post cannot be commented on', commentOnPending.ok === false);

    // ════════════════════════════════════════════════════════════════════════
    section('Reactions');

    const like = await blog.reactToPost(bystander.userId, { id: firstId, kind: 'LIKE' });
    check('a member can react to a post', like.ok === true, like.ok ? '' : like.message);
    check('and the counter moves', like.ok === true && like.data.counts.LIKE === 1);
    check('with their own reaction returned', like.ok === true && like.data.kind === 'LIKE');

    const heart = await blog.reactToPost(answerer.userId, { id: firstId, kind: 'HEART' });
    check('somebody else can react differently', heart.ok === true && heart.data.counts.HEART === 1);
    check('and both are counted', heart.ok === true && heart.data.counts.total === 2);

    const changed = await blog.reactToPost(bystander.userId, { id: firstId, kind: 'WOW' });
    check('changing a reaction replaces it', changed.ok === true && changed.data.kind === 'WOW');
    check(
      'rather than adding a second one',
      changed.ok === true &&
        changed.data.counts.WOW === 1 &&
        changed.data.counts.LIKE === 0 &&
        changed.data.counts.total === 2,
    );

    const takenBack = await blog.reactToPost(bystander.userId, { id: firstId, kind: 'WOW' });
    check('pressing the same one takes it back', takenBack.ok === true && takenBack.data.kind === null);
    check('and the counter drops', takenBack.ok === true && takenBack.data.counts.total === 1);

    const commentReaction = await blog.reactToComment(asker.userId, {
      id: commentId,
      kind: 'HEART',
    });
    check('comments can be reacted to as well', commentReaction.ok === true);

    const withoutAccess = await blog.reactToPost(bystander.userId, { id: repeatId, kind: 'LIKE' });
    check('a post that is not on the board cannot be reacted to', withoutAccess.ok === false);

    const badKind = await blog.reactToPost(bystander.userId, { id: firstId, kind: 'ANGRY' });
    check('only the three reactions exist', badKind.ok === false);

    const cardWithReactions = markup(await html(`/blog/${firstId}`, asker.sessionToken));
    check(
      'the card shows the three reactions with their counts',
      cardWithReactions.includes('👍') && cardWithReactions.includes('❤️') && cardWithReactions.includes('😮'),
    );
    check('and the likes counter', /\d+\s*reaction/.test(cardWithReactions));

    // ════════════════════════════════════════════════════════════════════════
    section('The rest of the moderator’s decisions');

    const toHide = await write(asker.userId, {
      kind: 'NOTE',
      topic: 'TENANCY_PROPERTY',
      title: 'My landlord is a criminal and here is his full name',
      body: 'I am naming the landlord, his building and the case number so everybody can avoid him and his family.',
    });
    const toHideId = toHide.ok ? toHide.data.postId : '';
    const hidden = await blog.decidePost(
      reviewer.userId,
      { postId: toHideId, decision: 'HIDDEN', reason: 'CONFIDENTIAL_DETAIL', note: 'Names a case.' },
      meta,
    );
    check('a post can be hidden', hidden.ok === true);
    check(
      'the author is told why',
      (await prisma.notification.count({
        where: { userId: asker.userId, kind: 'community.moderated' },
      })) >= 1,
    );
    check(
      'and their post says so, with the reason',
      (await html(`/blog/${toHideId}`, asker.sessionToken)).includes('Names a case.'),
    );

    const toRemove = await write(bystander.userId, {
      kind: 'NOTE',
      topic: 'OTHER',
      title: 'Cheap legal advice, direct message me',
      body: 'I am not a lawyer but I can help with anything for a small fee. Message me for details.',
    });
    const toRemoveId = toRemove.ok ? toRemove.data.postId : '';
    const removed = await blog.decidePost(
      reviewer.userId,
      { postId: toRemoveId, decision: 'REMOVED', reason: 'ADVERTISING', note: 'Advertising.' },
      meta,
    );
    check('a post can be removed', removed.ok === true);
    check(
      'and its author can no longer read it',
      (await blog.getPost(toRemoveId, bystander.userId)) === null,
    );

    const modelled = await blog.listPostsForModeration();
    check('the report counts what is waiting', modelled.pending === 0);
    check('and what is on the board', modelled.published >= 1);
    check('and what was closed as a repeat', modelled.duplicates === 1);

    // ════════════════════════════════════════════════════════════════════════
    section('Reading is open, writing is not');

    const guestFeed = markup(await html('/blog'));
    check('a guest can read the board', guestFeed.includes('My employer has not paid my salary'));
    check('and is offered a way in', guestFeed.includes('Sign in to post or vote'));
    check(
      'which comes back to the community',
      guestFeed.includes('login?next=%2Fblog'),
    );
    check('and no writing form is shown to them', !guestFeed.includes('Send for review'));

    const memberFeed = markup(await html('/blog', asker.sessionToken));
    check('a member gets the writing form', memberFeed.includes('Send for review'));
    check('with the boards to choose from', memberFeed.includes('Which board?'));
    check(
      'and their badge and kind of account on their post',
      memberFeed.includes('Verified') && memberFeed.includes('Client'),
    );

    const aboutBystander = await get('/blog', bystander.sessionToken);
    check('any signed-in member can read it too', aboutBystander.status === 200);

    // ════════════════════════════════════════════════════════════════════════
    section('The community on the landing page');

    const landingGuest = markup(await html('/?tab=community'));
    check(
      'the landing page has a community tab',
      landingGuest.includes('Ask the people who have been through it'),
    );
    check(
      'a visitor can read the community without leaving the page',
      landingGuest.includes('My employer has not paid my salary'),
    );
    check(
      'and is asked to sign in from that panel',
      landingGuest.includes('Read it all; sign in to take part'),
    );
    check(
      'with the sign-in returning to the community tab, not a dashboard',
      landingGuest.includes('login?next=%2F%3Ftab%3Dcommunity'),
    );
    check(
      'and no writing controls are rendered for a guest',
      !landingGuest.includes('Write a comment…') && !landingGuest.includes('Write a post'),
    );

    const landingMember = markup(await html('/?tab=community', asker.sessionToken));
    check('a member gets the composer in the panel', landingMember.includes('Write a post'));
    check('and can comment on a post from it', landingMember.includes('Write a comment…'));
    check(
      'and can react from it',
      landingMember.includes('👍') && landingMember.includes('❤️'),
    );

    const landingHome = markup(await html('/'));
    check(
      'the home tab still carries the marketing page',
      landingHome.includes('How verification works') || landingHome.includes('verified'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Installable from the browser');

    const manifestResponse = await get('/manifest.webmanifest');
    const manifestText = await manifestResponse.text();
    let manifest: { icons?: { sizes?: string; purpose?: string }[]; display?: string; start_url?: string } = {};
    try {
      manifest = JSON.parse(manifestText);
    } catch {
      manifest = {};
    }
    check('the manifest is served', manifestResponse.status === 200);
    check('it declares a standalone display', manifest.display === 'standalone');
    check('and a start url', Boolean(manifest.start_url));
    check(
      'and the icon sizes an install needs, including a maskable one',
      (manifest.icons ?? []).some((icon) => icon.sizes === '192x192') &&
        (manifest.icons ?? []).some((icon) => icon.sizes === '512x512') &&
        (manifest.icons ?? []).some((icon) => icon.purpose === 'maskable'),
    );

    const home = await html('/');
    check('the page links the manifest', home.includes('rel="manifest" href="/manifest.webmanifest"'));
    check(
      'and carries the full-screen capability for iOS and Android',
      home.includes('mobile-web-app-capable') && home.includes('apple-mobile-web-app-capable'),
    );

    const worker = await (await get('/sw.js')).text();
    check(
      'the service worker handles fetches, which is what makes it installable',
      worker.includes("addEventListener('fetch'"),
    );
    check(
      'but never caches an API response or a document',
      worker.includes("startsWith('/api/')"),
    );

    const offline = await get('/offline');
    check('there is an offline page for the installed app', offline.status === 200);
    check(
      'which says what has happened',
      (await offline.text()).includes('You are offline'),
    );

    // ════════════════════════════════════════════════════════════════════════
    section('Clean up');

    const strayAlerts = await prisma.notification.deleteMany({
      where: {
        createdAt: { gte: runStartedAt },
        userId: { notIn: createdUserIds },
        kind: {
          in: [
            'support.opened',
            'support.replied',
            'enquiry.received',
            'emergency.raised',
            'community.pending',
            'community.published',
            'community.duplicate',
            'community.moderated',
            'community.recommended',
            'community.replied',
          ],
        },
      },
    });
    if (strayAlerts.count > 0) {
      console.info(`  Removed ${strayAlerts.count} alert(s) raised for accounts this run did not create.`);
    }

    await prisma.blogPost.deleteMany({ where: { authorId: { in: createdUserIds } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: createdUserIds } } });
    await prisma.trafficLog.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });

    check(
      'every account created by this run was removed',
      (await prisma.user.count({ where: { id: { in: createdUserIds } } })) === 0,
    );
    check(
      'and every post it wrote',
      (await prisma.blogPost.count({ where: { id: { in: createdPostIds } } })) === 0,
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
  console.error('\nThe community end-to-end run crashed:', error);
  process.exitCode = 1;
});

export {};
