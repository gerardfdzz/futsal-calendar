import type { Match } from '../domain/match.js';

export interface FederationProvider {
  getMatches(groupId: string): Promise<Match[]>;
  getWithdrawnTeamIds(groupId: string): Promise<ReadonlySet<string>>;
}
