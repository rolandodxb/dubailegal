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
import { localiseFormState } from '@/lib/i18n/form-messages';

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

async function createPostActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
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
async function decidePostActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
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

async function addCommentActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
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

async function voteOnPostActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
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

async function voteOnCommentActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
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

async function deletePostActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const result = await deleteOwnPost(user.id, String(formData.get('postId') ?? ''), meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCommunity();
  redirect('/blog');
}

/** Hides, removes or restores a post. Reviewers only. */
async function moderatePostActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
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

async function reactToPostActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  return react('post', formData);
}

async function reactToCommentActionImpl(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return react('comment', formData);
}

/**
 * The actions, localised.
 *
 * Each one is the same function with its result passed through the message
 * catalogue, so a failed form reads in the language the member is using. The
 * implementation keeps its own name with an `Impl` suffix because a `'use
 * server'` module may only export async function declarations — a wrapped
 * constant would be rejected at build time.
 */
export async function createPostAction(
  ...args: Parameters<typeof createPostActionImpl>
): Promise<Awaited<ReturnType<typeof createPostActionImpl>>> {
  return localiseFormState(await createPostActionImpl(...args));
}

export async function decidePostAction(
  ...args: Parameters<typeof decidePostActionImpl>
): Promise<Awaited<ReturnType<typeof decidePostActionImpl>>> {
  return localiseFormState(await decidePostActionImpl(...args));
}

export async function addCommentAction(
  ...args: Parameters<typeof addCommentActionImpl>
): Promise<Awaited<ReturnType<typeof addCommentActionImpl>>> {
  return localiseFormState(await addCommentActionImpl(...args));
}

export async function voteOnPostAction(
  ...args: Parameters<typeof voteOnPostActionImpl>
): Promise<Awaited<ReturnType<typeof voteOnPostActionImpl>>> {
  return localiseFormState(await voteOnPostActionImpl(...args));
}

export async function voteOnCommentAction(
  ...args: Parameters<typeof voteOnCommentActionImpl>
): Promise<Awaited<ReturnType<typeof voteOnCommentActionImpl>>> {
  return localiseFormState(await voteOnCommentActionImpl(...args));
}

export async function deletePostAction(
  ...args: Parameters<typeof deletePostActionImpl>
): Promise<Awaited<ReturnType<typeof deletePostActionImpl>>> {
  return localiseFormState(await deletePostActionImpl(...args));
}

export async function moderatePostAction(
  ...args: Parameters<typeof moderatePostActionImpl>
): Promise<Awaited<ReturnType<typeof moderatePostActionImpl>>> {
  return localiseFormState(await moderatePostActionImpl(...args));
}

export async function reactToPostAction(
  ...args: Parameters<typeof reactToPostActionImpl>
): Promise<Awaited<ReturnType<typeof reactToPostActionImpl>>> {
  return localiseFormState(await reactToPostActionImpl(...args));
}

export async function reactToCommentAction(
  ...args: Parameters<typeof reactToCommentActionImpl>
): Promise<Awaited<ReturnType<typeof reactToCommentActionImpl>>> {
  return localiseFormState(await reactToCommentActionImpl(...args));
}
