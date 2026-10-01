import type { Match } from '../../src/domain/match.js';
import type { FederationProvider } from '../../src/federation/federation-provider.js';

export class FakeFederationProvider implements FederationProvider {
  public calledWithGroupIds: string[] = [];
  public calledForWithdrawnTeamIds: string[] = [];

  constructor(
    private readonly matchesByGroupId: ReadonlyMap<string, Match[]> | Match[],
    private readonly error?: Error,
    private readonly withdrawnTeamIds: ReadonlySet<string> = new Set(),
    private readonly withdrawnTeamIdsError?: Error,
  ) {}

  async getMatches(groupId: string): Promise<Match[]> {
    this.calledWithGroupIds.push(groupId);

    if (this.error) {
      throw this.error;
    }

    if (Array.isArray(this.matchesByGroupId)) {
      return this.matchesByGroupId;
    }
    return this.matchesByGroupId.get(groupId) ?? [];
  }

  async getWithdrawnTeamIds(groupId: string): Promise<ReadonlySet<string>> {
    this.calledForWithdrawnTeamIds.push(groupId);

    if (this.withdrawnTeamIdsError) {
      throw this.withdrawnTeamIdsError;
    }

    return this.withdrawnTeamIds;
  }
}
