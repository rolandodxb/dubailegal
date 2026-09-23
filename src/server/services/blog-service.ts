import { z } from 'zod';
import { COMMUNITY_TOPICS, isCommunityTopic } from '@/lib/community';
import { cached, invalidate } from '@/lib/ttl-cache';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { notify, notifyMany } from './notification-service';
import { rankSimilar, SIMILARITY_THRESHOLD, type ComparablePost } from './community-match';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * The community section.
 *
 * A member recommends a lawyer or a firm, asks a question, or writes down what
 * happened to them. Other members vote, which is what puts the useful answers at
 * the top, and reply in a thread. It is deliberately the only public thing
 * members write here: a post is written to be read by strangers, so nothing
 * confidential belongs in one — the case conversation is the private channel.
 *
 * A recommendation can name a professional, which then shows on their profile,
 * so a lawyer's page carries what clients said about them rather than only the
 * star rating they were given.
 */

export { BLOG_KINDS, BLOG_KIND_LABEL } from '@/lib/blog';
export { REACTIONS, REACTION_LABEL } from '@/lib/community';
export { COMMUNITY_TOPICS, COMMUNITY_TOPIC_LABEL, isCommunityTopic } from '@/lib/community';

const postSchema = z.object({
  title: z
    .string()
    .trim()
    .min(8, 'Give it a title of at least 8 characters.')
    .max(140, 'Keep the title under 140 characters.'),
  body: z
    .string()
    .trim()
    .min(20, 'Say a little more — at least 20 characters.')
    .max(8000, 'That is longer than a post can be.'),
  kind: z.enum(['RECOMMENDATION', 'QUESTION', 'NOTE'], {
    errorMap: () => ({ message: 'Choose what kind of post this is.' }),
  }),
  topic: z.string().trim().min(1, 'Choose the board this belongs on.'),
  listingId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

const commentSchema = z.object({
  postId: z.string().min(1),
  parentId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  body: z
    .string()
    .trim()
    .min(2, 'Write a reply.')
    .max(4000, 'Keep replies under 4000 characters.'),
});

const decisionSchema = z.object({
  postId: z.string().min(1),
  decision: z.enum(['PUBLISHED', 'DUPLICATE', 'HIDDEN', 'REMOVED'], {
    errorMap: () => ({ message: 'Choose what should happen to the post.' }),
  }),
  duplicateOfId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  reason: z
    .enum(['DUPLICATE', 'NOT_A_LEGAL_TOPIC', 'ABUSIVE', 'ADVERTISING', 'CONFIDENTIAL_DETAIL', 'OTHER'])
    .optional()
    .nullable()
    .transform((value) => value ?? null),
  note: z
    .string()
    .trim()
    .max(400)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

const reactionSchema = z.object({
  id: z.string().min(1),
  kind: z
    .union([z.enum(['LIKE', 'HEART', 'WOW']), z.literal(''), z.null(), z.undefined()])
    .transform((value) => (value === '' || value === undefined ? null : value)),
});

const voteSchema = z.object({
  id: z.string().min(1),
  value: z.coerce.number().int().min(-1).max(1),
});

/**
 * The feed.
 *
 * `hot` is Reddit's idea: score against age, so a good post from yesterday can
 * still outrank a dull one from a minute ago, and a brand new post with no votes
 * is not buried for ever.
 */
export async function listPosts(
  viewerId: string | null,
  options: {
    sort?: 'hot' | 'new';
    listingId?: string;
    authorId?: string;
    topic?: string;
    /**
     * ISO alpha-2 codes to narrow the board to. Posts written before the platform
     * went worldwide carry no country and are shown everywhere, because hiding
     * them from every reader would be worse than showing them to the wrong one.
     */
    countries?: string[];
    limit?: number;
  } = {},
) {
  const countryFilter =
    options.countries && options.countries.length > 0
      ? { OR: [{ countryCode: { in: options.countries } }, { countryCode: null }] }
      : {};

  const where = {
    status: 'PUBLISHED' as const,
    ...(options.listingId ? { listingId: options.listingId } : {}),
    ...(options.authorId ? { authorId: options.authorId } : {}),
    ...(options.topic ? { topic: options.topic as never } : {}),
    ...countryFilter,
  };

  const rows = await prisma.blogPost.findMany({
    where,
    orderBy: options.sort === 'new' ? [{ createdAt: 'desc' }] : [{ score: 'desc' }, { createdAt: 'desc' }],
    take: options.limit ?? 40,
    select: {
      id: true,
      kind: true,
      topic: true,
      title: true,
      body: true,
      score: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          email: true,
          accountType: true,
          verificationStatus: true,
          verifiedAt: true,
          createdAt: true,
          profile: { select: { fullName: true, avatarDocumentId: true, countryOfResidence: true } },
        },
      },
      listing: {
        select: { id: true, displayName: true, kind: true, primaryEmirate: true, userId: true },
      },
      _count: { select: { comments: true } },
      votes: viewerId ? { where: { userId: viewerId }, select: { value: true } } : false,
      reactions: { select: { kind: true, userId: true } },
      // The first few comments ride along with the post: the thread belongs on
      // the card, not behind a link.
      comments: {
        where: { status: 'PUBLISHED' },
        orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
        take: 3,
        select: {
          id: true,
          body: true,
          score: true,
          parentId: true,
          createdAt: true,
          authorId: true,
          author: {
            select: {
              id: true,
              email: true,
              accountType: true,
              verificationStatus: true,
              profile: { select: { fullName: true, avatarDocumentId: true, countryOfResidence: true } },
            },
          },
          reactions: { select: { kind: true, userId: true } },
        },
      },
    },
  });

  // "Hot" needs the age as well as the score, so it is ordered here rather than
  // in SQL, where the expression would be harder to read.
  const withVote = rows.map((row) => ({
    ...row,
    myVote: Array.isArray(row.votes) && row.votes.length > 0 ? row.votes[0]!.value : 0,
  }));

  if (options.sort === 'new') return withVote;

  const now = Date.now();
  return withVote.sort((a, b) => hotness(b.score, b.createdAt, now) - hotness(a.score, a.createdAt, now));
}

function hotness(score: number, createdAt: Date, now: number): number {
  const hours = (now - createdAt.getTime()) / (1000 * 60 * 60);
  return (score + 1) / Math.pow(hours + 2, 1.2);
}

/** One post with its thread, oldest comment first, one level of replies. */
export async function getPost(postId: string, viewerId: string | null) {
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    relationLoadStrategy: 'join',
    select: {
      id: true,
      kind: true,
      topic: true,
      title: true,
      body: true,
      score: true,
      status: true,
      createdAt: true,
      moderationNote: true,
      moderationReason: true,
      duplicateOfId: true,
      duplicateOf: { select: { id: true, title: true } },
      authorId: true,
      author: {
        select: {
          id: true,
          email: true,
          accountType: true,
          verificationStatus: true,
          verifiedAt: true,
          createdAt: true,
          profile: { select: { fullName: true, avatarDocumentId: true, countryOfResidence: true } },
        },
      },
      listing: {
        select: {
          id: true,
          displayName: true,
          kind: true,
          primaryEmirate: true,
          headline: true,
          userId: true,
        },
      },
      comments: {
        where: { status: 'PUBLISHED' },
        orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          body: true,
          score: true,
          parentId: true,
          createdAt: true,
          authorId: true,
          author: {
            select: {
              id: true,
              email: true,
              accountType: true,
              verificationStatus: true,
              profile: { select: { fullName: true, avatarDocumentId: true } },
            },
          },
          votes: viewerId ? { where: { userId: viewerId }, select: { value: true } } : false,
          reactions: { select: { kind: true, userId: true } },
        },
      },
      votes: viewerId ? { where: { userId: viewerId }, select: { value: true } } : false,
      reactions: { select: { kind: true, userId: true } },
    },
  });
  if (!post) return null;

  const isReviewer = viewerId
    ? (await prisma.user.count({ where: { id: viewerId, roles: { has: 'REVIEWER' } } })) > 0
    : false;
  const isAuthor = post.authorId === viewerId;

  // Removed means removed: not even the author, and not the console's reports.
  // Everything else that is not published — waiting for a moderator, hidden
  // after a report, closed as a repeat — is the author's to read and the
  // moderators' to work with. Nobody else sees half-decided writing.
  if (post.status === 'REMOVED') return null;
  if (!isAuthor && !isReviewer && post.status !== 'PUBLISHED') return null;

  const roots = post.comments.filter((comment) => comment.parentId === null);
  const replies = new Map<string, typeof post.comments>();
  for (const comment of post.comments) {
    if (!comment.parentId) continue;
    const list = replies.get(comment.parentId) ?? [];
    list.push(comment);
    replies.set(comment.parentId, list);
  }

  return {
    ...post,
    myVote: Array.isArray(post.votes) && post.votes.length > 0 ? post.votes[0]!.value : 0,
    thread: roots.map((root) => ({
      ...root,
      myVote: Array.isArray(root.votes) && root.votes.length > 0 ? root.votes[0]!.value : 0,
      replies: (replies.get(root.id) ?? []).map((reply) => ({
        ...reply,
        myVote: Array.isArray(reply.votes) && reply.votes.length > 0 ? reply.votes[0]!.value : 0,
      })),
    })),
    commentCount: post.comments.length,
  };
}

