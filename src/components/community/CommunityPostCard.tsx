import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge } from '@/components/VerificationBadge';
import { InlineCommentForm, ReactionBar, VoteButtons } from '@/components/community/Reactions';
import { COMMUNITY_TOPIC_LABEL } from '@/lib/community';
import { countReactions } from '@/server/services/blog-service';
import { minutesLabel } from '@/lib/time';

/** The card is rendered from server data and from JSON, so dates arrive both ways. */
function when(value: Date | string): string {
  return minutesLabel(value instanceof Date ? value : new Date(value));
}
import { Card, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export type CommunityAuthor = {
  id: string;
  email: string;
  accountType: string;
  verificationStatus: string;
  profile: {
    fullName: string;
    avatarDocumentId: string | null;
    countryOfResidence?: string | null;
  } | null;
};

export type CommunityComment = {
  id: string;
  body: string;
  score: number;
  createdAt: Date | string;
  authorId: string;
  author: CommunityAuthor;
  myVote?: number;
  reactions?: { kind: string; userId: string }[];
  replies?: CommunityComment[];
};

export type CommunityPost = {
  id: string;
  kind: string;
  topic: string;
  title: string;
  body: string;
  score: number;
  myVote: number;
  createdAt: Date | string;
  status?: string;
  authorId: string;
  author: CommunityAuthor;
  reactions?: { kind: string; userId: string }[];
  listing?: { id: string; displayName: string; kind?: string; headline?: string | null } | null;
  _count?: { comments: number };
  commentCount?: number;
};

const KIND_LABEL: Record<string, string> = {
  RECOMMENDATION: 'Recommendation',
  QUESTION: 'Question',
  NOTE: 'Experience',
};

/** Who wrote it, with the badge — or the plain absence of one. */
export function AuthorLine({ author }: { author: CommunityAuthor }) {
  const name = author.profile?.fullName?.trim() || author.email;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-500">
      <Avatar
        userId={author.id}
        name={name}
        hasPhoto={Boolean(author.profile?.avatarDocumentId)}
        size={34}
      />
      <span className="font-semibold text-slate-800">{name}</span>
      {author.verificationStatus === 'APPROVED' ? (
        <VerificationBadge accountType={author.accountType as 'USER' | 'LAWYER' | 'FIRM'} size="sm" />
      ) : (
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
          Not verified
        </span>
      )}
      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
        {author.accountType === 'FIRM' ? 'Legal firm' : author.accountType === 'LAWYER' ? 'Lawyer' : 'Client'}
      </span>
      {author.profile?.countryOfResidence ? <span>· {author.profile.countryOfResidence}</span> : null}
    </div>
  );
}

