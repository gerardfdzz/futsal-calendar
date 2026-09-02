import { zonedWallTimeToUtc, type WallTimeComponents } from '../../shared/timezone.js';

const FCF_TIME_ZONE = 'Europe/Madrid';

const FCF_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

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
