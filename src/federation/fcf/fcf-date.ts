import { zonedWallTimeToUtc, type WallTimeComponents } from '../../shared/timezone.js';

const FCF_TIME_ZONE = 'Europe/Madrid';

// The separator between date and time is deliberately `[ T]`, not a literal space: the FCF
// originally sent "YYYY-MM-DD HH:mm:ss" (space-separated) but switched to an ISO-8601-style
// "YYYY-MM-DDTHH:mm:ss" ("T" separator) at some point — confirmed live 2026-10 against
// COMIENZO1 values for the new season, which silently broke every match (parseFcfDate threw,
// mapFcfMatch caught it per-match and skipped it, so every team's calendar looked genuinely
// empty — no errors visible anywhere in the UI, just nothing to show). Both variants are
// accepted here rather than picking one, since there's no guarantee the FCF won't switch
// back or mix the two across endpoints. Critically, the pattern still has NO trailing
// timezone marker allowed (the `$` anchors right after seconds): a value like
// "2026-09-26T18:30:00Z" must keep throwing, because that trailing "Z" would mean something
// different (an explicit UTC instant) from the naive Europe/Madrid wall-clock time this
// function assumes — accepting "T" as a separator is not the same as accepting ISO 8601
// wholesale.
const FCF_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

export class FcfDateParseError extends Error {
  constructor(raw: string, reason: string) {
    super(`Cannot parse FCF date "${raw}": ${reason}`);
    this.name = 'FcfDateParseError';
  }
}

export function parseFcfDate(raw: string, timeZone: string = FCF_TIME_ZONE): Date {
  const trimmed = raw.trim();
  const match = FCF_DATE_PATTERN.exec(trimmed);
  if (!match) {
    throw new FcfDateParseError(raw, 'does not match expected "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss" format');
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
