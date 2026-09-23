import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireReviewer } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { getPostForReview } from '@/server/services/blog-service';
import { SIMILARITY_THRESHOLD } from '@/server/services/community-match';
import { accountTypeLabel, blogKindLabel, communityTopicLabel } from '@/lib/i18n/labels';
import { formatUaeDateTime } from '@/lib/time';
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
  const [{ t }] = await Promise.all([getI18n(), requireReviewer()]);
  const { id } = await params;

  const post = await getPostForReview(id);
  if (!post) notFound();

  const author = post.author.profile?.fullName?.trim() || post.author.email;
  const aboveThreshold = post.similar.filter((entry) => entry.aboveThreshold);
  const belowThreshold = post.similar.filter((entry) => !entry.aboveThreshold);
  const alreadyDecided = post.status !== 'PENDING';

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
      <nav className="text-sm" aria-label={t.admin.blog.breadcrumb}>
        <Link href="/admin/blog" className="text-brand-700 hover:underline">
          {t.admin.blog.communityQueue}
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
              {communityTopicLabel(t, post.topic)}
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
              {statusLabel[post.status] ?? post.status.toLowerCase()}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{post.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {blogKindLabel(t, post.kind)} · {t.admin.blog.written}{' '}
            {formatUaeDateTime(post.createdAt)}
            {post.listing
              ? ` · ${t.admin.blog.names.replace('{name}', post.listing.displayName)}`
              : ''}
          </p>
        </div>

        <Card className="w-full max-w-xs">
          <p className="text-xs uppercase tracking-wider text-slate-500">{t.admin.blog.author}</p>
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
                    {t.verificationStatus.UNVERIFIED}
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {accountTypeLabel(t, post.author.accountType)} ·{' '}
                {t.admin.blog.joined.replace('{date}', formatUaeDateTime(post.author.createdAt))}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {post.author._count.blogPosts}{' '}
                {post.author._count.blogPosts === 1 ? t.admin.blog.post : t.admin.blog.posts} ·{' '}
                {t.admin.blog.thisOneHas} {post._count.comments}{' '}
                {post._count.comments === 1 ? t.admin.blog.comment : t.admin.blog.comments}
              </p>
              <Link
                href={`/admin/users?search=${encodeURIComponent(post.author.email)}`}
                className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline"
              >
                {t.admin.blog.findTheAccount}
              </Link>
            </div>
          </div>
        </Card>
      </header>

      {alreadyDecided ? (
        <Alert tone="info" title={t.admin.blog.thisDecided}>
          {post.status === 'PUBLISHED'
            ? t.admin.blog.itIsOnTheBoard
            : post.status === 'DUPLICATE'
              ? t.admin.blog.closedAsRepeat.replace(
                  '{title}',
                  post.duplicateOf?.title ?? t.admin.blog.anEarlierPost,
                )
              : t.admin.blog.itWas.replace(
                  '{status}',
                  statusLabel[post.status] ?? post.status.toLowerCase(),
                )}
          {post.moderationNote
            ? ` ${t.admin.blog.noteToAuthor.replace('{note}', post.moderationNote)}`
            : ''}
          {post.similarityScore !== null
            ? ` ${t.admin.blog.checkRecorded.replace(
                '{percent}',
                String(Math.round(post.similarityScore * 100)),
              )}`
            : ''}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── What was written ─────────────────────────────────────────────── */}
        <Card>
          <h2 className="font-semibold text-slate-900">{t.admin.blog.thePost}</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-800">
            {post.body}
          </p>
        </Card>

        {/* ── The automatic check ──────────────────────────────────────────── */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">{t.admin.blog.automaticCheck}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <Icon name="search" size={12} />
              {post.similar.length} {post.similar.length === 1 ? t.admin.blog.match : t.admin.blog.matches}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {t.admin.blog.automaticCheckBody.replace(
              '{percent}',
              String(Math.round(SIMILARITY_THRESHOLD * 100)),
            )}
          </p>

          {post.similar.length === 0 ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {t.admin.blog.nothingClose}
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
                    {match.sameTopic ? t.admin.blog.sameBoard : t.admin.blog.differentBoard} ·{' '}
                    {match.authorName} · {formatUaeDateTime(match.createdAt)} · {match.comments}{' '}
                    {match.comments === 1 ? t.admin.blog.comment : t.admin.blog.comments}
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
                  <p className="mt-1 text-[11px] text-slate-400">{alike(match.match)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── The decision ───────────────────────────────────────────────────── */}
      <Card className="border-brand-200">
        <h2 className="font-semibold text-slate-900">{t.admin.blog.yourDecision}</h2>
        <p className="mt-1 mb-4 text-sm text-slate-600">{t.admin.blog.decisionIntro}</p>
        <ReviewDecisionForm
          postId={post.id}
          status={post.status}
          candidates={post.similar.map((match) => ({
            id: match.id,
            title: match.title,
            score: match.match.score,
          }))}
          labels={{
            legend: t.admin.blog.decision.legend,
            publishLabel: t.admin.blog.decision.publishLabel,
            publishBody: t.admin.blog.decision.publishBody,
            duplicateLabel: t.admin.blog.decision.duplicateLabel,
            duplicateBody: t.admin.blog.decision.duplicateBody,
            hideLabel: t.admin.blog.decision.hideLabel,
            hideBody: t.admin.blog.decision.hideBody,
            removeLabel: t.admin.blog.decision.removeLabel,
            removeBody: t.admin.blog.decision.removeBody,
            duplicateOf: t.admin.blog.decision.duplicateOf,
            duplicateHint: t.admin.blog.decision.duplicateHint,
            chooseEarlier: t.admin.blog.decision.chooseEarlier,
            reason: t.admin.blog.decision.reason,
            reasons: t.admin.blog.decision.reasons,
            note: t.admin.blog.decision.note,
            noteHint: t.admin.blog.decision.noteHint,
            alreadyDecided: t.admin.blog.decision.alreadyDecided,
            saving: t.admin.blog.decision.saving,
            save: t.admin.blog.decision.save,
          }}
        />
      </Card>
    </div>
  );
}
