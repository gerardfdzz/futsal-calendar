import type { Competition, Discipline, Group, TeamOption } from '../../src/domain/competition-catalog.js';
import type { CompetitionCatalogProvider } from '../../src/federation/competition-catalog-provider.js';

export class KeyedCompetitionCatalogProvider implements CompetitionCatalogProvider {
  public readonly calls: { method: string; args: string[] }[] = [];

  constructor(
    private readonly data: {
      disciplines?: Discipline[];
      competitionsByDisciplinaId?: ReadonlyMap<string, Competition[]>;
      groupsByCompeticioId?: ReadonlyMap<string, Group[]>;
      teamsByGrupId?: ReadonlyMap<string, TeamOption[]>;
      errorOn?: { method: string; arg?: string };
    },
  ) {}

  async listDisciplines(): Promise<Discipline[]> {
    this.calls.push({ method: 'listDisciplines', args: [] });
    this.throwIfConfigured('listDisciplines', '');
    return this.data.disciplines ?? [];
  }

  async listCompetitions(disciplinaId: string, _temporada: string): Promise<Competition[]> {
    this.calls.push({ method: 'listCompetitions', args: [disciplinaId] });
    this.throwIfConfigured('listCompetitions', disciplinaId);
    return this.data.competitionsByDisciplinaId?.get(disciplinaId) ?? [];
  }

  async listGroups(competicioId: string): Promise<Group[]> {
    this.calls.push({ method: 'listGroups', args: [competicioId] });
    this.throwIfConfigured('listGroups', competicioId);
    return this.data.groupsByCompeticioId?.get(competicioId) ?? [];
  }

  async listTeams(grupId: string): Promise<TeamOption[]> {
    this.calls.push({ method: 'listTeams', args: [grupId] });
    this.throwIfConfigured('listTeams', grupId);
    return this.data.teamsByGrupId?.get(grupId) ?? [];
  }

  private throwIfConfigured(method: string, arg: string): void {
    const errorOn = this.data.errorOn;
    if (errorOn?.method === method && (errorOn.arg === undefined || errorOn.arg === arg)) {
      throw new Error(`simulated failure for ${method}("${arg}")`);
    }
  }
}
