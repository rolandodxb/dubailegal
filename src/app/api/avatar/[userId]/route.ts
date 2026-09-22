import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser, isReviewer } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readUpload } from '@/lib/storage';

/**
 * Serves a profile photo.
 *
 * Who may see it, in order of widening access:
 *   · the owner, always;
 *   · a reviewer, who needs it while checking documents;
 *   · anyone who shares a case with the owner, because you should be able to see
 *     who you are dealing with;
 *   · the public, but only when the owner has published a directory listing —
 *     listing yourself is choosing to be seen.
 *
 * Photos live in the same private store as identity documents and are never
 * served statically.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> },
): Promise<Response> {
  const { userId } = await context.params;

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      avatarDocumentId: true,
      user: { select: { listing: { select: { published: true } } } },
    },
  });
  if (!profile?.avatarDocumentId) {
    return new NextResponse('No photo.', { status: 404 });
  }

  const viewer = await getSessionUser();
  const isOwner = viewer?.id === userId;
  const reviewer = isReviewer(viewer);
  const published = profile.user.listing?.published === true;

  // Somebody who has posted in the community has put their name and face in
  // public already: their photo belongs beside it, for anyone reading.
  const hasPublishedPost =
    !published && !isOwner && !reviewer
      ? (await prisma.blogPost.count({ where: { authorId: userId, status: 'PUBLISHED' } })) > 0
      : false;

  let sharesCase = false;
  if (viewer && !isOwner && !reviewer && !published && !hasPublishedPost) {
    sharesCase = await sharesACase(viewer.id, userId);
  }

  if (!isOwner && !reviewer && !published && !hasPublishedPost && !sharesCase) {
    return new NextResponse('Not found.', { status: 404 });
  }

  const document = await prisma.document.findUnique({
    where: { id: profile.avatarDocumentId },
    select: { storageKey: true, mimeType: true },
  });
  if (!document) return new NextResponse('No photo.', { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readUpload(document.storageKey);
  } catch {
    return new NextResponse('No photo.', { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': document.mimeType,
      'Content-Length': String(bytes.byteLength),
      // Never cached: a photo that was just replaced has to appear at once, in
      // the header, on the listing and in a chat, not five minutes later.
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** True when the two accounts are on opposite sides of the same case. */
async function sharesACase(viewerId: string, ownerId: string): Promise<boolean> {
  const count = await prisma.legalCase.count({
    where: {
      OR: [
        // The viewer is the client and the owner is the assigned lawyer.
        { clientId: viewerId, lawyer: { userId: ownerId } },
        { clientId: viewerId, firm: { userId: ownerId } },
        { clientId: viewerId, firm: { lawyers: { some: { userId: ownerId } } } },
        // The viewer is a professional and the owner is the client.
        { clientId: ownerId, lawyer: { userId: viewerId } },
        { clientId: ownerId, firm: { userId: viewerId } },
        { clientId: ownerId, firm: { lawyers: { some: { userId: viewerId } } } },
      ],
    },
  });
  return count > 0;
}
