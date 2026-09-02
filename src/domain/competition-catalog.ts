/**
 * Lightweight refs used to let a user BROWSE the FCF's own catalog
 * (discipline -> competició -> grup -> equip) before we know a
 * `groupId`/`teamId` pair to fetch matches for.
 *
 * Deliberately distinct from `TeamRef`: these come from the FCF's
 * `/api/competition/{disciplines,competicions,grupos,equipos}` selector
 * endpoints, which only ever send an id + a display name — no crest, no
 * clubId. Reusing `TeamRef` here would silently promise a crest this data
 * never has.
 */

/** One entry from `/api/competition/disciplines`, e.g. "Futbol Sala". */
export interface Discipline {
  readonly id: string;
  readonly name: string;
}

/** One entry from `/api/competition/competicions?disciplinaId=...`. */
export interface Competition {
  readonly id: string;
  readonly name: string;
}

/** One entry from `/api/competition/grupos?competicioId=...`. */
export interface Group {
  readonly id: string;
  readonly name: string;
}

/** One entry from `/api/competition/equipos?grupId=...`. `id` is the same
 *  FCF team code (`CODEQUIPO_CASA`/`_FUERA`) used everywhere else. */
export interface TeamOption {
  readonly id: string;
  readonly name: string;
}
