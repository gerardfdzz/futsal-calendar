/**
 * Mirrors the backend's `Match`/`TeamRef`/`Venue`/`MatchStatus` shapes.
 * `startsAt` is a `string`, not a `Date`: `HttpClient` never revives JSON
 * dates automatically, so components construct `new Date(startsAt)`
 * where needed.
 */
export type MatchStatus = 'scheduled' | 'finished' | 'postponed' | 'cancelled' | 'unknown';

export interface TeamRef {
  readonly id: string;
  readonly clubId?: string;
  readonly name: string;
  readonly crest?: string;
}

export interface Venue {
  readonly id?: string;
  readonly name: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

export interface Match {
  readonly id: string;
  readonly round: number;
  readonly homeTeam: TeamRef;
  readonly awayTeam: TeamRef;
  readonly startsAt: string;
  readonly venue?: Venue;
  readonly groupId: string;
  readonly status: MatchStatus;
}
