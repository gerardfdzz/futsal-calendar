import type { FederationProvider } from '../federation/federation-provider.js';
import type { Match } from '../domain/match.js';
import { filterTeamMatches } from './match-filter.js';

/**
 * `FederationProvider.getMatches(groupId) -> filterTeamMatches(teamId)`,
 * extracted out of `calendar.service.ts` so it can be reused by the new
 * JSON matches endpoint (Milestone 6) without going through ICS
 * generation at all. `buildTeamCalendar` now calls this too — same
 * behaviour, no duplication of the two-line pipeline.
 */
export async function getTeamMatches(
  provider: FederationProvider,
  groupId: string,
  teamId: string,
): Promise<Match[]> {
  const allMatches = await provider.getMatches(groupId.trim());
  return filterTeamMatches(allMatches, teamId.trim());
}
