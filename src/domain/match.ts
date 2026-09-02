import type { TeamRef } from './team.js';
import type { Venue } from './venue.js';
import type { MatchStatus } from './match-status.js';

/**
 * A single fixture, in our own vocabulary — no FCF field names leak past
 * the federation layer's mapper.
 *
 * There is no `groupName` here: the `/api/competition/partidos` response
 * never sends a human-readable group name, so callers needing one must
 * supply it out of band (e.g. static config keyed by groupId).
 */
export interface Match {
  /** Stable domain id, derived 1:1 from the FCF `CODACTA`. Never changes
   *  when date/time/venue/status change — this is what the ICS UID is
   *  built from. */
  readonly id: string;

  readonly round: number;

  readonly homeTeam: TeamRef;
  readonly awayTeam: TeamRef;

  /** Kickoff instant, already resolved to an absolute point in time (UTC
   *  internally) from the FCF's Europe/Madrid wall-clock string. See
   *  `federation/fcf/fcf-date.ts`. */
  readonly startsAt: Date;

  readonly venue?: Venue;

  readonly groupId: string;

  readonly status: MatchStatus;
}
