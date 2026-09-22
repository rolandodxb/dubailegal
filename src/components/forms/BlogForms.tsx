'use client';

import { useActionState, useState } from 'react';
import {
  addCommentAction,
  createPostAction,
  decidePostAction,
  deletePostAction,
  moderatePostAction,
  voteOnCommentAction,
  voteOnPostAction,
} from '@/app/actions/blog-actions';
import { BLOG_KINDS } from '@/lib/blog';
import { COMMUNITY_TOPICS } from '@/lib/community';
import { initialFormState } from '@/lib/form-state';
import { Alert, buttonClasses, cx, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Icon } from '@/components/icons';

/** Somewhere in the directory to recommend. Only published profiles are listed. */
export type RecommendableListing = { id: string; displayName: string; kind: string };

/**
 * Writing a post.
 *
 * The kind is asked for first because it changes what the post is for: a
 * recommendation names a professional, a question does not, and a note is
 * neither. Naming a professional is optional either way — a recommendation of
 * "the firm on Sheikh Zayed Road" is still worth reading.
 */
export function PostForm({
  listings,
  defaultListingId = '',
  defaultTopic = '',
}: {
  listings: RecommendableListing[];
  /** Preselected when somebody arrives from a profile page to recommend them. */
  defaultListingId?: string;
  /** Preselected from the board they were reading. */
  defaultTopic?: string;
}) {
  const [state, formAction] = useActionState(createPostAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label="Which board?"
        htmlFor="topic"
        required
        error={state?.fieldErrors?.topic}
        hint="The subject, so somebody with the same problem finds it."
      >
        <Select
          id="topic"
          name="topic"
          required
          defaultValue={state?.values?.topic ?? (defaultTopic || 'OTHER')}
          error={state?.fieldErrors?.topic}
        >
          {COMMUNITY_TOPICS.map((topic) => (
            <option key={topic.value} value={topic.value}>
              {topic.label} — {topic.hint}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What are you posting?" htmlFor="kind" required error={state?.fieldErrors?.kind}>
          <Select
            id="kind"
            name="kind"
            required
            defaultValue={state?.values?.kind ?? (defaultListingId ? 'RECOMMENDATION' : 'QUESTION')}
          >
            {BLOG_KINDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Recommending somebody?"
          htmlFor="listingId"
          error={state?.fieldErrors?.listingId}
          hint="Optional. Pick a profile from the directory and it appears on their page too."
        >
          <Select
            id="listingId"
            name="listingId"
            defaultValue={state?.values?.listingId ?? defaultListingId}
          >
            <option value="">Nobody in particular</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.displayName} — {listing.kind === 'FIRM' ? 'legal firm' : 'lawyer'}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Title" htmlFor="title" required error={state?.fieldErrors?.title}>
        <Input
          id="title"
          name="title"
          required
          maxLength={140}
          defaultValue={state?.values?.title ?? ''}
          error={state?.fieldErrors?.title}
          placeholder="Recommended for a labour dispute — clear and quick"
        />
      </Field>

      <Field
        label="What happened?"
        htmlFor="body"
        required
        error={state?.fieldErrors?.body}
        hint="What you were dealing with, who helped, and what you would tell somebody in the same position. Never post anything confidential about a case."
      >
        <Textarea id="body" name="body" required rows={6} maxLength={8000} defaultValue={state?.values?.body ?? ''} error={state?.fieldErrors?.body} />
      </Field>

      <Alert tone="info" title="A moderator reads this first">
        Posts are checked before they appear on the board, mostly so that a question which has
        already been asked and answered can be pointed at the thread that answers it. Yours is kept
        while it waits — nothing is lost.
      </Alert>

      <SubmitButton pendingLabel="Sending for review…">
        <Icon name="message" size={17} />
        Send for review
      </SubmitButton>
    </form>
  );
}

export function CommentForm({
  postId,
  parentId = null,
  compact = false,
}: {
  postId: string;
  parentId?: string | null;
  compact?: boolean;
}) {
  const [state, formAction] = useActionState(addCommentAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      {state && !state.ok && state.message ? (
        <p className="text-xs font-medium text-red-700">{state.message}</p>
      ) : null}
      {state?.ok ? <p className="text-xs font-medium text-green-700">Posted.</p> : null}

      <input type="hidden" name="postId" value={postId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}

      <label htmlFor={`comment-${parentId ?? postId}`} className="sr-only">
        Reply
      </label>
      <Textarea
        id={`comment-${parentId ?? postId}`}
        name="body"
        required
        rows={compact ? 2 : 3}
        maxLength={4000}
        placeholder={parentId ? 'Reply to this…' : 'Add your answer or experience…'}
        error={state?.fieldErrors?.body}
      />
      <SubmitButton size="sm" variant="secondary" pendingLabel="Posting…">
        {parentId ? 'Reply' : 'Comment'}
      </SubmitButton>
    </form>
  );
}

export function VoteButtons({
  id,
  score,
  myVote,
  kind,
}: {
  id: string;
  score: number;
  myVote: number;
  kind: 'post' | 'comment';
}) {
  const [state, formAction] = useActionState(
    kind === 'post' ? voteOnPostAction : voteOnCommentAction,
    initialFormState,
  );

  const current = state?.ok ? (state.values?.value ?? myVote) : myVote;
  const shown = state?.ok ? (state.values?.score ?? score) : score;

  return (
    <form action={formAction} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        name="value"
        value={current === 1 ? 0 : 1}
        aria-label={current === 1 ? 'Remove your upvote' : 'Upvote'}
        aria-pressed={current === 1}
        className={cx(
          'inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs',
          current === 1
            ? 'border-brand-600 bg-brand-50 text-brand-800'
            : 'border-slate-200 text-slate-500 hover:border-brand-400 hover:text-brand-700',
        )}
      >
        <Icon name="arrowUp" size={14} />
      </button>
      <span className="min-w-7 text-center text-sm font-semibold tabular-nums text-slate-800">
        {shown}
      </span>
      <button
        type="submit"
        name="value"
        value={current === -1 ? 0 : -1}
        aria-label={current === -1 ? 'Remove your downvote' : 'Downvote'}
        aria-pressed={current === -1}
        className={cx(
          'inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs',
          current === -1
            ? 'border-red-300 bg-red-50 text-red-700'
            : 'border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600',
        )}
      >
        <Icon name="arrowDown" size={14} />
      </button>
    </form>
  );
}

/** The author takes their own post down. */
export function DeletePostButton({ postId }: { postId: string }) {
  const [state, formAction] = useActionState(deletePostAction, initialFormState);

  return (
    <form action={formAction}>
      {state && !state.ok && state.message ? (
        <p className="text-xs font-medium text-red-700">{state.message}</p>
      ) : null}
      <input type="hidden" name="postId" value={postId} />
      <SubmitButton
        variant="ghost"
        size="sm"
        confirm="Delete your post and its replies? This cannot be undone."
        pendingLabel="Deleting…"
      >
        Delete
      </SubmitButton>
    </form>
  );
}

/** Hide, restore or remove a post, with the reason the author will see. */
export function ModeratePostForm({
  postId,
  status,
}: {
  postId: string;
  status: 'PUBLISHED' | 'HIDDEN' | 'REMOVED';
}) {
  const [state, formAction] = useActionState(moderatePostAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      {state?.ok && state.message ? (
        <p className="text-xs font-medium text-green-700">{state.message}</p>
      ) : null}
      {state && !state.ok && state.message ? (
        <p className="text-xs font-medium text-red-700">{state.message}</p>
      ) : null}

      <input type="hidden" name="postId" value={postId} />

      {status === 'PUBLISHED' ? (
        <>
          <Field
            label="Reason, if you hide it"
            htmlFor={`note-${postId}`}
            error={state?.fieldErrors?.note}
            hint="Shown to the author. Be plain about what the problem is."
          >
            <Input id={`note-${postId}`} name="note" maxLength={300} />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              name="status"
              value="HIDDEN"
              className={buttonClasses('secondary', 'sm')}
            >
              Hide from the feed
            </button>
            <button
              type="submit"
              name="status"
              value="REMOVED"
              className={buttonClasses('danger', 'sm')}
              onClick={(event) => {
                if (!window.confirm('Remove this post for good?')) event.preventDefault();
              }}
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <button type="submit" name="status" value="PUBLISHED" className={buttonClasses('secondary', 'sm')}>
          Put it back in the feed
        </button>
      )}
    </form>
  );
}

const REASONS = [
  { value: 'DUPLICATE', label: 'Already asked and answered' },
  { value: 'NOT_A_LEGAL_TOPIC', label: 'Not a legal question' },
  { value: 'CONFIDENTIAL_DETAIL', label: 'Gives away a case' },
  { value: 'ABUSIVE', label: 'Abusive' },
  { value: 'ADVERTISING', label: 'Advertising' },
  { value: 'OTHER', label: 'Something else' },
] as const;

/**
 * The moderator's decision.
 *
 * Four buttons, and the one that matters most is the second: closing a post as a
 * repeat of one of the matches the automatic check found. That keeps the post,
 * links the two, and sends the author to the answers.
 */
export function ReviewDecisionForm({
  postId,
  status,
  candidates,
}: {
  postId: string;
  status: string;
  /** The closest existing posts, best first: what it can be a repeat of. */
  candidates: { id: string; title: string; score: number }[];
}) {
  const [state, formAction] = useActionState(decidePostAction, initialFormState);
  const [decision, setDecision] = useState<'PUBLISHED' | 'DUPLICATE' | 'HIDDEN' | 'REMOVED'>(
    'PUBLISHED',
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="postId" value={postId} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">What should happen to it?</legend>

        {(
          [
            {
              value: 'PUBLISHED' as const,
              label: 'Publish it',
              body: 'It goes on the board and the author is told.',
            },
            {
              value: 'DUPLICATE' as const,
              label: 'Close it as a repeat',
              body: 'The question is already answered elsewhere. Pick which post it repeats.',
            },
            {
              value: 'HIDDEN' as const,
              label: 'Hide it',
              body: 'It leaves the board with a reason the author can read. Reversible.',
            },
            {
              value: 'REMOVED' as const,
              label: 'Remove it',
              body: 'The end of it. The author is told.',
            },
          ]
        ).map((option) => (
          <label
            key={option.value}
            className={cx(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
              decision === option.value ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200',
            )}
          >
            <input
              type="radio"
              name="decision"
              value={option.value}
              checked={decision === option.value}
              onChange={() => setDecision(option.value)}
              className="mt-1"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">{option.label}</span>
              <span className="mt-0.5 block text-xs text-slate-600">{option.body}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {decision === 'DUPLICATE' ? (
        <Field
          label="Which post does it repeat?"
          htmlFor="duplicateOfId"
          required
          error={state?.fieldErrors?.duplicateOfId}
          hint="The automatic check is ordered by how close each one is."
        >
          <Select id="duplicateOfId" name="duplicateOfId" required defaultValue="">
            <option value="">Choose the earlier post…</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {Math.round(candidate.score * 100)}% — {candidate.title}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reason" htmlFor="reason" error={state?.fieldErrors?.reason}>
          <Select id="reason" name="reason" defaultValue="OTHER">
            {REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Note to the author"
          htmlFor="note"
          error={state?.fieldErrors?.note}
          hint="Shown with the decision. Be plain about what the problem is."
        >
          <Input id="note" name="note" maxLength={400} />
        </Field>
      </div>

      {status !== 'PENDING' ? (
        <p className="text-xs text-slate-500">
          This post has already been decided. Deciding again replaces that decision.
        </p>
      ) : null}

      <SubmitButton pendingLabel="Saving the decision…">
        <Icon name="check" size={17} />
        Save the decision
      </SubmitButton>
    </form>
  );
}
