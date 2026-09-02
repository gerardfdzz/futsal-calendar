/**
 * Converts the FCF's local Europe/Madrid wall-clock timestamps
 * (e.g. `"2026-09-26 18:30:00"`) into an unambiguous absolute instant.
 *
 * Deliberately NOT `new Date("2026-09-26 18:30:00")`: that string has no
 * offset, so parsing it falls back to the *host machine's* local time
 * (implementation-defined, and never guaranteed to be Europe/Madrid on a
 * serverless runtime) — it would silently shift kickoff times depending on
 * where the code runs. Instead we parse the wall-clock components with a
 * strict regex and resolve them in `Europe/Madrid` via `zonedWallTimeToUtc`
 * (`shared/timezone.ts`, `Intl.DateTimeFormat`-backed), which picks CET/CEST
 * correctly with no manual DST table. No date library needed for this one
 * call site; revisit (e.g. `luxon`) only if broader date arithmetic shows up
 * later.
 *
 * Known gap: during the DST transition hours (the skipped hour in March,
 * the repeated hour in October) `zonedWallTimeToUtc` resolves
 * deterministically but by convention, not by a single "correct" answer —
 * accepted since matches aren't scheduled in that window.
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
