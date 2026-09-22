'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requestMeta, requireActiveUser, requireReviewer } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import {
  addComment,
  createPost,
  decidePost,
  deleteOwnPost,
  reactToComment,
  reactToPost,
  setPostStatus,
  voteOnComment,
  voteOnPost,
} from '@/server/services/blog-service';

/**
 * The community section.
 *
 * Writing, replying and voting are for members: this is a place where people
 * recommend professionals they have actually dealt with, which needs an account
 * behind the recommendation. Reading is open to anyone, because a person
 * choosing a lawyer should be able to see what other clients said.
 */

function revalidateCommunity(postId?: string): void {
  revalidatePath('/blog');
  revalidatePath('/admin/blog');
  if (postId) revalidatePath(`/blog/${postId}`);
}

export async function createPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await createPost(
    user.id,
    {
      title: formData.get('title'),
      body: formData.get('body'),
      kind: formData.get('kind'),
      listingId: formData.get('listingId') || null,
    },
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: {
        title: String(formData.get('title') ?? ''),
        body: String(formData.get('body') ?? ''),
        kind: String(formData.get('kind') ?? ''),
        listingId: String(formData.get('listingId') ?? ''),
      },
    };
  }

  revalidateCommunity(result.data.postId);
  // The author is told their post is with a moderator, in the community rather
  // than on a page that leaves them wondering whether it worked.
  redirect(`/blog/${result.data.postId}`);
}

/**
 * The moderator's decision on a post, from the review tool.
 *
 * Nothing here decides anything itself: the automatic check has already been run
 * and shown, and this records what a person chose to do about it.
 */
export async function decidePostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();
  const postId = String(formData.get('postId') ?? '');

  const result = await decidePost(
    reviewer.id,
    {
      postId,
      decision: formData.get('decision'),
      duplicateOfId: formData.get('duplicateOfId') || null,
      reason: formData.get('reason') || null,
      note: formData.get('note') || null,
    },
    meta,
  );

  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }

  revalidateCommunity(postId);
  revalidatePath(`/admin/blog/${postId}`);
  revalidatePath('/admin/blog');

  return {
    ok: true,
    message:
      result.data.status === 'PUBLISHED'
        ? 'Published. The author has been told it is on the board.'
        : result.data.status === 'DUPLICATE'
          ? 'Closed as a repeat. The author has been sent to the earlier post.'
          : result.data.status === 'HIDDEN'
            ? 'Hidden. The author has been told why.'
            : 'Removed. The author has been told.',
  };
}

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const postId = String(formData.get('postId') ?? '');

  const result = await addComment(
    user.id,
    { postId, parentId: formData.get('parentId') || null, body: formData.get('body') },
    meta,
  );

  if (!result.ok) return { ok: false, message: result.message, fieldErrors: result.fieldErrors };

  revalidateCommunity(postId);
  return { ok: true, message: 'Posted.' };
}

export async function voteOnPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const id = String(formData.get('id') ?? '');
  const result = await voteOnPost(user.id, { id, value: formData.get('value') });
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCommunity(id);
  return {
    ok: true,
    message: '',
    values: { value: String(result.data.value), score: String(result.data.score) },
  };
}

export async function voteOnCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const id = String(formData.get('id') ?? '');
  const result = await voteOnComment(user.id, { id, value: formData.get('value') });
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCommunity();
  return {
    ok: true,
    message: '',
    values: { value: String(result.data.value), score: String(result.data.score) },
  };
}

export async function deletePostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const result = await deleteOwnPost(user.id, String(formData.get('postId') ?? ''), meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCommunity();
  redirect('/blog');
}

/** Hides, removes or restores a post. Reviewers only. */
export async function moderatePostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();
  const postId = String(formData.get('postId') ?? '');
  const raw = String(formData.get('status') ?? '');
  const status = raw === 'HIDDEN' || raw === 'REMOVED' || raw === 'PUBLISHED' ? raw : null;

  if (!status) return { ok: false, message: 'Choose what should happen to it.' };

  const result = await setPostStatus(
    reviewer.id,
    postId,
    status,
    String(formData.get('note') ?? '').trim() || null,
    meta,
  );
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCommunity(postId);
  return {
    ok: true,
    message:
      status === 'PUBLISHED'
        ? 'Back in the feed. The author has not been told to expect it.'
        : status === 'HIDDEN'
          ? 'Hidden. The author has been told why.'
          : 'Removed. The author has been told.',
  };
}

/**
 * A reaction: like, love, or surprised.
 *
 * The action returns the whole counter rather than only the press, so the three
 * numbers on screen are the numbers in the database — a reaction that only
 * changed its own button would drift as soon as anybody else reacted.
 */
async function react(
  kind: 'post' | 'comment',
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const id = String(formData.get('id') ?? '');
  const value = String(formData.get('kind') ?? '');

  const result =
    kind === 'post'
      ? await reactToPost(user.id, { id, kind: value })
      : await reactToComment(user.id, { id, kind: value });

  if (!result.ok) return { ok: false, message: result.message };

  revalidateCommunity();
  return {
    ok: true,
    message: '',
    values: {
      kind: result.data.kind ?? '',
      counts: JSON.stringify(result.data.counts),
    },
  };
}

export async function reactToPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return react('post', formData);
}

export async function reactToCommentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return react('comment', formData);
}
