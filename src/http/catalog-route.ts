/**
 * Route/query parsing for the JSON endpoints, following the same
 * rationale as `calendar-route.ts`: parse straight from the raw request
 * URL rather than relying on Vercel's own query/route-param injection, so
 * behavior is identical whether a request came through Vercel or through
 * `scripts/dev-server.ts`.
 */
export class InvalidRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRouteError';
  }
}

/** `?disciplinaId=&temporada=` off `/api/competitions` — both optional;
 *  defaults are the handler's job, not this parser's. */
export function parseCompetitionsQuery(rawUrl: string): { disciplinaId?: string; temporada?: string } {
  const url = toUrl(rawUrl);
  const disciplinaId = url.searchParams.get('disciplinaId');
  const temporada = url.searchParams.get('temporada');
  return {
    ...(disciplinaId !== null ? { disciplinaId } : {}),
    ...(temporada !== null ? { temporada } : {}),
  };
}

/** `{competicioId}` out of `/api/competitions/{competicioId}/groups`. */
export function parseGroupsRoute(rawUrl: string): { competicioId: string } {
  const segments = pathSegments(rawUrl);
  const index = segments.indexOf('competitions');
  if (index === -1 || segments.length < index + 3 || segments[index + 2] !== 'groups') {
    throw new InvalidRouteError(`Expected a path like /api/competitions/{competicioId}/groups, got: "${rawUrl}"`);
  }
  const competicioId = decodeSegment(segments[index + 1] ?? '').trim();
  if (competicioId === '') {
    throw new InvalidRouteError(`competicioId must be non-empty, got path: "${rawUrl}"`);
  }
  return { competicioId };
}

/** `{grupId}` out of `/api/groups/{grupId}/teams`. */
export function parseTeamsRoute(rawUrl: string): { grupId: string } {
  const segments = pathSegments(rawUrl);
  const index = segments.indexOf('groups');
  if (index === -1 || segments.length < index + 3 || segments[index + 2] !== 'teams') {
    throw new InvalidRouteError(`Expected a path like /api/groups/{grupId}/teams, got: "${rawUrl}"`);
  }
  const grupId = decodeSegment(segments[index + 1] ?? '').trim();
  if (grupId === '') {
    throw new InvalidRouteError(`grupId must be non-empty, got path: "${rawUrl}"`);
  }
  return { grupId };
}

/** `{groupId}/{teamId}` out of `/api/matches/{groupId}/{teamId}`. */
export function parseMatchesRoute(rawUrl: string): { groupId: string; teamId: string } {
  const segments = pathSegments(rawUrl);
  const index = segments.indexOf('matches');
  if (index === -1 || segments.length < index + 3) {
    throw new InvalidRouteError(`Expected a path like /api/matches/{groupId}/{teamId}, got: "${rawUrl}"`);
  }
  const groupId = decodeSegment(segments[index + 1] ?? '').trim();
  const teamId = decodeSegment(segments[index + 2] ?? '').trim();
  if (groupId === '' || teamId === '') {
    throw new InvalidRouteError(`groupId and teamId must both be non-empty, got path: "${rawUrl}"`);
  }
  return { groupId, teamId };
}

function toUrl(rawUrl: string): URL {
  try {
    // Base URL is arbitrary/unused — `rawUrl` is always a path, `URL`
    // just requires a base to parse a relative one.
    return new URL(rawUrl, 'http://localhost');
  } catch {
    throw new InvalidRouteError(`Could not parse request URL: "${rawUrl}"`);
  }
}

function pathSegments(rawUrl: string): string[] {
  return toUrl(rawUrl)
    .pathname.split('/')
    .filter((segment) => segment.length > 0);
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    throw new InvalidRouteError(`Invalid URL-encoded path segment: "${segment}"`);
  }
}
