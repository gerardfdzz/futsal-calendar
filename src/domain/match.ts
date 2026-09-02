import type { TeamRef } from './team.js';
import type { Venue } from './venue.js';
import type { MatchStatus } from './match-status.js';

/**
 * A single fixture, in our own vocabulary — no FCF field names leak past
 * the federation layer's mapper.
 *
 * Deliberate deviation from the domain model sketched in the project
 * brief: there is no `groupName` here. The `/api/competition/partidos`
 * response (the only FCF source this app talks to) never sends a
 * human-readable group name such as "TGN Gr. 14" — that string only
 * exists on the competition *page*, which we are explicitly not
 * scraping. Inventing it from `CODGRUPO`/`GRUPO` would violate the "don't
 * assume unverified FCF behaviour" rule, so for now callers that need a
 * display name for the group must supply one out of band (e.g. static
 * config keyed by groupId). Re-introduce `groupName` here if/when we
 * identify a real source for it.
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