/**
 * Everything that belongs on a professional's page.
 *
 * Two kinds of post: the recommendations other members wrote about them, and the
 * posts they wrote themselves — which is how a practice announces something to
 * the people looking at its page.
 */
export async function listPostsForProfile(listingId: string, ownerUserId: string, limit = 10) {
  return prisma.blogPost.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [{ listingId }, { authorId: ownerUserId }],
    },
    orderBy: [{ createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      kind: true,
      title: true,
      body: true,
      score: true,
      createdAt: true,
      authorId: true,
      author: {
        select: {
          id: true,
          email: true,
          accountType: true,
          verificationStatus: true,
          createdAt: true,
          profile: { select: { fullName: true, avatarDocumentId: true, countryOfResidence: true } },
        },
      },
      _count: { select: { comments: true } },
    },
  });
}

/**
 * The topic index.
 *
 * What the community opens with: the boards, and how much is on each. A board
 * with nothing on it is still shown, because an empty board is a true thing to
 * say and hiding it would make the place look fuller than it is.
 */
export async function listTopicCounts() {
  return cached('community:topics', 30_000, loadTopicCounts);
}

async function loadTopicCounts() {
  const [posts, comments] = await Promise.all([
    prisma.blogPost.groupBy({
      by: ['topic'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.blogComment.groupBy({
      by: ['postId'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true },
    }),
  ]);

  const commentRows = await prisma.blogComment.findMany({
    where: { status: 'PUBLISHED' },
    select: { postId: true, post: { select: { topic: true } } },
  });

  const commentsByTopic = new Map<string, number>();
  for (const row of commentRows) {
    commentsByTopic.set(row.post.topic, (commentsByTopic.get(row.post.topic) ?? 0) + 1);
  }

  const byTopic = new Map(posts.map((row) => [row.topic, row]));

  return COMMUNITY_TOPICS.map((topic) => {
    const row = byTopic.get(topic.value as never);
    return {
      ...topic,
      posts: row?._count._all ?? 0,
      comments: commentsByTopic.get(topic.value) ?? 0,
      latestAt: row?._max.createdAt ?? null,
      totalComments: comments.length,
    };
  });
}

/** Posts that recommend a particular professional, for their profile page. */
export async function listPostsAboutListing(listingId: string, limit = 5) {
  return prisma.blogPost.findMany({
    where: { listingId, status: 'PUBLISHED' },
    relationLoadStrategy: 'join',
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      kind: true,
      title: true,
      body: true,
      score: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          email: true,
          accountType: true,
          profile: { select: { fullName: true, avatarDocumentId: true } },
        },
      },
      _count: { select: { comments: true } },
    },
  });
}