function CommentRow({
  comment,
  postId,
  viewerId,
  withReplies,
}: {
  comment: CommunityComment;
  postId: string;
  viewerId: string | null;
  withReplies: boolean;
}) {
  const mine = comment.reactions?.find((reaction) => reaction.userId === viewerId)?.kind ?? null;
  const counts = countReactions(comment.reactions ?? []);

  return (
    <li className="flex gap-3">
      <Avatar
        userId={comment.author.id}
        name={comment.author.profile?.fullName?.trim() || comment.author.email}
        hasPhoto={Boolean(comment.author.profile?.avatarDocumentId)}
        size={32}
      />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-slate-100 px-3.5 py-2">
          <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-800">
            {comment.author.profile?.fullName?.trim() || comment.author.email}
            {comment.author.verificationStatus === 'APPROVED' ? (
              <VerificationBadge
                accountType={comment.author.accountType as 'USER' | 'LAWYER' | 'FIRM'}
                size="sm"
              />
            ) : null}
          </p>
          <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-slate-800">
            {comment.body}
          </p>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-3 pl-1">
          <span className="text-[11px] text-slate-400">{when(comment.createdAt)}</span>
          {viewerId ? (
            <ReactionBar
              id={comment.id}
              kind="comment"
              counts={counts}
              myReaction={mine}
            />
          ) : counts.total > 0 ? (
            <span className="text-[11px] text-slate-500">
              {counts.total} reaction{counts.total === 1 ? '' : 's'}
            </span>
          ) : null}
          {withReplies && viewerId ? (
            <details className="w-full">
              <summary className="cursor-pointer text-[11px] font-medium text-brand-700">
                Reply
              </summary>
              <div className="mt-2">
                <InlineCommentForm postId={postId} parentId={comment.id} placeholder="Reply…" compact />
              </div>
            </details>
          ) : null}
        </div>

        {withReplies && comment.replies && comment.replies.length > 0 ? (
          <ul className="mt-3 space-y-3 border-l-2 border-slate-100 pl-4">
            {comment.replies.map((reply) => (
              <CommentRow
                key={reply.id}
                comment={reply}
                postId={postId}
                viewerId={viewerId}
                withReplies={false}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

/**
 * A post, with everything said about it inside it.
 *
 * The shape a feed uses: who wrote it, what they wrote, then the reactions and
 * the comments on the same card. Comments are not separate cards — a thread is
 * part of the post, and the reader should not have to hunt for the answer
 * underneath a wall of boxes. On the feed only the first few are shown, with a
 * link into the post for the rest; on the post page all of them are here.
 *
 * A guest gets the same card without any of the controls, and the invitation to
 * sign in sits **outside** it, because a card full of disabled buttons is a card
 * that says nothing.
 */
export function CommunityPostCard({
  post,
  viewerId,
  comments = [],
  showAllComments = false,
  totalComments,
  className,
}: {
  post: CommunityPost;
  viewerId: string | null;
  comments?: CommunityComment[];
  /** True on the post page, where the whole thread belongs on the card. */
  showAllComments?: boolean;
  totalComments?: number;
  className?: string;
}) {
  const mine = post.reactions?.find((reaction) => reaction.userId === viewerId)?.kind ?? null;
  const counts = countReactions(post.reactions ?? []);
  const commentsShown = showAllComments ? comments : comments.slice(0, 3);
  const commentTotal = totalComments ?? post.commentCount ?? post._count?.comments ?? comments.length;
  const hidden = commentTotal - commentsShown.length;

  return (
    <Card className={cx('p-0', className)}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="hidden sm:block">
            {viewerId ? (
              <VoteButtons id={post.id} score={post.score} myVote={post.myVote} kind="post" />
            ) : (
              <span className="inline-flex min-w-6 justify-center text-sm font-semibold tabular-nums text-slate-700">
                {post.score}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <AuthorLine author={post.author} />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link
                href={`/blog?topic=${post.topic}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-200"
              >
                <Icon name="folder" size={11} />
                {COMMUNITY_TOPIC_LABEL[post.topic] ?? post.topic}
              </Link>
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                {KIND_LABEL[post.kind] ?? post.kind}
              </span>
              <span className="text-[11px] text-slate-400">{when(post.createdAt)}</span>
              {post.listing ? (
                <Link
                  href={`/directory/${post.listing.id}`}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-700 hover:underline"
                >
                  <Icon name="scale" size={12} />
                  {post.listing.displayName}
                </Link>
              ) : null}
            </div>

            {showAllComments ? (
              <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">{post.title}</h1>
            ) : (
              <h3 className="mt-3 text-lg font-semibold leading-snug text-slate-900">
                <Link href={`/blog/${post.id}`} className="hover:underline">
                  {post.title}
                </Link>
              </h3>
            )}

            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-800">
              {post.body}
            </p>
          </div>
        </div>
      </div>

      {/* ── Reactions, and the comments, on the same card ────────────────── */}
      <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
        {viewerId ? (
          <ReactionBar
            id={post.id}
            kind="post"
            counts={counts}
            myReaction={mine}
            commentCount={commentTotal}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {counts.total} reaction{counts.total === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="message" size={13} />
              {commentTotal} comment{commentTotal === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      {commentsShown.length > 0 ? (
        <ul className="space-y-3 border-t border-slate-100 px-4 py-4 sm:px-5">
          {commentsShown.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              postId={post.id}
              viewerId={viewerId}
              withReplies={showAllComments}
            />
          ))}
        </ul>
      ) : null}

      {!showAllComments && hidden > 0 ? (
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs sm:px-5">
          <Link href={`/blog/${post.id}`} className="font-medium text-brand-700 hover:underline">
            See all {commentTotal} comments
          </Link>
        </p>
      ) : null}

      {/* The comment box is part of the post when there is somebody to write
          with. A guest gets the card without it, and the invitation to sign in
          is rendered by the page, outside the card. */}
      {viewerId ? (
        <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
          <InlineCommentForm postId={post.id} />
        </div>
      ) : null}
    </Card>
  );
}
