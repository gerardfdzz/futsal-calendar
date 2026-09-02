import type { FederationProvider } from '../federation/federation-provider.js';
import { buildTeamCalendar, type TeamCalendarResult } from '../calendar/calendar.service.js';
import { InvalidCalendarRouteError, parseCalendarRoute, type CalendarRouteParams } from './calendar-route.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];

const CACHE_MAX_AGE_SECONDS = 30 * 60;

export interface CalendarHttpRequest {
  readonly method: string | undefined;
  readonly url: string;
  readonly ifNoneMatch?: string | undefined;
}

export interface CalendarHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

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
