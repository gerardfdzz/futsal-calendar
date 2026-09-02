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

export function parseCalendarRoute(rawUrl: string): CalendarRouteParams {
  let pathname: string;
  try {
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
