import type { MatchStatus } from '../domain/match-status.js';

/** The only three values RFC 5545 §3.8.1.11 defines for a VEVENT's
 *  STATUS property. */
export type IcsEventStatus = 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';

/**
 * Maps our domain `MatchStatus` to the ICS `STATUS` property.
 *
 * `'unknown'` maps to `undefined` — meaning "omit the STATUS property
 * entirely" — rather than a guess. This mirrors the same philosophy as
 * `federation/fcf/fcf-status.mapper.ts`: we don't know what an
 * unrecognized FCF status code means, so we don't assert an ICS status
 * either. An event without STATUS is perfectly valid RFC 5545 (clients
 * treat it as if it were CONFIRMED).
 *
 * 'postponed' maps to TENTATIVE (the match's outcome, or even whether it
 * will happen at all, is uncertain until the FCF publishes a new date)
 * rather than a made-up fourth value — TENTATIVE is the closest fit RFC
 * 5545 actually offers. 'finished' still maps to CONFIRMED: STATUS
 * describes whether the *scheduling* of the event is confirmed, not the
 * sporting outcome — a played match was very much a confirmed event.
 */
export function mapMatchStatusToIcsStatus(status: MatchStatus): IcsEventStatus | undefined {
  switch (status) {
    case 'scheduled':
    case 'finished':
      return 'CONFIRMED';
    case 'postponed':
      return 'TENTATIVE';
    case 'cancelled':
      return 'CANCELLED';
    case 'unknown':
      return undefined;
  }
}