/** The most recent posts, for the landing page. Real rows only: an empty feed is empty. */
export async function listRecentPosts(limit = 3) {
  return cached(`community:recent:${limit}`, 30_000, () => loadRecentPosts(limit));
}

async function loadRecentPosts(limit: number) {
  return prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    relationLoadStrategy: 'join',
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      kind: true,
      title: true,
      body: true,
      score: true,
      createdAt: true,
      author: {
        select: {
          profile: { select: { fullName: true, avatarDocumentId: true } },
          email: true,
          accountType: true,
        },
      },
      listing: { select: { id: true, displayName: true, kind: true } },
      _count: { select: { comments: true } },
    },
  });
}

/**
 * Writes a post, which waits for a moderator.
 *
 * Nothing reaches the board without somebody looking at it, and the reason is
 * specific: the most useful thing a moderator does here is notice that the
 * question has been asked and answered already, and send the author to that
 * thread. The automatic check below does the reading; the moderator makes the
 * decision.
 */
export async function createPost(
  authorId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ postId: string; pending: true }>> {
  const parsed = postSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  if (!isCommunityTopic(parsed.data.topic)) {
    return failure('Choose the board this belongs on.', {
      fieldErrors: { topic: 'Choose a board.' },
    });
  }

  if (parsed.data.listingId) {
    const listing = await prisma.listing.findFirst({
      where: { id: parsed.data.listingId, published: true },
      select: { id: true, userId: true, displayName: true },
    });
    if (!listing) {
      return failure('That profile is not in the directory, so it cannot be named in a post.', {
        fieldErrors: { listingId: 'Choose a published profile.' },
      });
    }
  }

  // The board is worldwide, so a post is filed under the country its author lives
  // in: that is the country whose readers it is most useful to, and the one whose
  // board it will appear on by default. Never asked for — it follows the profile,
  // and a member who has not recorded a country posts without one.
  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { profile: { select: { countryOfResidenceCode: true, divisionCode: true } } },
  });

  const post = await prisma.blogPost.create({
    data: {
      authorId,
      kind: parsed.data.kind,
      topic: parsed.data.topic,
      title: parsed.data.title,
      body: parsed.data.body,
      listingId: parsed.data.listingId,
      status: 'PENDING',
      countryCode: author?.profile?.countryOfResidenceCode ?? null,
      divisionCode: author?.profile?.divisionCode ?? null,
    },
    select: { id: true, title: true },
  });

  // The people who review the board are told there is something in the queue.
  const reviewers = await prisma.user.findMany({
    where: { roles: { has: 'REVIEWER' }, status: 'ACTIVE' },
    select: { id: true },
  });
  await notifyMany(
    reviewers.map((row) => row.id),
    {
      kind: 'community.pending',
      title: 'A community post is waiting for review',
      body: `“${post.title}” — check whether the question has been asked already.`,
      link: `/admin/blog/${post.id}`,
    },
  );

  await recordAudit({
    actorUserId: authorId,
    action: 'community.posted',
    entityType: 'blog_post',
    entityId: post.id,
    metadata: { kind: parsed.data.kind, topic: parsed.data.topic, status: 'PENDING' },
    ip: meta.ip ?? null,
  });

  return success({ postId: post.id, pending: true });
}

