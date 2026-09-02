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
