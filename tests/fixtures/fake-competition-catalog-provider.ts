import type { Competition, Discipline, Group, TeamOption } from '../../src/domain/competition-catalog.js';
import type { CompetitionCatalogProvider } from '../../src/federation/competition-catalog-provider.js';

/** In-memory `CompetitionCatalogProvider` test double, mirroring
 *  `FakeFederationProvider`'s shape. */
export class FakeCompetitionCatalogProvider implements CompetitionCatalogProvider {
  public calledWith: { method: string; args: string[] }[] = [];

  constructor(
    private readonly data: {
      disciplines?: Discipline[];
      competitions?: Competition[];
      groups?: Group[];
      teams?: TeamOption[];
    } = {},
    private readonly error?: Error,
  ) {}

  async listDisciplines(): Promise<Discipline[]> {
    this.calledWith.push({ method: 'listDisciplines', args: [] });
    if (this.error) throw this.error;
    return this.data.disciplines ?? [];
  }

  async listCompetitions(disciplinaId: string, temporada: string): Promise<Competition[]> {
    this.calledWith.push({ method: 'listCompetitions', args: [disciplinaId, temporada] });
    if (this.error) throw this.error;
    return this.data.competitions ?? [];
  }

  async listGroups(competicioId: string): Promise<Group[]> {
    this.calledWith.push({ method: 'listGroups', args: [competicioId] });
    if (this.error) throw this.error;
    return this.data.groups ?? [];
  }

  async listTeams(grupId: string): Promise<TeamOption[]> {
    this.calledWith.push({ method: 'listTeams', args: [grupId] });
    if (this.error) throw this.error;
    return this.data.teams ?? [];
  }
}