/**
 * The automatic check, for one post.
 *
 * Reads the posts already published, ranks them against this one, and returns
 * the closest few with the words they share. It is the tool a moderator opens
 * before deciding: it answers "has this been asked?" with evidence rather than
 * with an opinion.
 */
export async function findSimilarPosts(
  post: { id: string; title: string; body: string; topic: string },
  limit = 5,
) {
  const candidates = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED', id: { not: post.id } },
    orderBy: { createdAt: 'desc' },
    take: 400,
    select: {
      id: true,
      title: true,
      body: true,
      topic: true,
      createdAt: true,
      score: true,
      _count: { select: { comments: true } },
      author: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
    },
  });

  const ranked = rankSimilar(post as ComparablePost, candidates as ComparablePost[], limit);

  return ranked.map((entry) => {
    const candidate = candidates.find((row) => row.id === entry.post.id)!;
    return {
      id: candidate.id,
      title: candidate.title,
      body: candidate.body,
      topic: candidate.topic,
      createdAt: candidate.createdAt,
      score: candidate.score,
      comments: candidate._count.comments,
      authorName:
        candidate.author.profile?.fullName?.trim() || candidate.author.email || 'A member',
      match: entry.match,
      sameTopic: candidate.topic === post.topic,
      aboveThreshold: entry.match.score >= SIMILARITY_THRESHOLD,
    };
  });
}

