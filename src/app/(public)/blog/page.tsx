import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { listPosts, listTopicCounts } from '@/server/services/blog-service';
import { COMMUNITY_TOPICS, COMMUNITY_TOPIC_LABEL } from '@/lib/community';
import { minutesLabel } from '@/lib/time';
import { PostForm } from '@/components/forms/BlogForms';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { Alert, buttonClasses, Card, cx, EmptyState } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Community',
  description:
    'Ask what a process really involves, recommend the lawyer or firm you used, and read what other people were told — by topic.',
};

const KIND_LABEL: Record<string, string> = {
  RECOMMENDATION: 'Recommendation',
  QUESTION: 'Question',
  NOTE: 'Experience',
};

/**
 * The community.
 *
 * Its own section rather than a corner of the directory: a topic index first,
 * because somebody arriving with a problem has a subject in mind and not a
 * lawyer's name. Reading is open to anyone; writing needs an account, and a post
 * is read by a moderator before it goes up — mostly to catch the question that
 * has already been answered and point the author at it.
 */
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; topic?: string; recommend?: string }>;
}) {
  const [user, params] = await Promise.all([getSessionUser(), searchParams]);
  const sort = params.sort === 'new' ? 'new' : 'hot';
  const topic = COMMUNITY_TOPICS.some((entry) => entry.value === params.topic) ? params.topic! : null;
  const recommend = params.recommend ?? '';

  const [topics, posts, listings, waiting] = await Promise.all([
    listTopicCounts(),
    listPosts(user?.id ?? null, { sort, topic: topic ?? undefined }),
    user
      ? prisma.listing.findMany({
          where: { published: true },
          orderBy: { displayName: 'asc' },
          take: 200,
          select: { id: true, displayName: true, kind: true },
        })
      : Promise.resolve([]),
    // The author's own posts waiting for a moderator, so they can see where
    // their writing went rather than wondering whether it was lost.
    user
      ? prisma.blogPost.findMany({
          where: { authorId: user.id, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, topic: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const totalPosts = topics.reduce((sum, entry) => sum + entry.posts, 0);
  const totalComments = topics.reduce((sum, entry) => sum + entry.comments, 0);
  const topicMeta = topic ? COMMUNITY_TOPICS.find((entry) => entry.value === topic) : null;

  const href = (next: { sort?: string; topic?: string | null }) => {
    const search = new URLSearchParams();
    const nextSort = next.sort ?? sort;
    const nextTopic = next.topic === undefined ? topic : next.topic;
    if (nextSort === 'new') search.set('sort', 'new');
    if (nextTopic) search.set('topic', nextTopic);
    const query = search.toString();
    return query ? `/blog?${query}` : '/blog';
  };

  return (
    <div className="dl-container max-w-5xl py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-800">
              <Icon name="community" size={18} />
            </span>
            <h1 className="text-2xl font-semibold text-slate-900">Community</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Real answers from people who have been through it: what a process involves, what it cost,
            who helped. Pick a board, or write something of your own.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {totalPosts} post{totalPosts === 1 ? '' : 's'} · {totalComments} comment
            {totalComments === 1 ? '' : 's'} · nothing here is legal advice
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Sort">
          <Link
            href={href({ sort: 'hot' })}
            aria-current={sort === 'hot' ? 'page' : undefined}
            className={buttonClasses(sort === 'hot' ? 'primary' : 'secondary', 'sm')}
          >
            Most useful
          </Link>
          <Link
            href={href({ sort: 'new' })}
            aria-current={sort === 'new' ? 'page' : undefined}
            className={buttonClasses(sort === 'new' ? 'primary' : 'secondary', 'sm')}
          >
            Newest
          </Link>
        </div>
      </header>

      {user && waiting.length > 0 ? (
        <Alert tone="info" className="mt-6" title="Waiting for a moderator">
          <ul className="mt-1 space-y-1 text-sm">
            {waiting.map((post) => (
              <li key={post.id}>
                <Link href={`/blog/${post.id}`} className="font-medium underline">
                  {post.title}
                </Link>{' '}
                <span className="text-xs text-slate-500">
                  · {COMMUNITY_TOPIC_LABEL[post.topic] ?? post.topic} · written{' '}
                  {minutesLabel(post.createdAt)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            A moderator checks whether the question has been asked already before it goes up. Nothing
            is lost in the meantime.
          </p>
        </Alert>
      ) : null}

      {/* ── The boards ───────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {topic ? 'Boards' : 'Choose a board'}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          <li>
            <Link
              href={href({ topic: null })}
              aria-current={topic === null ? 'page' : undefined}
              className={cx(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm',
                topic === null
                  ? 'border-brand-600 bg-brand-50 text-brand-900'
                  : 'border-slate-200 text-slate-700 hover:border-brand-400',
              )}
            >
              <Icon name="inbox" size={15} />
              All boards
              <span className="text-xs text-slate-500">{totalPosts}</span>
            </Link>
          </li>
          {topics.map((entry) => (
            <li key={entry.value}>
              <Link
                href={href({ topic: entry.value })}
                aria-current={topic === entry.value ? 'page' : undefined}
                className={cx(
                  'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm',
                  topic === entry.value
                    ? 'border-brand-600 bg-brand-50 text-brand-900'
                    : 'border-slate-200 text-slate-700 hover:border-brand-400',
                )}
              >
                <Icon name={entry.icon as IconName} size={15} />
                {entry.label}
                <span className="text-xs text-slate-500">{entry.posts}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {topicMeta ? (
        <p className="mt-4 text-sm text-slate-600">
          <strong className="text-slate-900">{topicMeta.label}</strong> — {topicMeta.hint}
        </p>
      ) : null}

      {/* ── Writing ──────────────────────────────────────────────────────── */}
      {user ? (
        <Card className="mt-6">
          <details open={Boolean(recommend)}>
            <summary className="cursor-pointer font-semibold text-slate-900">Write a post</summary>
            <p className="mt-1 mb-4 text-sm text-slate-600">
              Ask something, recommend a professional you used, or write down what happened. A
              moderator reads it first — mostly to check that the question has not been asked and
              answered already, in which case they will point you at that thread.
            </p>
            <PostForm listings={listings} defaultListingId={recommend} defaultTopic={topic ?? ''} />
          </details>
        </Card>
      ) : (
        <Alert tone="info" className="mt-6" title="Sign in to post or vote">
          Reading is open to everyone. To ask a question, recommend a lawyer or vote,{' '}
          <Link href="/login?next=%2Fblog" className="font-medium underline">
            sign in
          </Link>{' '}
          or{' '}
          <Link href="/register?next=%2Fblog" className="font-medium underline">
            create an account
          </Link>
          .
        </Alert>
      )}

      {/* ── The posts ────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-slate-900">
          {topicMeta ? `${topicMeta.label} (${posts.length})` : `Everything (${posts.length})`}
        </h2>

        {posts.length === 0 ? (
          <EmptyState
            title={topicMeta ? `Nothing on ${topicMeta.label} yet` : 'Nothing has been posted yet'}
            description={
              user
                ? 'This is a new board, so it is empty rather than filled with examples. The first post here will be a real one.'
                : 'Sign in to write the first post on this board.'
            }
          />
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id}>
                <CommunityPostCard
                  post={{
                    id: post.id,
                    kind: post.kind,
                    topic: post.topic,
                    title: post.title,
                    body: post.body,
                    score: post.score,
                    myVote: post.myVote,
                    createdAt: post.createdAt,
                    authorId: post.author.id,
                    author: post.author,
                    reactions: post.reactions,
                    listing: post.listing,
                    _count: post._count,
                  }}
                  viewerId={user?.id ?? null}
                  comments={post.comments.filter((comment) => comment.parentId === null)}
                  totalComments={post._count.comments}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
