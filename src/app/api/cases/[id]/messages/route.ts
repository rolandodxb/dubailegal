import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCaseForViewer } from '@/server/services/case-service';
import { decryptText } from '@/lib/crypto';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 60;

/**
 * Older messages in a case, for scrolling back through a long conversation.
 *
 * Authorisation runs through the same resolver the case page uses, so a change
 * to who can see a case applies here too. A case the caller cannot see returns
 * `404`, identical to a case that does not exist.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (viewer.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'Account suspended.' }, { status: 403 });
  }

  const access = await getCaseForViewer(id, viewer.id);
  if (!access) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const url = new URL(request.url);
  const before = url.searchParams.get('before');
  const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(MAX_LIMIT, Math.max(1, limitParam))
    : DEFAULT_LIMIT;

  // `before` is a message id; the thread is ordered by creation, so everything
  // strictly older than that message is what we want.
  let cursor: { createdAt: Date; id: string } | null = null;
  if (before) {
    cursor = await prisma.caseMessage.findFirst({
      where: { id: before, caseId: id },
      select: { createdAt: true, id: true },
    });
    if (!cursor) return NextResponse.json({ error: 'Unknown cursor.' }, { status: 400 });
  }

  // One extra row tells us whether there is more history above.
  const rows = await prisma.caseMessage.findMany({
    where: {
      caseId: id,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: {
      id: true,
      body: true,
      createdAt: true,
      authorId: true,
      author: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, avatarDocumentId: true } },
        },
      },
      attachments: {
        select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const hasMore = rows.length > limit;
  // The stored text is ciphertext; what goes over the wire is the message.
  const page = (hasMore ? rows.slice(0, limit) : rows).map((row) => ({
    ...row,
    body: decryptText(row.body),
  }));

  // Returned oldest-first so the client can prepend them in order.
  return NextResponse.json(
    {
      messages: page.reverse(),
      hasMore,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
