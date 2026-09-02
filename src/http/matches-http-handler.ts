import type { FederationProvider } from '../federation/federation-provider.js';
import { getTeamMatches } from '../matches/team-matches.service.js';
import { computeMatchesContentHash } from '../calendar/match-content-hash.js';
import { InvalidRouteError, parseMatchesRoute } from './catalog-route.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];
const MATCHES_CACHE_MAX_AGE_SECONDS = 30 * 60;

export interface TeamMatchesHttpRequest {
  readonly method: string | undefined;
  readonly url: string;
  readonly ifNoneMatch?: string | undefined;
}

export interface TeamMatchesHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export async function handleTeamMatchesRequest(
  provider: FederationProvider,
  request: TeamMatchesHttpRequest,
  logger: HttpLogger = consoleHttpLogger,
): Promise<TeamMatchesHttpResponse> {
  if (request.method === undefined || !ALLOWED_METHODS.includes(request.method.toUpperCase())) {
    return {
      status: 405,
      headers: { Allow: ALLOWED_METHODS.join(', '), 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method Not Allowed',
    };
  }

  let groupId: string;
  let teamId: string;
  try {
    ({ groupId, teamId } = parseMatchesRoute(request.url));
  } catch (error) {
    if (error instanceof InvalidRouteError) {
      return { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: error.message };
    }
    throw error;
  }

  let matches;
  try {
    matches = await getTeamMatches(provider, groupId, teamId);
  } catch (error) {
    logger.error('failed to fetch team matches', {
      groupId,
      teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      body: 'Failed to fetch match data from the federation. Please try again shortly.',
    };
  }

  const etag = computeMatchesContentHash(matches, `${groupId}:${teamId}`);

  const sharedHeaders: Record<string, string> = {
    ETag: etag,
    'Cache-Control': `public, max-age=${MATCHES_CACHE_MAX_AGE_SECONDS}, must-revalidate`,
  };

  if (request.ifNoneMatch !== undefined && request.ifNoneMatch === etag) {
    return { status: 304, headers: sharedHeaders, body: '' };
  }

  const headers: Record<string, string> = { ...sharedHeaders, 'Content-Type': 'application/json; charset=utf-8' };
  const isHead = request.method.toUpperCase() === 'HEAD';
  return { status: 200, headers, body: isHead ? '' : JSON.stringify({ matches }) };
}
