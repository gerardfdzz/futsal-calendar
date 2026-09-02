import type { FederationProvider } from '../federation/federation-provider.js';
import type { Match } from '../domain/match.js';
import { filterTeamMatches } from './match-filter.js';

/**
 * `FederationProvider.getMatches(groupId) -> filterTeamMatches(teamId)`,
 * shared by `calendar.service.ts` and the JSON matches endpoint so
 * neither duplicates this pipeline.
 */
export async function getTeamMatches(
  provider: FederationProvider,
  groupId: string,
  teamId: string,
): Promise<Match[]> {
  const allMatches = await provider.getMatches(groupId.trim());
  return filterTeamMatches(allMatches, teamId.trim());
}
