import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getI18n } from '@/lib/i18n';
import { communityTopicHint, communityTopicLabel } from '@/lib/i18n/labels';
import { listPosts, listTopicCounts } from '@/server/services/blog-service';
import { COMMUNITY_TOPICS } from '@/lib/community';
import { PostForm } from '@/components/forms/BlogForms';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { Alert, buttonClasses, Card, cx, EmptyState } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/icons';
import { relativeTime } from '@/lib/i18n/format';
import { composerLabels } from '@/lib/i18n/dict/feed';
import { detectedCountryOrLanguage } from '@/lib/geo-detect';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.community, description: t.publicPages.blog.metaDescription };
}

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
  searchParams: Promise<{ sort?: string; topic?: string; recommend?: string; countries?: string }>;
}) {
  const [{ t }, user, params] = await Promise.all([getI18n(), getSessionUser(), searchParams]);

  // The member's own country first, the network's only as a fallback.
  const userCountry = user
    ? (
        await prisma.user.findUnique({
          where: { id: user.id },
          select: { profile: { select: { countryOfResidenceCode: true } } },
        })
      )?.profile?.countryOfResidenceCode ?? null
    : null;
  const detected = userCountry ? null : await detectedCountryOrLanguage();
  const blog = t.publicPages.blog;
  const sort = params.sort === 'new' ? 'new' : 'hot';
  const topic = COMMUNITY_TOPICS.some((entry) => entry.value === params.topic) ? params.topic! : null;

  /**
   * The board opens on the reader's own country, silently.
   *
   * Same rule as the directory: the country comes from a header the host platform
   * already attached, nothing says so on the page, and `?countries=ALL` — which is
   * what the country control sends for "everywhere" — is respected rather than
   * replaced by the detected country. A member's own recorded country wins over
   * the network, because somebody who has told us where they are should be taken
   * at their word.
   */
  const anywhere = params.countries === 'ALL';
  const explicit = params.countries && /^[A-Za-z]{2}$/.test(params.countries)
    ? params.countries.toUpperCase()
    : null;
  const boardCountries = explicit
    ? [explicit]
    : anywhere
      ? undefined
      : userCountry
        ? [userCountry]
        : detected
          ? [detected]
          : undefined;
  const recommend = params.recommend ?? '';

  const [topics, posts, listings, waiting] = await Promise.all([
    listTopicCounts(),
    listPosts(user?.id ?? null, { sort, topic: topic ?? undefined, countries: boardCountries }),
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
            <h1 className="text-2xl font-semibold text-slate-900">{t.nav.community}</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{blog.intro}</p>
          <p className="mt-2 text-xs text-slate-500">
            {totalPosts === 1
              ? blog.postOne.replace('{count}', String(totalPosts))
              : blog.postOther.replace('{count}', String(totalPosts))}{' '}
            ·{' '}
            {totalComments === 1
              ? blog.commentOne.replace('{count}', String(totalComments))
              : blog.commentOther.replace('{count}', String(totalComments))}{' '}
            · {blog.neverAdvice}
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label={blog.sortNav}>
          <Link
            href={href({ sort: 'hot' })}
            aria-current={sort === 'hot' ? 'page' : undefined}
            className={buttonClasses(sort === 'hot' ? 'primary' : 'secondary', 'sm')}
          >
            {blog.mostUseful}
          </Link>
          <Link
            href={href({ sort: 'new' })}
            aria-current={sort === 'new' ? 'page' : undefined}
            className={buttonClasses(sort === 'new' ? 'primary' : 'secondary', 'sm')}
          >
            {blog.newest}
          </Link>
        </div>
      </header>

      {user && waiting.length > 0 ? (
        <Alert tone="info" className="mt-6" title={blog.waitingTitle}>
          <ul className="mt-1 space-y-1 text-sm">
            {waiting.map((post) => (
              <li key={post.id}>
                <Link href={`/blog/${post.id}`} className="font-medium underline">
                  {post.title}
                </Link>{' '}
                <span className="text-xs text-slate-500">
                  · {communityTopicLabel(t, post.topic)} ·{' '}
                  {blog.written.replace('{time}', relativeTime(t, post.createdAt))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">{blog.waitingBody}</p>
        </Alert>
      ) : null}

      {/* ── The boards ───────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {topic ? blog.boards : blog.chooseBoard}
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
              {t.tabs.allBoards}
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
                {communityTopicLabel(t, entry.value)}
                <span className="text-xs text-slate-500">{entry.posts}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {topicMeta ? (
        <p className="mt-4 text-sm text-slate-600">
          <strong className="text-slate-900">{communityTopicLabel(t, topicMeta.value)}</strong> —{' '}
          {communityTopicHint(t, topicMeta.value)}
        </p>
      ) : null}

      {/* ── Writing ──────────────────────────────────────────────────────── */}
      {user ? (
        <Card className="mt-6">
          <details open={Boolean(recommend)}>
            <summary className="cursor-pointer font-semibold text-slate-900">
              {t.community.writePost}
            </summary>
            <p className="mt-1 mb-4 text-sm text-slate-600">{blog.writeHelp}</p>
            <PostForm
              listings={listings}
              defaultListingId={recommend}
              defaultTopic={topic ?? ''}
              labels={composerLabels(t)}
            />
          </details>
        </Card>
      ) : (
        <Alert tone="info" className="mt-6" title={blog.signInTitle}>
          {blog.signInBodyLead}
          <Link href="/login?next=%2Fblog" className="font-medium underline">
            {t.nav.signIn}
          </Link>{' '}
          {t.publicPages.shell.or}{' '}
          <Link href="/register?next=%2Fblog" className="font-medium underline">
            {t.nav.createAccount}
          </Link>
          {blog.signInBodyTail}
        </Alert>
      )}

      {/* ── The posts ────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-slate-900">
          {topicMeta
            ? `${communityTopicLabel(t, topicMeta.value)} (${posts.length})`
            : blog.everything.replace('{count}', String(posts.length))}
        </h2>

        {posts.length === 0 ? (
          <EmptyState
            title={
              topicMeta
                ? blog.nothingOnTopic.replace('{topic}', communityTopicLabel(t, topicMeta.value))
                : blog.nothingPosted
            }
            description={user ? blog.emptyNewBoard : blog.emptySignIn}
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
