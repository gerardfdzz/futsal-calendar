/**
 * Converts the FCF's local Europe/Madrid wall-clock timestamps
 * (e.g. `"2026-09-26 18:30:00"`) into an unambiguous absolute instant
 * (`Date`, internally UTC millis).
 *
 * ## Why not `new Date("2026-09-26 18:30:00")`
 *
 * That string has no timezone/offset information, so `Date`'s parsing
 * behaviour for it is implementation-defined: V8 (Node, Chrome) currently
 * treats a space-separated, non-ISO string like this as *local time of the
 * machine running the code*, but that is not guaranteed by the spec and
 * differs across engines. A Vercel serverless function's "local time" is
 * whatever the underlying container's TZ is (normally UTC) — it is not,
 * and must never be assumed to be, Europe/Madrid. Relying on this would
 * silently shift every kickoff time by 1-2h depending on where the code
 * happens to run, and the bug would only surface in production.
 *
 * ## Strategy
 *
 * 1. Parse the string into plain wall-clock components (year/month/day/
 *    hour/minute/second) with a strict regex — no `Date` involved yet.
 * 2. Resolve those components as a wall-clock time *specifically in
 *    `Europe/Madrid`* into an absolute instant via `zonedWallTimeToUtc`
 *    (see `shared/timezone.ts`), which uses `Intl.DateTimeFormat` (backed
 *    by the IANA tzdata bundled with Node's ICU) to find that zone's UTC
 *    offset at the relevant moment — correctly picking CET (UTC+1) or
 *    CEST (UTC+2) depending on the date, with no manual DST rules to
 *    maintain.
 *
 * This has zero runtime dependencies (no luxon / date-fns-tz / moment).
 * For a single, well-isolated, thoroughly-tested conversion function, a
 * ~40-line implementation on top of a Node built-in is simpler to reason
 * about and audit than pulling in a date library for one call site. If a
 * later milestone needs broader date arithmetic (formatting, relative
 * dates, etc.) across the app, revisit this and consider `luxon` — it has
 * the cleanest IANA-zone API of the mainstream options — but don't add it
 * just for this. (The ICS generator, which needs the *inverse* conversion
 * — instant back to Europe/Madrid wall-clock, for `DTSTART;TZID=...` —
 * reuses the same `shared/timezone.ts` primitives; see
 * `calendar/ics-timezone.ts`.)
 *
 * ## Known limitation
 *
 * Europe/Madrid moves clocks forward on the last Sunday of March (02:00
 * CET -> 03:00 CEST, so 02:00-02:59 does not exist that day) and back on
 * the last Sunday of October (03:00 CEST -> 02:00 CET, so 02:00-02:59
 * occurs twice, ambiguously). `zonedWallTimeToUtc` resolves both cases
 * deterministically (see its tests) but the resolution is a reasonable
 * convention, not a "correct" answer — there isn't one. Futsal matches
 * are not scheduled in that window in practice, so this is an accepted,
 * documented gap rather than something worth over-engineering around.
 */
import { zonedWallTimeToUtc, type WallTimeComponents } from '../../shared/timezone.js';

const FCF_TIME_ZONE = 'Europe/Madrid';

const FCF_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

export class FcfDateParseError extends Error {
  constructor(raw: string, reason: string) {
    super(`Cannot parse FCF date "${raw}": ${reason}`);
    this.name = 'FcfDateParseError';
  }
}

/**
 * Parses a raw `COMIENZO1`-style string ("YYYY-MM-DD HH:mm:ss") assumed to
 * represent local time in `timeZone` (defaults to Europe/Madrid, the only
 * zone the FCF uses) and returns the corresponding absolute instant.
 *
 * Throws `FcfDateParseError` for anything that doesn't match the expected
 * format or contains out-of-range components (month 13, minute 61, ...) —
 * we would rather fail loudly on an unexpected FCF format change than
 * silently produce a wrong kickoff time.
 */
export function parseFcfDate(raw: string, timeZone: string = FCF_TIME_ZONE): Date {
  const trimmed = raw.trim();
  const match = FCF_DATE_PATTERN.exec(trimmed);
  if (!match) {
    throw new FcfDateParseError(raw, 'does not match expected "YYYY-MM-DD HH:mm:ss" format');
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];

  const wall: WallTimeComponents = {
    year: Number(yearStr),
    month: Number(monthStr),
    day: Number(dayStr),
    hour: Number(hourStr),
    minute: Number(minuteStr),
    second: Number(secondStr),
  };

  assertValidWallTime(raw, wall);

  return zonedWallTimeToUtc(wall, timeZone);
}

function assertValidWallTime(raw: string, wall: WallTimeComponents): void {
  if (wall.month < 1 || wall.month > 12) {
    throw new FcfDateParseError(raw, `month ${wall.month} out of range`);
  }
  if (wall.day < 1 || wall.day > 31) {
    throw new FcfDateParseError(raw, `day ${wall.day} out of range`);
  }
  if (wall.hour > 23) {
    throw new FcfDateParseError(raw, `hour ${wall.hour} out of range`);
  }
  if (wall.minute > 59) {
    throw new FcfDateParseError(raw, `minute ${wall.minute} out of range`);
  }
  if (wall.second > 59) {
    throw new FcfDateParseError(raw, `second ${wall.second} out of range`);
  }
}
