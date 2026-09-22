import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getPost } from '@/server/services/blog-service';
import { COMMUNITY_TOPIC_HINT, COMMUNITY_TOPIC_LABEL } from '@/lib/community';
import { minutesLabel } from '@/lib/time';
import { DeletePostButton } from '@/components/forms/BlogForms';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export const metadata: Metadata = { title: 'Post' };

const KIND_LABEL: Record<string, string> = {
  RECOMMENDATION: 'Recommendation',
  QUESTION: 'Question',
  NOTE: 'Experience',
};

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
  const [user, { id }] = await Promise.all([getSessionUser(), params]);

  const post = await getPost(id, user?.id ?? null);
  if (!post) notFound();

  const authorName = post.author.profile?.fullName?.trim() || post.author.email;
  const mine = user?.id === post.authorId;
  const awaitingReview = post.status === 'PENDING';
  const closedAsDuplicate = post.status === 'DUPLICATE';

  return (
    <div className="dl-container max-w-3xl py-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Breadcrumb">
        <Link href="/blog" className="text-brand-700 hover:underline">
          ← Community
        </Link>
        <span className="text-slate-300">/</span>
        <Link href={`/blog?topic=${post.topic}`} className="text-brand-700 hover:underline">
          {COMMUNITY_TOPIC_LABEL[post.topic] ?? post.topic}
        </Link>
      </nav>

      {awaitingReview ? (
        <Alert tone="info" className="mt-4" title="Waiting for a moderator">
          This post is not on the board yet. A moderator reads it first, mostly to check whether the
          question has been asked and answered already — in which case they will point you at that
          thread rather than leaving you with nothing.
          {mine ? ' Only you and the moderators can see it.' : null}
        </Alert>
      ) : null}

      {closedAsDuplicate && post.duplicateOf ? (
        <Alert tone="warning" className="mt-4" title="This has been asked already">
          A moderator closed this as a repeat of{' '}
          <Link href={`/blog/${post.duplicateOf.id}`} className="font-medium underline">
            {post.duplicateOf.title}
          </Link>
          . The answers are there.
        </Alert>
      ) : null}

      {post.status === 'HIDDEN' || post.status === 'REMOVED' ? (
        <Alert
          tone="warning"
          className="mt-4"
          title={
            post.status === 'HIDDEN' ? 'This post is hidden from the board' : 'This post was removed'
          }
        >
          {post.moderationNote ?? 'A moderator decided this post should not appear on the board.'}{' '}
          {mine ? 'Only you and the moderators can see it.' : null}
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
              <p className="text-xs uppercase tracking-wider text-slate-500">Recommended</p>
              <p className="mt-0.5 font-medium text-slate-900">{post.listing.displayName}</p>
              {post.listing.headline ? (
                <p className="text-xs text-slate-500">{post.listing.headline}</p>
              ) : null}
            </div>
            <Link href={`/directory/${post.listing.id}`} className={buttonClasses('secondary', 'md')}>
              Open their profile
            </Link>
          </div>
        </Card>
      ) : null}

      {/* Outside the card, where a card full of disabled buttons is not. */}
      {!user ? (
        <Card className="mt-4">
          <p className="text-sm text-slate-700">
            Anyone can read the community.{' '}
            <Link
              href={`/login?next=${encodeURIComponent(`/blog/${post.id}`)}`}
              className="font-medium text-brand-700 hover:underline"
            >
              Sign in
            </Link>{' '}
            to react, comment or ask your own question — it comes back to this thread.
          </p>
        </Card>
      ) : null}

      <p className="mt-8 text-xs text-slate-500">{COMMUNITY_TOPIC_HINT[post.topic] ?? ''}</p>
    </div>
  );
}
