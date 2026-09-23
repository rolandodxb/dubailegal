import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { listPendingPosts, listPostsForModeration } from '@/server/services/blog-service';
import { accountTypeLabel, blogKindLabel, communityTopicLabel } from '@/lib/i18n/labels';
import { formatUaeDateTime } from '@/lib/time';
import { Alert, buttonClasses, Card, cx, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.community };
}

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
  const [{ t, effectiveLocale }] = await Promise.all([getI18n(), requireReviewer()]);
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

  /** The stored status stays the stored status; only the word changes. */
  const statusLabel: Record<string, string> = t.admin.blog.status;

  /** How alike two posts are, in the words the reader uses. */
  const alike = (match: { score: number; sharedTerms: string[] }): string => {
    const percent = String(Math.round(match.score * 100));
    return match.sharedTerms.length > 0
      ? t.admin.blog.alikeTerms
          .replace('{percent}', percent)
          .replace('{terms}', match.sharedTerms.join(', '))
      : t.admin.blog.alike.replace('{percent}', percent);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.nav.community}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.blog.intro}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            id: 'PENDING',
            label: t.admin.blog.waitingForReview,
            value: pending,
            href: '/admin/blog?status=PENDING',
          },
          {
            id: 'PUBLISHED',
            label: t.admin.blog.onTheBoard,
            value: published,
            href: '/admin/blog?status=PUBLISHED',
          },
          {
            id: 'DUPLICATE',
            label: t.admin.blog.closedAsRepeats,
            value: duplicates,
            href: '/admin/blog?status=DUPLICATE',
          },
          {
            id: 'HIDDEN',
            label: t.admin.blog.hidden,
            value: hidden,
            href: '/admin/blog?status=HIDDEN',
          },
          {
            id: 'REMOVED',
            label: t.admin.blog.removed,
            value: removed,
            href: '/admin/blog?status=REMOVED',
          },
        ].map((stat) => (
          <Link key={stat.id} href={stat.href} className="block">
            <Card
              className={cx(
                'transition-colors hover:border-brand-400',
                filter && stat.href.endsWith(filter) ? 'ring-2 ring-brand-600' : undefined,
                stat.id === 'PENDING' && stat.value > 0 ? 'border-amber-300' : undefined,
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
          <h2 className="mb-3 font-semibold text-slate-900">
            {t.admin.blog.waitingForReviewCount.replace('{count}', String(queue.length))}
          </h2>
          <ul className="space-y-3">
            {queue.map((post) => {
              const author =
                post.author.profile?.fullName?.trim() || post.author.email || t.admin.blog.aMember;
              const best = post.similar[0] ?? null;
              return (
                <Card as="li" key={post.id} className={best ? 'border-amber-200' : undefined}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                          {communityTopicLabel(t, post.topic)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {blogKindLabel(t, post.kind)} · {author} ·{' '}
                          {accountTypeLabel(t, post.author.accountType)} ·{' '}
                          {formatUaeDateTime(post.createdAt, effectiveLocale)}
                        </span>
                      </div>
                      <h3 className="mt-2 font-medium text-slate-900">{post.title}</h3>
                      <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-slate-700">
                        {post.body}
                      </p>

                      {best ? (
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-amber-800">
                          <Icon name="alertTriangle" size={13} />
                          {t.admin.blog.closestExisting.replace('{title}', best.title)} —{' '}
                          {alike(best.match)}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">{t.admin.blog.nothingSimilar}</p>
                      )}
                    </div>

                    <Link
                      href={`/admin/blog/${post.id}`}
                      className={buttonClasses('primary', 'md')}
                    >
                      <Icon name="search" size={16} />
                      {t.admin.blog.reviewIt}
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
          {t.admin.blog.showingPosts.replace(
            '{status}',
            statusLabel[filter] ?? filter.toLowerCase(),
          )}{' '}
          <Link href="/admin/blog" className="font-medium text-brand-700 hover:underline">
            {t.admin.blog.showEverything}
          </Link>
        </p>
      ) : null}

      {(filter ? decided : decided).length === 0 && queue.length === 0 ? (
        <EmptyState
          title={
            filter
              ? t.admin.blog.emptyNothingStatus.replace(
                  '{status}',
                  statusLabel[filter] ?? filter.toLowerCase(),
                )
              : t.admin.blog.emptyNothingWritten
          }
          description={t.admin.blog.emptyBody}
        />
      ) : null}

      {decided.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            {filter
              ? t.admin.blog.statusPosts.replace(
                  '{status}',
                  statusLabel[filter] ?? filter.toLowerCase(),
                )
              : t.admin.blog.decided}
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
                          {statusLabel[post.status] ?? post.status.toLowerCase()}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                          {communityTopicLabel(t, post.topic)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {post.score} {post.score === 1 ? t.admin.blog.point : t.admin.blog.points}{' '}
                          · {post._count.comments}{' '}
                          {post._count.comments === 1
                            ? t.admin.blog.comment
                            : t.admin.blog.comments}
                        </span>
                      </div>

                      <h3 className="mt-2 font-medium text-slate-900">
                        <Link href={`/blog/${post.id}`} className="hover:underline">
                          {post.title}
                        </Link>
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {author} · {accountTypeLabel(t, post.author.accountType)} ·{' '}
                        {formatUaeDateTime(post.createdAt, effectiveLocale)}
                      </p>
                      {post.moderationNote ? (
                        <p className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
                          {t.admin.blog.noteToAuthor.replace('{note}', post.moderationNote)}
                        </p>
                      ) : null}
                    </div>

                    <Link
                      href={`/admin/blog/${post.id}`}
                      className={buttonClasses('secondary', 'sm')}
                    >
                      {t.common.open}
                    </Link>
                  </div>
                </Card>
              );
            })}
          </ul>
        </section>
      ) : null}

      <Alert tone="info" title={t.admin.blog.recommendationNoticeTitle}>
        {t.admin.blog.recommendationNoticeBody}
      </Alert>

      <p>
        <Link href="/blog" className={buttonClasses('ghost', 'sm')}>
          {t.admin.blog.seeAsMembers}
        </Link>
      </p>
    </div>
  );
}
