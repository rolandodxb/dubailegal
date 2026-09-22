import { AccountType, Emirate, LegalArea } from '@prisma/client';
import type { DirectoryQuery } from '@/server/services/directory-service';

export type RawSearchParams = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toSingle(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Turns URL search parameters into a validated directory query.
 *
 * Unknown or malformed values are dropped rather than passed to the database,
 * so a hand-edited URL can only ever produce a narrower query, never an error
 * page or an unfiltered dump.
 */
export function parseDirectoryParams(params: RawSearchParams): DirectoryQuery {
  const areaValues = toArray(params.areas).filter((value): value is LegalArea =>
    Object.prototype.hasOwnProperty.call(LegalArea, value),
  );
  const emirateValues = toArray(params.emirates).filter((value): value is Emirate =>
    Object.prototype.hasOwnProperty.call(Emirate, value),
  );

  const kindRaw = toSingle(params.kind);
  const kind: AccountType | 'ALL' | undefined =
    kindRaw && Object.prototype.hasOwnProperty.call(AccountType, kindRaw)
      ? (kindRaw as AccountType)
      : kindRaw === 'ALL'
        ? 'ALL'
        : undefined;

  const pageRaw = toSingle(params.page);
  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;

  const query = toSingle(params.q)?.slice(0, 120);

  return {
    q: query && query.trim().length > 0 ? query.trim() : undefined,
    kind,
    areas: areaValues,
    emirates: emirateValues,
    verifiedOnly: toSingle(params.verifiedOnly) === 'on' || toSingle(params.verifiedOnly) === 'true',
    acceptsNewClients:
      toSingle(params.acceptsNewClients) === 'on' || toSingle(params.acceptsNewClients) === 'true',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Rebuilds the directory URL for a different page, preserving every filter. */
export function buildDirectoryUrl(query: DirectoryQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.kind && query.kind !== 'ALL') params.set('kind', query.kind);
  for (const area of query.areas ?? []) params.append('areas', area);
  for (const emirate of query.emirates ?? []) params.append('emirates', emirate);
  if (query.verifiedOnly) params.set('verifiedOnly', 'on');
  if (query.acceptsNewClients) params.set('acceptsNewClients', 'on');
  if (page > 1) params.set('page', String(page));
  const queryString = params.toString();
  return queryString.length > 0 ? `/directory?${queryString}` : '/directory';
}

/** True when at least one filter is narrowing the results. */
export function hasActiveFilters(query: DirectoryQuery): boolean {
  return Boolean(
    query.q ||
      (query.kind && query.kind !== 'ALL') ||
      (query.areas && query.areas.length > 0) ||
      (query.emirates && query.emirates.length > 0) ||
      query.verifiedOnly ||
      query.acceptsNewClients,
  );
}