/** The queue: everything written and not yet decided, oldest first. */
export async function listPendingPosts() {
  const rows = await prisma.blogPost.findMany({
    where: { status: 'PENDING' },
    relationLoadStrategy: 'join',
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      kind: true,
      topic: true,
      title: true,
      body: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          email: true,
          accountType: true,
          verificationStatus: true,
          isDemo: true,
          createdAt: true,
          profile: { select: { fullName: true, avatarDocumentId: true } },
        },
      },
      listing: { select: { id: true, displayName: true } },
      _count: { select: { comments: true } },
    },
  });

  // The check runs on the way out, so the queue is a list of decisions to make
  // rather than a list of posts to read one by one.
  return Promise.all(
    rows.map(async (post) => ({
      ...post,
      similar: await findSimilarPosts(post),
    })),
  );
}

/** One post for the moderator's tool, with the automatic check run against it. */
export async function getPostForReview(postId: string) {
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    relationLoadStrategy: 'join',
    select: {
      id: true,
      kind: true,
      topic: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      moderationNote: true,
      moderationReason: true,
      similarityScore: true,
      similarityTerms: true,
      duplicateOfId: true,
      duplicateOf: { select: { id: true, title: true } },
      listing: { select: { id: true, displayName: true } },
      author: {
        select: {
          id: true,
          email: true,
          accountType: true,
          verificationStatus: true,
          isDemo: true,
          createdAt: true,
          profile: { select: { fullName: true, avatarDocumentId: true } },
          _count: { select: { blogPosts: true } },
        },
      },
      _count: { select: { comments: true, votes: true } },
    },
  });
  if (!post) return null;

  return { ...post, similar: await findSimilarPosts(post) };
}

export async function addComment(
  authorId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ commentId: string }>> {
  const parsed = commentSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const post = await prisma.blogPost.findUnique({
    where: { id: parsed.data.postId },
    select: { id: true, status: true, authorId: true, title: true },
  });
  if (!post || post.status !== 'PUBLISHED') {
    return failure('That post is not open for replies.', { status: 404 });
  }

  if (parsed.data.parentId) {
    const parent = await prisma.blogComment.findUnique({
      where: { id: parsed.data.parentId },
      select: { id: true, postId: true, parentId: true, authorId: true },
    });
    if (!parent || parent.postId !== post.id) {
      return failure('That reply is not on this post.', { status: 404 });
    }
    // One level of replies: a reply to a reply lands in the same thread as the
    // comment it answers, which is what keeps a phone-width thread readable.
    if (parent.parentId) {
      await prisma.blogComment.update({
        where: { id: parsed.data.parentId },
        data: { parentId: parent.parentId },
      });
    }
  }

  const comment = await prisma.blogComment.create({
    data: {
      postId: post.id,
      authorId,
      parentId: parsed.data.parentId,
      body: parsed.data.body,
    },
    select: { id: true, parentId: true },
  });

  const notifyUser = parsed.data.parentId
    ? (await prisma.blogComment.findUnique({
        where: { id: comment.parentId! },
        select: { authorId: true },
      }))?.authorId
    : post.authorId;

  if (notifyUser && notifyUser !== authorId) {
    await notify({
      userId: notifyUser,
      kind: 'community.replied',
      title: `Reply on “${post.title}”`,
      body: parsed.data.body.slice(0, 140),
      link: `/blog/${post.id}`,
    });
  }

  await recordAudit({
    actorUserId: authorId,
    action: 'blog.commented',
    entityType: 'blog_comment',
    entityId: comment.id,
    metadata: { postId: post.id, reply: Boolean(comment.parentId) },
    ip: meta.ip ?? null,
  });

  // Published data is cached, so a change clears it rather than waiting out the TTL.
  invalidate('directory:');
  invalidate('reviews:');
  invalidate('community:');

  return success({ commentId: comment.id });
}

/**
 * Up, down, or take the vote back.
 *
 * The score on the row is rewritten from the votes themselves, rather than
 * incremented, so it cannot drift away from what people actually voted.
 */
