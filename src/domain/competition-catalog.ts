/**
 * Lightweight refs used to let a user BROWSE the FCF's own catalog
 * (discipline -> competició -> grup -> equip) before we know a
 * `groupId`/`teamId` pair to fetch matches for.
 *
 * Deliberately distinct from `TeamRef`: these come from the FCF's
 * `/api/competition/{disciplines,competicions,grupos,equipos}` selector
 * endpoints, which only ever send an id + a display name (`{value,
 * label}`) — no crest, no clubId. `TeamRef` stays reserved for a team as
 * it appears on an actual `Match` (`CODEQUIPO_CASA`/`_FUERA`, which DOES
 * carry a crest). Reusing `TeamRef` here would silently promise a crest
 * this data never has.
 */

/** One entry from `/api/competition/disciplines`, e.g. "Futbol Sala". */
export interface Discipline {
  readonly id: string;
  readonly name: string;
}

/** One entry from `/api/competition/competicions?disciplinaId=...`, e.g.
 *  "LLIGA SEGONA DIVISIÓ CATALANA FUTBOL SALA". */
export interface Competition {
  readonly id: string;
  readonly name: string;
}

/** One entry from `/api/competition/grupos?competicioId=...`, e.g.
 *  "TGN Gr. 14". */
export interface Group {
  readonly id: string;
  readonly name: string;
}

/** One entry from `/api/competition/equipos?grupId=...`, e.g.
 *  "CFS LA SÉNIA". This `id` is the same FCF team code
 *  (`CODEQUIPO_CASA`/`_FUERA`) used everywhere else — it is what a caller
 *  passes on as `teamId` to `getTeamMatches`/`buildTeamCalendar`. */
export interface TeamOption {
  readonly id: string;
  readonly name: string;
}
