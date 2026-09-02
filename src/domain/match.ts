import type { TeamRef } from './team.js';
import type { Venue } from './venue.js';
import type { MatchStatus } from './match-status.js';

export interface Match {
  readonly id: string;

  readonly round: number;

  readonly homeTeam: TeamRef;
  readonly awayTeam: TeamRef;

  readonly startsAt: Date;

  readonly venue?: Venue;

  readonly groupId: string;

  readonly status: MatchStatus;
}
