import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth';
import { reactToComment, reactToPost } from '@/server/services/blog-service';

/**
 * A reaction to a post or a comment.
 *
 * This is a route rather than a server action, deliberately. The reaction was
 * written as an action first and the action never ran: the markup was correct, the
 * service behind it works when called directly, and yet clicking the button sent no
 * request at all — not even a native form submission reached the server. A reaction
 * is a tiny piece of state, so it does not need the machinery of a form action and
 * a full round of form state; it needs one small request that either works or
 * returns an error the reader can see.
 *
 * The viewer is resolved from the session the ordinary way, so this is exactly as
 * protected as the action was: a signed-out reader is refused with a 401, and the
 * numbers returned are the numbers in the database rather than a local count that
 * would drift as soon as anybody else reacted.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const viewer = await getSessionUser();
  if (!viewer) {
    return NextResponse.json({ error: 'Sign in to react.' }, { status: 401 });
  }
  if (viewer.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'Account suspended.' }, { status: 403 });
  }

  let body: { id?: unknown; kind?: unknown; type?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  const kind = typeof body.kind === 'string' ? body.kind : '';
  const type = body.type === 'comment' ? 'comment' : 'post';

  if (id.length === 0) {
    return NextResponse.json({ error: 'Which post?' }, { status: 400 });
  }

  const result =
    type === 'post'
      ? await reactToPost(viewer.id, { id, kind })
      : await reactToComment(viewer.id, { id, kind });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status ?? 400 });
  }

  // A reaction changes a post's counters, so the cached copies of the community are
  // dropped: a reader who has the page open sees the numbers the database holds on
  // their next navigation rather than a stale count.
  revalidatePath('/blog');
  if (type === 'post') revalidatePath(`/blog/${id}`);

  // The whole counter comes back, so the three numbers on screen are the three
  // numbers in the database.
  return NextResponse.json({ kind: result.data.kind, counts: result.data.counts });
}

export const dynamic = 'force-dynamic';
