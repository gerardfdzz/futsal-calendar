/**
 * Mirrors the backend's `src/domain/match.ts` / `team.ts` / `venue.ts` /
 * `match-status.ts` — the JSON shape `/api/matches/{groupId}/{teamId}`
 * returns (`{ matches: Match[] }`).
 *
 * One deliberate difference: `startsAt` is a `string`, not a `Date`.
 * `JSON.stringify` on the backend's `Date` produces an ISO 8601 string
 * (via `Date.prototype.toJSON`), and `HttpClient` never revives it back
 * into a `Date` automatically — components construct `new Date(startsAt)`
 * at the point they need it (see `core/utils/date-format.ts`).
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
