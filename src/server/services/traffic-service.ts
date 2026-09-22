import { prisma } from '@/lib/db';
import { hashIp } from '@/lib/tokens';

/**
 * The traffic register.
 *
 * Every page view and API call the application serves is recorded so an
 * administrator can see what is actually happening. IP addresses are stored
 * only as a keyed digest, never in the clear.
 *
 * The table grows with usage, so writes prune rows older than the retention
 * window on a sampled basis rather than on every request.
 */

/** How long activity is kept. Change here if a longer trail is required. */
export const TRAFFIC_RETENTION_DAYS = 30;

/** Roughly one in this many writes triggers a prune, to keep overhead low. */
const PRUNE_SAMPLE_RATE = 200;

let writesSincePrune = 0;

export type TrafficInput = {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function recordTraffic(input: TrafficInput): Promise<void> {
  try {
    await prisma.trafficLog.create({
      data: {
        method: input.method.slice(0, 10),
        path: input.path.slice(0, 300),
        status: input.status,
        durationMs: Math.max(0, Math.round(input.durationMs)),
        userId: input.userId ?? null,
        ipHash: hashIp(input.ip),
        userAgent: input.userAgent?.slice(0, 300) ?? null,
      },
    });

    writesSincePrune += 1;
    if (writesSincePrune >= PRUNE_SAMPLE_RATE) {
      writesSincePrune = 0;
      await pruneTraffic();
    }
  } catch (error) {
    // Never let activity logging break a request.
    console.error('[traffic] could not record activity', input.path, error);
  }
}

export async function pruneTraffic(): Promise<number> {
  const cutoff = new Date(Date.now() - TRAFFIC_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.trafficLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}

export type TrafficFilters = {
  path?: string;
  userId?: string;
  status?: number;
  page?: number;
};

const PAGE_SIZE = 60;

export async function listTraffic(filters: TrafficFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const where = {
    ...(filters.path ? { path: { contains: filters.path, mode: 'insensitive' as const } } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.trafficLog.count({ where }),
    prisma.trafficLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        method: true,
        path: true,
        status: true,
        durationMs: true,
        ipHash: true,
        userAgent: true,
        createdAt: true,
        userId: true,
        user: { select: { id: true, email: true, accountType: true } },
      },
    }),
  ]);

  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), pageSize: PAGE_SIZE };
}

/** Aggregate view: what was used, by whom, and how it went. */
export async function trafficSummary() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [last24h, errors24h, distinctUsers, topPaths, topUsers, oldest] = await Promise.all([
    prisma.trafficLog.count({ where: { createdAt: { gte: since } } }),
    prisma.trafficLog.count({ where: { createdAt: { gte: since }, status: { gte: 400 } } }),
    prisma.trafficLog
      .findMany({
        where: { createdAt: { gte: since }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      })
      .then((rows) => rows.length),
    prisma.trafficLog.groupBy({
      by: ['path'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { path: 'desc' } },
      take: 8,
    }),
    prisma.trafficLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since }, userId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 8,
    }),
    prisma.trafficLog.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
  ]);

  const userIds = topUsers.map((row) => row.userId).filter((id): id is string => id !== null);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, accountType: true },
  });
  const userMap = new Map(users.map((user) => [user.id, user]));

  return {
    last24h,
    errors24h,
    distinctUsers,
    topPaths: topPaths.map((row) => ({ path: row.path, count: row._count._all })),
    topUsers: topUsers.map((row) => ({
      userId: row.userId,
      count: row._count._all,
      email: row.userId ? (userMap.get(row.userId)?.email ?? 'deleted account') : 'anonymous',
      accountType: row.userId ? (userMap.get(row.userId)?.accountType ?? null) : null,
    })),
    oldest: oldest?.createdAt ?? null,
  };
}

/**
 * Records a page view. Called from the route-group layouts, which all read the
 * session cookie and are therefore rendered per request.
 */
export async function recordPageView(input: {
  path: string;
  status: number;
  durationMs: number;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await recordTraffic({ method: 'GET', ...input });
}
