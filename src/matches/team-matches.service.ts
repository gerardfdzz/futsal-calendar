import type { FederationProvider } from '../federation/federation-provider.js';
import type { Match } from '../domain/match.js';
import { filterTeamMatches } from './match-filter.js';

export async function getTeamMatches(
  provider: FederationProvider,
  groupId: string,
  teamId: string,
): Promise<Match[]> {
  const allMatches = await provider.getMatches(groupId.trim());
  return filterTeamMatches(allMatches, teamId.trim());
}
