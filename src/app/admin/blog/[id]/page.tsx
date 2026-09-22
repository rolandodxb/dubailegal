import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireReviewer } from '@/lib/auth';
import { getPostForReview } from '@/server/services/blog-service';
import { SIMILARITY_THRESHOLD, describeMatch } from '@/server/services/community-match';
import { COMMUNITY_TOPIC_LABEL } from '@/lib/community';
import { formatUaeDateTime } from '@/lib/time';
import { ACCOUNT_TYPE_LABEL } from '@/lib/constants';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge } from '@/components/VerificationBadge';
import { ReviewDecisionForm } from '@/components/forms/BlogForms';
import { Alert, Card, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export const metadata: Metadata = { title: 'Review a post' };

/**
 * The review tool.
 *
 * One post, and the automatic check run against it: the posts already published
 * that come closest, each with the words they share and how alike they are, side
 * by side with what was written. The moderator's decision is then a small set of
 * buttons — publish it, close it as a repeat of one of those posts, hide it or
 * remove it — and the check that was on screen is recorded with the decision.
 *
 * The machine never decides. It reads, ranks and explains; a person looks and
 * chooses, which is the only arrangement that can be trusted with somebody's
 * question.
 */
export default async function AdminReviewPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireReviewer();
  const { id } = await params;

  const post = await getPostForReview(id);
  if (!post) notFound();

  const author = post.author.profile?.fullName?.trim() || post.author.email;
  const aboveThreshold = post.similar.filter((entry) => entry.aboveThreshold);
  const belowThreshold = post.similar.filter((entry) => !entry.aboveThreshold);
  const alreadyDecided = post.status !== 'PENDING';

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label="Breadcrumb">
        <Link href="/admin/blog" className="text-brand-700 hover:underline">
          ← Community queue
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
              {COMMUNITY_TOPIC_LABEL[post.topic] ?? post.topic}
            </span>
            <span
              className={cx(
                'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                post.status === 'PENDING'
                  ? 'bg-amber-50 text-amber-900 ring-amber-200'
                  : post.status === 'PUBLISHED'
                    ? 'bg-domain-verification/5 text-domain-verification ring-domain-verification/25'
                    : 'bg-slate-100 text-slate-600 ring-slate-200',
              )}
            >
              {post.status.toLowerCase()}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{post.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {post.kind.toLowerCase()} · written {formatUaeDateTime(post.createdAt)}
            {post.listing ? ` · names ${post.listing.displayName}` : ''}
          </p>
        </div>

        <Card className="w-full max-w-xs">
          <p className="text-xs uppercase tracking-wider text-slate-500">Author</p>
          <div className="mt-2 flex items-start gap-3">
            <Avatar
              userId={post.author.id}
              name={author}
              hasPhoto={Boolean(post.author.profile?.avatarDocumentId)}
              size={40}
            />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900">
                {author}
                {post.author.verificationStatus === 'APPROVED' ? (
                  <VerificationBadge accountType={post.author.accountType} size="sm" />
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    Not verified
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {ACCOUNT_TYPE_LABEL[post.author.accountType]} · joined{' '}
                {formatUaeDateTime(post.author.createdAt)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {post.author._count.blogPosts} post{post.author._count.blogPosts === 1 ? '' : 's'} ·
                this one has {post._count.comments} comment
                {post._count.comments === 1 ? '' : 's'}
              </p>
              <Link
                href={`/admin/users?search=${encodeURIComponent(post.author.email)}`}
                className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline"
              >
                Find the account
              </Link>
            </div>
          </div>
        </Card>
      </header>

      {alreadyDecided ? (
        <Alert tone="info" title="This has been decided">
          {post.status === 'PUBLISHED'
            ? 'It is on the board.'
            : post.status === 'DUPLICATE'
              ? `Closed as a repeat of “${post.duplicateOf?.title ?? 'an earlier post'}”.`
              : `It was ${post.status.toLowerCase()}.`}
          {post.moderationNote ? ` Note to the author: ${post.moderationNote}` : ''}
          {post.similarityScore !== null
            ? ` The automatic check was recorded at ${Math.round(post.similarityScore * 100)}%.`
            : ''}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── What was written ─────────────────────────────────────────────── */}
        <Card>
          <h2 className="font-semibold text-slate-900">The post</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-800">
            {post.body}
          </p>
        </Card>

        {/* ── The automatic check ──────────────────────────────────────────── */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Automatic check</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <Icon name="search" size={12} />
              {post.similar.length} match{post.similar.length === 1 ? '' : 'es'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Every post already on the board, scored against this one. Words that appear in both
            titles count double; rare words count for more than common ones. Anything at or above{' '}
            {Math.round(SIMILARITY_THRESHOLD * 100)}% is flagged.
          </p>

          {post.similar.length === 0 ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Nothing on the board comes close. This looks like a new question.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {[...aboveThreshold, ...belowThreshold].map((match) => (
                <li
                  key={match.id}
                  className={cx(
                    'rounded-lg border p-3',
                    match.aboveThreshold ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link
                      href={`/blog/${match.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {match.title}
                    </Link>
                    <span
                      className={cx(
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
                        match.aboveThreshold
                          ? 'bg-amber-100 text-amber-900 ring-amber-300'
                          : 'bg-slate-100 text-slate-600 ring-slate-200',
                      )}
                    >
                      {Math.round(match.match.score * 100)}%
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {match.sameTopic ? 'Same board' : 'Different board'} · {match.authorName} ·{' '}
                    {formatUaeDateTime(match.createdAt)} · {match.comments} comment
                    {match.comments === 1 ? '' : 's'}
                  </p>

                  {match.match.sharedTerms.length > 0 ? (
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {match.match.sharedTerms.map((term) => (
                        <span
                          key={term}
                          className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700 ring-1 ring-inset ring-slate-200"
                        >
                          {term}
                        </span>
                      ))}
                    </p>
                  ) : null}

                  <p className="mt-2 line-clamp-2 whitespace-pre-line text-xs text-slate-600">
                    {match.body}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">{describeMatch(match.match)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── The decision ───────────────────────────────────────────────────── */}
      <Card className="border-brand-200">
        <h2 className="font-semibold text-slate-900">Your decision</h2>
        <p className="mt-1 mb-4 text-sm text-slate-600">
          Publishing puts it on the board and tells the author. Closing it as a repeat keeps the post
          and sends the author to the thread that already answers it, which is usually more use to
          them than a rejection.
        </p>
        <ReviewDecisionForm
          postId={post.id}
          status={post.status}
          candidates={post.similar.map((match) => ({
            id: match.id,
            title: match.title,
            score: match.match.score,
          }))}
        />
      </Card>
    </div>
  );
}
