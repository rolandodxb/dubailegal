import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { communityTopicHint, communityTopicLabel } from '@/lib/i18n/labels';
import { getPost } from '@/server/services/blog-service';
import { DeletePostButton } from '@/components/forms/BlogForms';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.publicPages.blogPost.metaTitle };
}

/**
 * One thread.
 *
 * A post and everything said under it: the comments in order, a reply button on
 * each one, and one box at the end for a general comment. Nothing else — the
 * point of the page is to read the answer and add to it.
 *
 * A post still waiting for a moderator is visible to its author, with the reason
 * it is waiting, and to nobody else.
 */
export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ t }, user, { id }] = await Promise.all([getI18n(), getSessionUser(), params]);
  const labels = t.publicPages.blogPost;

  const post = await getPost(id, user?.id ?? null);
  if (!post) notFound();

  const authorName = post.author.profile?.fullName?.trim() || post.author.email;
  const mine = user?.id === post.authorId;
  const awaitingReview = post.status === 'PENDING';
  const closedAsDuplicate = post.status === 'DUPLICATE';

  return (
    <div className="dl-container max-w-3xl py-8">
      <nav
        className="flex flex-wrap items-center gap-2 text-sm"
        aria-label={t.publicPages.shell.breadcrumb}
      >
        <Link href="/blog" className="text-brand-700 hover:underline">
          {labels.backToCommunity}
        </Link>
        <span className="text-slate-300">/</span>
        <Link href={`/blog?topic=${post.topic}`} className="text-brand-700 hover:underline">
          {communityTopicLabel(t, post.topic)}
        </Link>
      </nav>

      {awaitingReview ? (
        <Alert tone="info" className="mt-4" title={t.publicPages.blog.waitingTitle}>
          {labels.waitingBody}
          {mine ? labels.mineOnly : null}
        </Alert>
      ) : null}

      {closedAsDuplicate && post.duplicateOf ? (
        <Alert tone="warning" className="mt-4" title={labels.duplicateTitle}>
          {labels.duplicateLead}
          <Link href={`/blog/${post.duplicateOf.id}`} className="font-medium underline">
            {post.duplicateOf.title}
          </Link>
          {labels.duplicateTail}
        </Alert>
      ) : null}

      {post.status === 'HIDDEN' || post.status === 'REMOVED' ? (
        <Alert
          tone="warning"
          className="mt-4"
          title={post.status === 'HIDDEN' ? labels.hiddenTitle : labels.removedTitle}
        >
          {post.moderationNote ?? labels.removedBody} {mine ? labels.mineOnly : null}
        </Alert>
      ) : null}

      {/* ── The post, with its whole thread inside it ────────────────────── */}
      <div className="mt-6">
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
            status: post.status,
            authorId: post.authorId,
            author: post.author,
            reactions: post.reactions,
            listing: post.listing,
          }}
          viewerId={user?.id ?? null}
          comments={post.thread}
          totalComments={post.commentCount}
          showAllComments
        />
      </div>

      {mine ? (
        <div className="mt-3">
          <DeletePostButton postId={post.id} />
        </div>
      ) : null}

      {/* The professional being recommended, so the post can be acted on. */}
      {post.listing ? (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-slate-500">{labels.recommended}</p>
              <p className="mt-0.5 font-medium text-slate-900">{post.listing.displayName}</p>
              {post.listing.headline ? (
                <p className="text-xs text-slate-500">{post.listing.headline}</p>
              ) : null}
            </div>
            <Link href={`/directory/${post.listing.id}`} className={buttonClasses('secondary', 'md')}>
              {labels.openProfile}
            </Link>
          </div>
        </Card>
      ) : null}

      {/* Outside the card, where a card full of disabled buttons is not. */}
      {!user ? (
        <Card className="mt-4">
          <p className="text-sm text-slate-700">
            {labels.readOnlyLead}
            <Link
              href={`/login?next=${encodeURIComponent(`/blog/${post.id}`)}`}
              className="font-medium text-brand-700 hover:underline"
            >
              {t.nav.signIn}
            </Link>
            {labels.readOnlyTail}
          </p>
        </Card>
      ) : null}

      <p className="mt-8 text-xs text-slate-500">{communityTopicHint(t, post.topic)}</p>
    </div>
  );
}