export async function voteOnPost(
  userId: string,
  rawInput: unknown,
): Promise<ServiceResult<{ score: number; value: number }>> {
  const parsed = voteSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const post = await prisma.blogPost.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, status: true, authorId: true },
  });
  if (!post || post.status !== 'PUBLISHED') return failure('That post is not open to votes.', { status: 404 });

  if (parsed.data.value === 0) {
    await prisma.blogVote.deleteMany({ where: { postId: post.id, userId } });
  } else {
    await prisma.blogVote.upsert({
      where: { userId_postId: { userId, postId: post.id } },
      create: { userId, postId: post.id, value: parsed.data.value },
      update: { value: parsed.data.value },
    });
  }

  const [up, down] = await Promise.all([
    prisma.blogVote.count({ where: { postId: post.id, value: 1 } }),
    prisma.blogVote.count({ where: { postId: post.id, value: -1 } }),
  ]);

  await prisma.blogPost.update({ where: { id: post.id }, data: { score: up - down } });
  return success({ score: up - down, value: parsed.data.value });
}

export async function voteOnComment(
  userId: string,
  rawInput: unknown,
): Promise<ServiceResult<{ score: number; value: number }>> {
  const parsed = voteSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const comment = await prisma.blogComment.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, status: true },
  });
  if (!comment || comment.status !== 'PUBLISHED') {
    return failure('That reply is not open to votes.', { status: 404 });
  }

  if (parsed.data.value === 0) {
    await prisma.blogCommentVote.deleteMany({ where: { commentId: comment.id, userId } });
  } else {
    await prisma.blogCommentVote.upsert({
      where: { userId_commentId: { userId, commentId: comment.id } },
      create: { userId, commentId: comment.id, value: parsed.data.value },
      update: { value: parsed.data.value },
    });
  }

  const [up, down] = await Promise.all([
    prisma.blogCommentVote.count({ where: { commentId: comment.id, value: 1 } }),
    prisma.blogCommentVote.count({ where: { commentId: comment.id, value: -1 } }),
  ]);

  await prisma.blogComment.update({ where: { id: comment.id }, data: { score: up - down } });
  return success({ score: up - down, value: parsed.data.value });
}

/**
 * Reacting to a post or a comment.
 *
 * One reaction per person per thing: pressing a different one replaces it, and
 * pressing the one already held takes it back. That is how a reaction counter
 * behaves on a feed, and it is what stops a single person counting three times.
 */
export async function reactToPost(
  userId: string,
  rawInput: unknown,
): Promise<ServiceResult<{ kind: string | null; counts: ReactionCounts }>> {
  const parsed = reactionSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const post = await prisma.blogPost.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, status: true, authorId: true, title: true },
  });
  if (!post || post.status !== 'PUBLISHED') {
    return failure('That post is not open to reactions.', { status: 404 });
  }

  const existing = await prisma.blogReaction.findUnique({
    where: { userId_postId: { userId, postId: post.id } },
    select: { kind: true },
  });

  if (!parsed.data.kind || existing?.kind === parsed.data.kind) {
    await prisma.blogReaction.deleteMany({ where: { postId: post.id, userId } });
  } else {
    await prisma.blogReaction.upsert({
      where: { userId_postId: { userId, postId: post.id } },
      create: { userId, postId: post.id, kind: parsed.data.kind },
      update: { kind: parsed.data.kind },
    });
  }

  const reactions = await prisma.blogReaction.findMany({
    where: { postId: post.id },
    select: { kind: true },
  });
  const mine = await prisma.blogReaction.findUnique({
    where: { userId_postId: { userId, postId: post.id } },
    select: { kind: true },
  });

  return success({ kind: mine?.kind ?? null, counts: countReactions(reactions) });
}

export async function reactToComment(
  userId: string,
  rawInput: unknown,
): Promise<ServiceResult<{ kind: string | null; counts: ReactionCounts }>> {
  const parsed = reactionSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const comment = await prisma.blogComment.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, status: true },
  });
  if (!comment || comment.status !== 'PUBLISHED') {
    return failure('That comment is not open to reactions.', { status: 404 });
  }

  const existing = await prisma.blogCommentReaction.findUnique({
    where: { userId_commentId: { userId, commentId: comment.id } },
    select: { kind: true },
  });

  if (!parsed.data.kind || existing?.kind === parsed.data.kind) {
    await prisma.blogCommentReaction.deleteMany({ where: { commentId: comment.id, userId } });
  } else {
    await prisma.blogCommentReaction.upsert({
      where: { userId_commentId: { userId, commentId: comment.id } },
      create: { userId, commentId: comment.id, kind: parsed.data.kind },
      update: { kind: parsed.data.kind },
    });
  }

  const reactions = await prisma.blogCommentReaction.findMany({
    where: { commentId: comment.id },
    select: { kind: true },
  });
  const mine = await prisma.blogCommentReaction.findUnique({
    where: { userId_commentId: { userId, commentId: comment.id } },
    select: { kind: true },
  });

  return success({ kind: mine?.kind ?? null, counts: countReactions(reactions) });
}

