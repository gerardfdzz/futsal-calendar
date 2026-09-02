export interface WallTimeComponents {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

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

export function zonedWallTimeToUtc(wall: WallTimeComponents, timeZone: string): Date {
  const wallAsUtcMs = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);

  const firstOffsetMs = getTimeZoneOffsetMsAt(wallAsUtcMs, timeZone);
  const firstInstantMs = wallAsUtcMs - firstOffsetMs;

  const refinedOffsetMs = getTimeZoneOffsetMsAt(firstInstantMs, timeZone);
  const instantMs = refinedOffsetMs === firstOffsetMs ? firstInstantMs : wallAsUtcMs - refinedOffsetMs;

  return new Date(instantMs);
}

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
