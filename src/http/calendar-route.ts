const ICS_SUFFIX = '.ics';

export interface CalendarRouteParams {
  readonly groupId: string;
  readonly teamId: string;
}

export class InvalidCalendarRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCalendarRouteError';
  }
}

/**
 * Parses `groupId`/`teamId` out of a request URL shaped like
 * `/api/calendar/{groupId}/{teamId}.ics` (query string, if any, is
 * ignored) — independent of Vercel's own dynamic-route query injection.
 *
 * We deliberately do NOT rely on Vercel's `req.query.groupId` /
 * `req.query.teamId` (populated from the `api/calendar/[groupId]/
 * [teamId].ts` file route) for two reasons:
 *
 *  1. Vercel's file-based routing captures the WHOLE final path segment
 *     into `teamId`, `.ics` extension included — a request for
 *     `.../54755993.ics` arrives as `query.teamId === "54755993.ics"`.
 *     We'd have to strip the suffix here regardless of where the raw
 *     value came from.
 *  2. Parsing directly from the request URL means this exact
 *     route-parsing behaviour is identical whether the request came
 *     through Vercel or through our own local `node:http`-based dev
 *     server (`scripts/dev-server.mjs`), which has no Vercel-style
 *     route-param injection at all. One function, one set of tests,
 *     two callers.
 *
 * Pure and framework-free: takes a plain string (`req.url`), returns
 * plain data or throws `InvalidCalendarRouteError`. No mocking of
 * Vercel or Node's `http` module needed to test it.
 */
export function parseCalendarRoute(rawUrl: string): CalendarRouteParams {
  let pathname: string;
  try {
    // Base URL is arbitrary/unused — `rawUrl` is always a path, never an
    // absolute URL, but `URL` requires one to parse a relative path.
    pathname = new URL(rawUrl, 'http://localhost').pathname;
  } catch {
    throw new InvalidCalendarRouteError(`Could not parse request URL: "${rawUrl}"`);
  }

  const segments = pathname.split('/').filter((segment) => segment.length > 0);
  const calendarIndex = segments.indexOf('calendar');

  if (calendarIndex === -1 || segments.length < calendarIndex + 3) {
    throw new InvalidCalendarRouteError(
      `Expected a path like /api/calendar/{groupId}/{teamId}.ics, got: "${pathname}"`,
    );
  }

  const groupId = decodeSegment(segments[calendarIndex + 1] ?? '');
  const rawTeamSegment = segments[calendarIndex + 2] ?? '';
  const teamSegment = decodeSegment(rawTeamSegment);

  if (!teamSegment.toLowerCase().endsWith(ICS_SUFFIX)) {
    throw new InvalidCalendarRouteError(`Expected the team segment to end with "${ICS_SUFFIX}", got: "${rawTeamSegment}"`);
  }
  const teamId = teamSegment.slice(0, -ICS_SUFFIX.length).trim();
  const trimmedGroupId = groupId.trim();

  if (trimmedGroupId === '' || teamId === '') {
    throw new InvalidCalendarRouteError(`groupId and teamId must both be non-empty, got path: "${pathname}"`);
  }

  return { groupId: trimmedGroupId, teamId };
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    throw new InvalidCalendarRouteError(`Invalid URL-encoded path segment: "${segment}"`);
  }
}
