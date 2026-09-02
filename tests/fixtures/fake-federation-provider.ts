import type { Match } from '../../src/domain/match.js';
import type { FederationProvider } from '../../src/federation/federation-provider.js';

/**
 * In-memory `FederationProvider` test double. Lets `calendar.service`
 * tests (and any future HTTP-handler tests) exercise the orchestration
 * logic without touching the real FCF or `FcfFederationProvider` at all
 * — exactly the decoupling the `FederationProvider` port exists for.
 */
export class FakeFederationProvider implements FederationProvider {
  public calledWithGroupIds: string[] = [];

  constructor(
    private readonly matchesByGroupId: ReadonlyMap<string, Match[]> | Match[],
    private readonly error?: Error,
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
}
