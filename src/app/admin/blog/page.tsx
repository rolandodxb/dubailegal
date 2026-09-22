import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { listPendingPosts, listPostsForModeration } from '@/server/services/blog-service';
import { describeMatch } from '@/server/services/community-match';
import { COMMUNITY_TOPIC_LABEL } from '@/lib/community';
import { formatUaeDateTime } from '@/lib/time';
import { ACCOUNT_TYPE_LABEL } from '@/lib/constants';
import { Alert, buttonClasses, Card, cx, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export const metadata: Metadata = { title: 'Community' };

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-900 ring-amber-200',
  PUBLISHED: 'bg-domain-verification/5 text-domain-verification ring-domain-verification/25',
  DUPLICATE: 'bg-slate-100 text-slate-600 ring-slate-200',
  HIDDEN: 'bg-amber-50 text-amber-900 ring-amber-200',
  REMOVED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/**
 * Community moderation.
 *
 * The queue comes first, because reviewing is a job and the report is not: every
 * post written by a member waits here until somebody has looked at it. Each row
 * carries the automatic check already run against it — the closest existing
 * posts and the words they share — so the question "has this been asked?" is
 * answered before the moderator opens anything.
 */
export default async function AdminCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireReviewer();
  const { status } = await searchParams;
  const filter =
    status === 'PUBLISHED' ||
    status === 'HIDDEN' ||
    status === 'REMOVED' ||
    status === 'DUPLICATE' ||
    status === 'PENDING'
      ? status
      : undefined;

  const [{ rows, pending, published, hidden, removed, duplicates }, queue] = await Promise.all([
    listPostsForModeration(filter),
    // The waiting queue is read with the automatic check already run against
    // each post, so the queue is a list of decisions rather than of reading.
    listPendingPosts(),
  ]);

  const decided = rows.filter((row) => row.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Community</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every post a member writes waits for a moderator before it appears on the board. The useful
          part of that job is noticing that the question has been asked already — so the review screen
          runs an automatic check against the posts already published and shows you the closest
          matches before you decide.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Waiting for review', value: pending, href: '/admin/blog?status=PENDING' },
          { label: 'On the board', value: published, href: '/admin/blog?status=PUBLISHED' },
          { label: 'Closed as repeats', value: duplicates, href: '/admin/blog?status=DUPLICATE' },
          { label: 'Hidden', value: hidden, href: '/admin/blog?status=HIDDEN' },
          { label: 'Removed', value: removed, href: '/admin/blog?status=REMOVED' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="block">
            <Card
              className={cx(
                'transition-colors hover:border-brand-400',
                filter && stat.href.endsWith(filter) ? 'ring-2 ring-brand-600' : undefined,
                stat.label === 'Waiting for review' && stat.value > 0 ? 'border-amber-300' : undefined,
              )}
            >
              <p className="text-sm text-slate-600">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      {queue.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">Waiting for review ({queue.length})</h2>
          <ul className="space-y-3">
            {queue.map((post) => {
              const author =
                post.author.profile?.fullName?.trim() || post.author.email || 'A member';
              const best = post.similar[0] ?? null;
              return (
                <Card as="li" key={post.id} className={best ? 'border-amber-200' : undefined}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                          {COMMUNITY_TOPIC_LABEL[post.topic] ?? post.topic}
                        </span>
                        <span className="text-xs text-slate-500">
                          {post.kind.toLowerCase()} · {author} ·{' '}
                          {ACCOUNT_TYPE_LABEL[post.author.accountType]} ·{' '}
                          {formatUaeDateTime(post.createdAt)}
                        </span>
                      </div>
                      <h3 className="mt-2 font-medium text-slate-900">{post.title}</h3>
                      <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-slate-700">
                        {post.body}
                      </p>

                      {best ? (
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-amber-800">
                          <Icon name="alertTriangle" size={13} />
                          Closest existing post: “{best.title}” — {describeMatch(best.match)}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">
                          Nothing similar on the board.
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/admin/blog/${post.id}`}
                      className={buttonClasses('primary', 'md')}
                    >
                      <Icon name="search" size={16} />
                      Review it
                    </Link>
                  </div>
                </Card>
              );
            })}
          </ul>
        </section>
      ) : null}

      {filter && filter !== 'PENDING' ? (
        <p className="text-sm text-slate-600">
          Showing {filter.toLowerCase()} posts.{' '}
          <Link href="/admin/blog" className="font-medium text-brand-700 hover:underline">
            Show everything
          </Link>
        </p>
      ) : null}

      {(filter ? decided : decided).length === 0 && queue.length === 0 ? (
        <EmptyState
          title={filter ? `Nothing ${filter.toLowerCase()}` : 'Nothing has been written yet'}
          description="When members write posts, they arrive here for review before they appear on the board."
        />
      ) : null}

      {decided.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            {filter ? `${filter.toLowerCase()} posts` : 'Decided'}
          </h2>
          <ul className="space-y-3">
            {decided.map((post) => {
              const author = post.author.profile?.fullName?.trim() || post.author.email;
              return (
                <Card as="li" key={post.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cx(
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                            STATUS_STYLE[post.status] ?? 'bg-slate-100 text-slate-600 ring-slate-200',
                          )}
                        >
                          {post.status.toLowerCase()}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                          {COMMUNITY_TOPIC_LABEL[post.topic] ?? post.topic}
                        </span>
                        <span className="text-xs text-slate-500">
                          {post.score} point{post.score === 1 ? '' : 's'} · {post._count.comments}{' '}
                          comment{post._count.comments === 1 ? '' : 's'}
                        </span>
                      </div>

                      <h3 className="mt-2 font-medium text-slate-900">
                        <Link href={`/blog/${post.id}`} className="hover:underline">
                          {post.title}
                        </Link>
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {author} · {ACCOUNT_TYPE_LABEL[post.author.accountType]} ·{' '}
                        {formatUaeDateTime(post.createdAt)}
                      </p>
                      {post.moderationNote ? (
                        <p className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
                          Note to the author: {post.moderationNote}
                        </p>
                      ) : null}
                    </div>

                    <Link
                      href={`/admin/blog/${post.id}`}
                      className={buttonClasses('secondary', 'sm')}
                    >
                      Open
                    </Link>
                  </div>
                </Card>
              );
            })}
          </ul>
        </section>
      ) : null}

      <Alert tone="info" title="What a recommendation is, and is not">
        Posts are opinions written by members. A recommendation is not a verification: the badge on a
        professional&apos;s profile is the only thing on this platform that says a document was
        checked.
      </Alert>

      <p>
        <Link href="/blog" className={buttonClasses('ghost', 'sm')}>
          See the community as members see it
        </Link>
      </p>
    </div>
  );
}
