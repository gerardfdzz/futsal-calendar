/**
 * Mirrors the backend's `src/domain/competition-catalog.ts` exactly —
 * these are the JSON shapes `/api/disciplines`, `/api/competitions`,
 * `/api/competitions/{id}/groups` and `/api/groups/{id}/teams` return.
 */
export interface Discipline {
  readonly id: string;
  readonly name: string;
}

export interface Competition {
  readonly id: string;
  readonly name: string;
}

export interface Group {
  readonly id: string;
  readonly name: string;
}

export interface TeamOption {
  readonly id: string;
  readonly name: string;
}
