import type { FederationProvider } from '../federation/federation-provider.js';
import { buildTeamCalendar, type TeamCalendarResult } from '../calendar/calendar.service.js';
import { InvalidCalendarRouteError, parseCalendarRoute, type CalendarRouteParams } from './calendar-route.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];

/**
 * How long a client may reuse a previous response before checking again,
 * expressed as `Cache-Control: max-age`.
 *
 * This is NOT a promise that changes propagate within 30 minutes — we
 * cannot control when Apple Calendar (or any subscriber) actually
 * re-polls a `webcal://` URL. It only bounds how long an HTTP-cache-
 * respecting client may serve a stale copy without asking us again.
 */
const CACHE_MAX_AGE_SECONDS = 30 * 60;

export interface CalendarHttpRequest {
  readonly method: string | undefined;
  /** Raw request URL/path, e.g. `req.url` from Node's `http` module or
   *  Vercel's Node runtime — both expose the same shape. */
  readonly url: string;
  /** `If-None-Match` request header, if present. */
  readonly ifNoneMatch?: string | undefined;
}

export interface CalendarHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

/**
 * Framework-agnostic core of the `/api/calendar/{groupId}/{teamId}.ics`
 * endpoint: takes a plain description of the request, returns a plain
 * description of the response, and never touches Node's `http` module or
 * Vercel's request/response types directly.
 *
 * Both the real Vercel handler and the local dev server are thin adapters
 * that call this function and translate the result into their own
 * response API. This function itself is trivial to unit test with plain
 * objects — no mocking Vercel or Node's `http`.
 */
export async function handleCalendarRequest(
  provider: FederationProvider,
  request: CalendarHttpRequest,
  logger: HttpLogger = consoleHttpLogger,
): Promise<CalendarHttpResponse> {
  if (request.method === undefined || !ALLOWED_METHODS.includes(request.method.toUpperCase())) {
    return {
      status: 405,
      headers: { Allow: ALLOWED_METHODS.join(', '), 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method Not Allowed',
    };
  }

  let routeParams: CalendarRouteParams;
  try {
    routeParams = parseCalendarRoute(request.url);
  } catch (error) {
    if (error instanceof InvalidCalendarRouteError) {
      return {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: error.message,
      };
    }
    throw error;
  }

  let result: TeamCalendarResult;
  try {
    result = await buildTeamCalendar(provider, { groupId: routeParams.groupId, teamId: routeParams.teamId });
  } catch (error) {
    // Any failure to reach or parse the FCF is an upstream problem, not a
    // client error: 502 Bad Gateway, and explicitly uncacheable so a
    // transient FCF outage doesn't get "frozen" into a client's cache.
    logger.error('failed to build calendar', {
      groupId: routeParams.groupId,
      teamId: routeParams.teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      body: 'Failed to fetch match data from the federation. Please try again shortly.',
    };
  }

  const sharedHeaders: Record<string, string> = {
    ETag: result.etag,
    'Cache-Control': `public, max-age=${CACHE_MAX_AGE_SECONDS}, must-revalidate`,
    // Best-effort "when was this representation generated" — we have no
    // per-match persistence to derive a truer value from. Same honesty
    // trade-off as ics-generator's LAST-MODIFIED; see that file's doc
    // comment for the full reasoning.
    'Last-Modified': new Date().toUTCString(),
  };

  if (request.ifNoneMatch !== undefined && request.ifNoneMatch === result.etag) {
    return { status: 304, headers: sharedHeaders, body: '' };
  }

  const headers: Record<string, string> = {
    ...sharedHeaders,
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `inline; filename="${routeParams.teamId}.ics"`,
  };

  const isHead = request.method.toUpperCase() === 'HEAD';
  return { status: 200, headers, body: isHead ? '' : result.ics };
}
