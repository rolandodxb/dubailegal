import { headers } from 'next/headers';
import { recordPageView } from '@/server/services/traffic-service';

/**
 * Records a page view in the traffic register.
 *
 * Called from the route-group layouts, which all read the session cookie and so
 * are rendered per request. Duration is left at zero for page views because a
 * layout returns before its children render; durations are meaningful for API
 * calls, which record their own.
 */
export async function logLayoutView(path: string, userId: string | null): Promise<void> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0]!.trim() : headerList.get('x-real-ip');

    // Written without being waited on. The row still lands, but the page does not
    // pay a database round trip for it — on a remote database that is 50 ms off
    // every single page view. The catch keeps a logging failure from surfacing as
    // an unhandled rejection.
    void recordPageView({
      path,
      status: 200,
      durationMs: 0,
      userId,
      ip: ip && ip.length > 0 ? ip : null,
      userAgent: headerList.get('user-agent'),
    }).catch((error) => {
      console.error('[traffic] could not log page view', path, error);
    });
  } catch (error) {
    // Activity logging must never break a page.
    console.error('[traffic] could not log page view', path, error);
  }
}
