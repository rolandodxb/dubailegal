'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  addCommentAction,
  reactToCommentAction,
  reactToPostAction,
  voteOnCommentAction,
  voteOnPostAction,
} from '@/app/actions/blog-actions';
import { initialFormState } from '@/lib/form-state';
import { REACTIONS } from '@/lib/community';
import { cx } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

/**
 * The written parts of the community controls, resolved on the server.
 *
 * These are client components, so they cannot read the dictionary themselves;
 * the post card hands them the words for the language this request is in. One
 * object rather than a dozen loose props.
 */
export type CommunityLabels = {
  /** The three reactions, keyed by the value stored with a reaction. */
  reactions: Record<'LIKE' | 'HEART' | 'WOW', string>;
  /** An aria-label for a reaction already held; `{label}` is the reaction's name. */
  removeReaction: string;
  reactionOne: string;
  reactionMany: string;
  /** Shown when a reaction could not be saved, so it never looks inert. */
  reactionFailed: string;
  commentOne: string;
  commentMany: string;
  reply: string;
  comment: string;
  replyPlaceholder: string;
  writeComment: string;
  posted: string;
  upvote: string;
  removeUpvote: string;
  downvote: string;
  removeDownvote: string;
};

/** "{count} reactions" in the number the language needs. */
function countLabel(one: string, many: string, count: number): string {
  return (count === 1 ? one : many).replace('{count}', String(count));
}

/**
 * The reaction bar.
 *
 * Three reactions, the count, and the comments — one line under a post, the way
 * a feed puts it. A press on the reaction already held takes it back; a press on
 * a different one replaces it, so one person counts once.
 *
 * Each one carries a written label as well as its icon, which is what a screen
 * reader and a tooltip use.
 */
export function ReactionBar({
  id,
  kind,
  counts,
  myReaction,
  commentCount,
  onComments,
  labels,
}: {
  id: string;
  kind: 'post' | 'comment';
  counts: { LIKE: number; HEART: number; WOW: number; total: number };
  myReaction: string | null;
  commentCount?: number;
  onComments?: () => void;
  labels: CommunityLabels;
}) {
  /**
   * One small request per press, and the counters it returns are the counters in
   * the database.
   *
   * This was a server action and it never ran: the markup was right, the service
   * behind it works, and yet no request reached the server — not even a native form
   * submission. A reaction is a tiny piece of state, so it is sent as what it is.
   */
  const [current, setCurrent] = useState(counts);
  const [mine, setMine] = useState<string | null>(myReaction);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const press = (value: string) => {
    const next = mine === value ? '' : value;
    setFailed(false);
    startTransition(async () => {
      try {
        const response = await fetch('/api/community/reaction', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, kind: next, type: kind }),
        });
        if (!response.ok) {
          setFailed(true);
          return;
        }
        const body = (await response.json()) as { kind: string | null; counts: typeof counts };
        setMine(body.kind);
        setCurrent(body.counts);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
      <div className="flex items-center gap-1">
        {REACTIONS.map((reaction) => {
          const held = mine === reaction.value;
          const count = current[reaction.value as 'LIKE' | 'HEART' | 'WOW'];
          const label = labels.reactions[reaction.value];
          return (
            <button
              key={reaction.value}
              type="button"
              disabled={pending}
              onClick={() => press(reaction.value)}
              aria-pressed={held}
              aria-label={held ? labels.removeReaction.replace('{label}', label) : label}
              title={label}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                held
                  ? 'border-brand-300 bg-brand-50 text-brand-900'
                  : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50',
              )}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {reaction.emoji}
              </span>
              <span className={cx('tabular-nums', held && 'font-semibold')}>{count}</span>
            </button>
          );
        })}
      </div>

      {failed ? (
        <span className="text-xs font-medium text-red-600" role="status">
          {labels.reactionFailed}
        </span>
      ) : null}

      <div className="flex items-center gap-3 text-xs text-slate-500">
        {current.total > 0 ? (
          <span>{countLabel(labels.reactionOne, labels.reactionMany, current.total)}</span>
        ) : null}
        {typeof commentCount === 'number' ? (
          onComments ? (
            <button
              type="button"
              onClick={onComments}
              className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-brand-700"
            >
              <Icon name="message" size={13} />
              {countLabel(labels.commentOne, labels.commentMany, commentCount)}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Icon name="message" size={13} />
              {countLabel(labels.commentOne, labels.commentMany, commentCount)}
            </span>
          )
        ) : null}
      </div>
    </div>
  );
}

/**
 * The up and down arrows, kept for what they are good at: ranking. They are
 * quieter than the reactions, because a feed orders by score and reacts with a
 * heart, and the two are not the same gesture.
 */
export function VoteButtons({
  id,
  score,
  myVote,
  kind,
  labels,
}: {
  id: string;
  score: number;
  myVote: number;
  kind: 'post' | 'comment';
  labels: CommunityLabels;
}) {
  const [state, formAction] = useActionState(
    kind === 'post' ? voteOnPostAction : voteOnCommentAction,
    initialFormState,
  );

  const current = state?.ok ? Number(state.values?.value ?? myVote) : myVote;
  const shown = state?.ok ? Number(state.values?.score ?? score) : score;

  return (
    <form action={formAction} className="flex flex-col items-center gap-0.5">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        name="value"
        value={current === 1 ? 0 : 1}
        aria-label={current === 1 ? labels.removeUpvote : labels.upvote}
        aria-pressed={current === 1}
        className={cx(
          'inline-flex h-6 w-6 items-center justify-center rounded-md border',
          current === 1
            ? 'border-brand-600 bg-brand-50 text-brand-800'
            : 'border-slate-200 text-slate-400 hover:border-brand-400 hover:text-brand-700',
        )}
      >
        <Icon name="arrowUp" size={13} />
      </button>
      <span className="text-xs font-semibold tabular-nums text-slate-700">{shown}</span>
      <button
        type="submit"
        name="value"
        value={current === -1 ? 0 : -1}
        aria-label={current === -1 ? labels.removeDownvote : labels.downvote}
        aria-pressed={current === -1}
        className={cx(
          'inline-flex h-6 w-6 items-center justify-center rounded-md border',
          current === -1
            ? 'border-red-300 bg-red-50 text-red-700'
            : 'border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-600',
        )}
      >
        <Icon name="arrowDown" size={13} />
      </button>
    </form>
  );
}

/**
 * The comment box, which sits inside the post rather than on a page of its own.
 *
 * `parentId` turns it into a reply, which is the same box with the thread
 * already filled in — the way a feed does it.
 */
export function InlineCommentForm({
  postId,
  parentId = null,
  placeholder,
  compact = false,
  labels,
}: {
  postId: string;
  parentId?: string | null;
  placeholder?: string;
  compact?: boolean;
  labels: CommunityLabels;
}) {
  const [state, formAction] = useActionState(addCommentAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      {state && !state.ok && state.message ? (
        <p className="text-xs font-medium text-red-700">{state.message}</p>
      ) : null}
      {state?.ok ? <p className="text-xs font-medium text-green-700">{labels.posted}</p> : null}

      <label htmlFor={`comment-${parentId ?? postId}`} className="sr-only">
        {parentId ? labels.reply : labels.comment}
      </label>
      <textarea
        id={`comment-${parentId ?? postId}`}
        name="body"
        required
        rows={compact ? 2 : 2}
        maxLength={4000}
        placeholder={placeholder ?? (parentId ? labels.replyPlaceholder : labels.writeComment)}
        className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-brand-800"
        >
          <Icon name="send" size={13} />
          {parentId ? labels.reply : labels.comment}
        </button>
      </div>
    </form>
  );
}
