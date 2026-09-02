import type { Competition, Discipline, Group, TeamOption } from '../domain/competition-catalog.js';

export interface CompetitionCatalogProvider {
  listDisciplines(): Promise<Discipline[]>;
  listCompetitions(disciplinaId: string, temporada: string): Promise<Competition[]>;
  listGroups(competicioId: string): Promise<Group[]>;
  listTeams(grupId: string): Promise<TeamOption[]>;
}
