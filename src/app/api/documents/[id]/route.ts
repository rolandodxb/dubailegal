import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser, isReviewer } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readUpload } from '@/lib/storage';
import { recordAudit } from '@/lib/audit';

/**
 * Serves an uploaded document.
 *
 * Identity documents are private: only the account that uploaded the file, or a
 * reviewer acting on a verification case, may read it. Nothing here is
 * cacheable by a shared cache, and every reviewer read is written to the audit
 * log because it exposes a full Emirates ID.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const viewer = await getSessionUser();
  if (!viewer) {
    return new NextResponse('Not signed in.', { status: 401 });
  }
  if (viewer.status === 'SUSPENDED') {
    return new NextResponse('Account suspended.', { status: 403 });
  }

  const document = await prisma.document.findUnique({
    where: { id },
    select: { id: true, userId: true, storageKey: true, mimeType: true, fileName: true, kind: true },
  });
  if (!document) {
    // Identical response for "does not exist" and "not yours", so the endpoint
    // cannot be used to probe which document ids exist.
    return new NextResponse('Not found.', { status: 404 });
  }

  const isOwner = document.userId === viewer.id;
  const reviewer = isReviewer(viewer);
  // A billing mark is not private: it is printed at the head of every receipt
  // that account issues, and the client holding such a receipt has to be able to
  // load it. Identity documents keep the owner-or-reviewer rule below.
  const isBrandMark = document.kind === 'BRAND_LOGO';
  if (!isOwner && !reviewer && !isBrandMark) {
    return new NextResponse('Not found.', { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readUpload(document.storageKey);
  } catch {
    return new NextResponse('The stored file is missing.', { status: 410 });
  }

  if (reviewer && !isOwner) {
    await recordAudit({
      actorUserId: viewer.id,
      action: 'document.viewed',
      entityType: 'document',
      entityId: document.id,
      metadata: { subjectUserId: document.userId },
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': document.mimeType,
      'Content-Length': String(bytes.byteLength),
      // `inline` so a reviewer can read a PDF in the browser; the filename is
      // sanitised by the response header encoding.
      'Content-Disposition': `inline; filename="${document.fileName.replace(/["\\\r\n]/g, '_')}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; object-src 'none'; sandbox",
    },
  });
}
