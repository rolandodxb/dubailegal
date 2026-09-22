import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readUpload } from '@/lib/storage';
import { getCaseForViewer } from '@/server/services/case-service';

/**
 * Serves a file attached to a case.
 *
 * Case papers are confidential: only the client who opened the case and the
 * professionals working it may read them. Authorisation runs through the same
 * resolver the case pages use, so a change to who can see a case applies here
 * too. A file that does not exist and a file the caller may not read are both
 * reported as 404.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const viewer = await getSessionUser();
  if (!viewer) return new NextResponse('Not signed in.', { status: 401 });
  if (viewer.status === 'SUSPENDED') return new NextResponse('Account suspended.', { status: 403 });

  const file = await prisma.caseFile.findUnique({
    where: { id },
    select: { id: true, caseId: true, storageKey: true, mimeType: true, fileName: true },
  });

  // A file sent through the conversation is served by the same route, under the
  // same authorisation: the parties on the case, and nobody else.
  const attachment = file
    ? null
    : await prisma.caseMessageAttachment.findUnique({
        where: { id },
        select: {
          id: true,
          storageKey: true,
          mimeType: true,
          fileName: true,
          message: { select: { caseId: true } },
        },
      });
  if (!file && !attachment) return new NextResponse('Not found.', { status: 404 });

  const caseId = file ? file.caseId : attachment!.message.caseId;
  const access = await getCaseForViewer(caseId, viewer.id);
  if (!access) return new NextResponse('Not found.', { status: 404 });

  const served = file ?? attachment!;

  let bytes: Buffer;
  try {
    bytes = await readUpload(served.storageKey);
  } catch {
    return new NextResponse('The stored file is missing.', { status: 410 });
  }

  // An image or a PDF may open in the browser; anything else — an archive, a
  // spreadsheet, a document — is handed over as a download and never rendered.
  const inline = served.mimeType === 'application/pdf' || served.mimeType.startsWith('image/');

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': served.mimeType,
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${served.fileName.replace(/["\\\r\n]/g, '_')}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; object-src 'none'; sandbox",
    },
  });
}