export type ReactionCounts = { LIKE: number; HEART: number; WOW: number; total: number };

/** How many of each, and how many altogether. */
export function countReactions(reactions: { kind: string }[]): ReactionCounts {
  const counts: ReactionCounts = { LIKE: 0, HEART: 0, WOW: 0, total: reactions.length };
  for (const reaction of reactions) {
    if (reaction.kind === 'LIKE') counts.LIKE += 1;
    else if (reaction.kind === 'HEART') counts.HEART += 1;
    else if (reaction.kind === 'WOW') counts.WOW += 1;
  }
  return counts;
}

/** The author takes their own post down. */
export async function deleteOwnPost(
  userId: string,
  postId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });
  if (!post) return failure('That post no longer exists.', { status: 404 });
  if (post.authorId !== userId) return failure('That post is not yours to delete.', { status: 403 });

  await prisma.blogPost.delete({ where: { id: post.id } });
  await recordAudit({
    actorUserId: userId,
    action: 'blog.deleted_own',
    entityType: 'blog_post',
    entityId: post.id,
    ip: meta.ip ?? null,
  });
  // Published data is cached, so a change clears it rather than waiting out the TTL.
  invalidate('directory:');
  invalidate('reviews:');
  invalidate('community:');

  return success();
}

// ── Moderation ───────────────────────────────────────────────────────────────

export async function listPostsForModeration(
  status?: 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'REMOVED' | 'DUPLICATE',
) {
  const [rows, counts] = await Promise.all([
    prisma.blogPost.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        kind: true,
        topic: true,
        title: true,
        body: true,
        status: true,
        score: true,
        createdAt: true,
        moderationNote: true,
        moderationReason: true,
        moderatedAt: true,
        author: {
          select: {
            id: true,
            email: true,
            accountType: true,
            isDemo: true,
            profile: { select: { fullName: true } },
          },
        },
        listing: { select: { id: true, displayName: true } },
        _count: { select: { comments: true, votes: true } },
      },
    }),
    prisma.blogPost.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const byStatus = new Map(counts.map((row) => [row.status, row._count._all]));
  return {
    rows,
    pending: byStatus.get('PENDING') ?? 0,
    published: byStatus.get('PUBLISHED') ?? 0,
    hidden: byStatus.get('HIDDEN') ?? 0,
    removed: byStatus.get('REMOVED') ?? 0,
    duplicates: byStatus.get('DUPLICATE') ?? 0,
  };
}

/**
 * The moderator's decision on a post.
 *
 * Four outcomes, and they are different things:
 *
 *   · **published** — it goes on the board. The author is told it is live.
 *   · **duplicate** — the question has been asked already. The post is kept and
 *     linked to the earlier one, and the author is sent there, which is more use
 *     to them than a rejection.
 *   · **hidden** — it stays the author's but leaves the board, with a reason.
 *   · **removed** — the end of it.
 *
 * The automatic check is recorded with the decision, so a later reader can see
 * what the moderator was looking at.
 */
