import type { Competition, Discipline, Group, TeamOption } from '../domain/competition-catalog.js';

/**
 * Port for "browse the federation's competition catalog" — a distinct
 * concern from `FederationProvider` (which only knows how to fetch a
 * given group's fixtures), so a user can reach a valid `groupId`/`teamId`
 * pair without already knowing one.
 *
 * Kept as its own interface so code that only needs match data (the ICS
 * endpoint, most tests) doesn't have to depend on catalog browsing.
 */
export interface CompetitionCatalogProvider {
  listDisciplines(): Promise<Discipline[]>;
  listCompetitions(disciplinaId: string, temporada: string): Promise<Competition[]>;
  listGroups(competicioId: string): Promise<Group[]>;
  /** Returns the teams in a group, deduplicated by id (the FCF's own
   *  `equipos` endpoint repeats each team once per jornada it appears in
   *  — see `fcf-competition-catalog.provider.ts`) and sorted by name. */
  listTeams(grupId: string): Promise<TeamOption[]>;
}
