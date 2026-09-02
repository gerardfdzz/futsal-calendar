/**
 * Low-level IANA-timezone <-> instant conversions, built on `Intl` only
 * (no runtime dependency — see the rationale in `federation/fcf/fcf-date.ts`,
 * which was the first caller of this and still has the fullest write-up).
 *
 * This module has exactly two directions:
 *   - `zonedWallTimeToUtc`: wall-clock components *in a given zone* -> instant.
 *     Used to parse FCF's Europe/Madrid timestamps.
 *   - `getWallTimeComponents`: instant -> wall-clock components *in a given
 *     zone*. Used to render `DTSTART;TZID=Europe/Madrid:...` in the ICS
 *     generator — the inverse operation.
 *
 * Both go through the same primitive, `getTimeZoneOffsetMsAt`, so there is
 * only one piece of DST-sensitive logic to trust.
 */

export interface WallTimeComponents {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

/**
 * UTC offset (in ms, positive to the east) that `timeZone` observes at the
 * given instant, e.g. +3_600_000 for CET, +7_200_000 for CEST.
 */
export function getTimeZoneOffsetMsAt(instantMs: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(new Date(instantMs));
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new Error(`Intl.DateTimeFormat did not return a "${type}" part for timeZone "${timeZone}"`);
    }
    return Number(part.value);
  };

  const asUtcMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));

  return asUtcMs - instantMs;
}

/**
 * Resolves wall-clock components in `timeZone` to an absolute instant.
 *
 * Algorithm: treat the wall-clock components as if they were UTC to get a
 * first-guess instant, ask "what does that instant look like when
 * formatted in `timeZone`?", and use the discrepancy to compute the
 * zone's actual UTC offset for that moment. One refinement pass (sampling
 * the offset again at the corrected instant) makes the result stable
 * across a DST boundary.
 *
 * Known limitation (inherited by every caller): at the two DST transition
 * hours (the nonexistent hour in spring, the repeated hour in autumn) the
 * result is deterministic but not "the" correct answer — there isn't one.
 * See `fcf-date.ts` for the full discussion; it doesn't matter for match
 * kickoff times, which are never scheduled at 02:00-03:59.
 */
export function zonedWallTimeToUtc(wall: WallTimeComponents, timeZone: string): Date {
  const wallAsUtcMs = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);

  const firstOffsetMs = getTimeZoneOffsetMsAt(wallAsUtcMs, timeZone);
  const firstInstantMs = wallAsUtcMs - firstOffsetMs;

  const refinedOffsetMs = getTimeZoneOffsetMsAt(firstInstantMs, timeZone);
  const instantMs = refinedOffsetMs === firstOffsetMs ? firstInstantMs : wallAsUtcMs - refinedOffsetMs;

  return new Date(instantMs);
}

/**
 * The inverse of `zonedWallTimeToUtc`: given an absolute instant, returns
 * its wall-clock components as observed in `timeZone`. Exact (no
 * iteration needed) — `Intl.DateTimeFormat` already resolves the correct
 * offset for a concrete instant.
 */
export function getWallTimeComponents(date: Date, timeZone: string): WallTimeComponents {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new Error(`Intl.DateTimeFormat did not return a "${type}" part for timeZone "${timeZone}"`);
    }
    return Number(part.value);
  };

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}