export async function decidePost(
  reviewerId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ status: string }>> {
  const parsed = decisionSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const post = await prisma.blogPost.findUnique({
    where: { id: parsed.data.postId },
    select: {
      id: true,
      authorId: true,
      title: true,
      status: true,
      topic: true,
      body: true,
    },
  });
  if (!post) return failure('That post no longer exists.', { status: 404 });

  const decision = parsed.data.decision;
  let duplicateOfId: string | null = null;

  if (decision === 'DUPLICATE') {
    if (!parsed.data.duplicateOfId) {
      return failure('Choose the post this one repeats.', {
        fieldErrors: { duplicateOfId: 'Choose the earlier post.' },
      });
    }
    const original = await prisma.blogPost.findFirst({
      where: { id: parsed.data.duplicateOfId, status: 'PUBLISHED' },
      select: { id: true, title: true },
    });
    if (!original) {
      return failure('That post is not published, so it cannot be the one being repeated.');
    }
    duplicateOfId = original.id;
  }

  // What the automatic check said, frozen into the record with the decision.
  const similar = await findSimilarPosts(post);
  const best = similar[0] ?? null;

  const status =
    decision === 'PUBLISHED'
      ? 'PUBLISHED'
      : decision === 'DUPLICATE'
        ? 'DUPLICATE'
        : decision === 'HIDDEN'
          ? 'HIDDEN'
          : 'REMOVED';

  await prisma.blogPost.update({
    where: { id: post.id },
    data: {
      status,
      duplicateOfId,
      moderationReason: parsed.data.reason ?? (decision === 'DUPLICATE' ? 'DUPLICATE' : null),
      moderationNote: parsed.data.note ?? null,
      moderatedAt: new Date(),
      moderatedById: reviewerId,
      reviewedAt: new Date(),
      similarityScore: best?.match.score ?? null,
      similarityPostId: best?.id ?? null,
      similarityTerms: best?.match.sharedTerms.join(', ') ?? null,
    },
  });

  const author = await prisma.user.findUnique({
    where: { id: post.authorId },
    select: { id: true },
  });

  if (author) {
    if (decision === 'PUBLISHED') {
      await notify({
        userId: author.id,
        kind: 'community.published',
        title: `Your post is on the board`,
        body: `“${post.title}” is published. You will be told when somebody replies.`,
        link: `/blog/${post.id}`,
      });

      // Praise is worth an alert, but only once it is actually on the board.
      const full = await prisma.blogPost.findUnique({
        where: { id: post.id },
        select: { listing: { select: { id: true, userId: true, displayName: true } } },
      });
      const listing = full?.listing;
      if (listing && listing.userId !== author.id) {
        await notify({
          userId: listing.userId,
          kind: 'community.recommended',
          title: 'You were recommended',
          body: `Somebody posted “${post.title}” about ${listing.displayName}.`,
          link: `/blog/${post.id}`,
        });
      }
    } else if (decision === 'DUPLICATE') {
      await notify({
        userId: author.id,
        kind: 'community.duplicate',
        title: 'Your question has been asked already',
        body: `“${post.title}” repeats an earlier post, and a moderator has linked the two. The answers are there.`,
        link: `/blog/${duplicateOfId}`,
      });
    } else {
      await notify({
        userId: author.id,
        kind: 'community.moderated',
        title: decision === 'HIDDEN' ? 'Your post was hidden' : 'Your post was removed',
        body: parsed.data.note
          ? `“${post.title}”: ${parsed.data.note}`
          : `“${post.title}” was ${decision === 'HIDDEN' ? 'hidden' : 'removed'} by a moderator.`,
        link: `/blog/${post.id}`,
      });
    }
  }

  await recordAudit({
    actorUserId: reviewerId,
    action: `community.${status.toLowerCase()}`,
    entityType: 'blog_post',
    entityId: post.id,
    metadata: {
      decision,
      reason: parsed.data.reason ?? null,
      duplicateOfId,
      similarity: best?.match.score ?? null,
    },
    ip: meta.ip ?? null,
  });

  // Published data is cached, so a change clears it rather than waiting out the TTL.
  invalidate('directory:');
  invalidate('reviews:');
  invalidate('community:');

  return success({ status });
}

/**
 * An administrator hides a post or puts it back.
 *
 * Kept for the moderation list, where a published post is taken down after a
 * report rather than in the review queue.
 */
export async function setPostStatus(
  reviewerId: string,
  postId: string,
  status: 'PUBLISHED' | 'HIDDEN' | 'REMOVED',
  note: string | null,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const result = await decidePost(
    reviewerId,
    { postId, decision: status, note },
    meta,
  );
  return result.ok ? success() : result;
}

/** How many posts are waiting for a moderator, for the console badge. */
export async function moderationCount(): Promise<number> {
  return prisma.blogPost.count({ where: { status: 'PENDING' } });
}
