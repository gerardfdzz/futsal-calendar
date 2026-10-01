export class InvalidRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRouteError';
  }
}

export function parseCompetitionsQuery(rawUrl: string): { disciplinaId?: string; temporada?: string } {
  const url = toUrl(rawUrl);
  const disciplinaId = url.searchParams.get('disciplinaId');
  const temporada = url.searchParams.get('temporada');
  return {
    ...(disciplinaId !== null ? { disciplinaId } : {}),
    ...(temporada !== null ? { temporada } : {}),
  };
}

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
