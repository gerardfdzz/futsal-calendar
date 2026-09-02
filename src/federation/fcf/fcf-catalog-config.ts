/**
 * Centralized defaults for the competition-catalog selector (Milestone 6).
 * Both values were read directly off `/api/competition/disciplines` and
 * `/api/competition/temporadas` against the real FCF — not guessed.
 */

/** "Futbol Sala"'s id in the FCF's own `/api/competition/disciplines`
 *  list. Used as the selector's default starting point (this app's
 *  validated, battle-tested use case) — the UI still lets a user pick a
 *  different discipline; every other FCF discipline exposes the exact
 *  same `competicions -> grupos -> equipos -> partidos` shape, verified
 *  directly against Futbol 11 before relying on it. */
export const DEFAULT_DISCIPLINA_ID = '19308236';

/**
 * Current `temporada` (season) id in the FCF's own catalog. The FCF's ids
 * are sequential per season (see `/api/competition/temporadas`) with no
 * stable "current" marker of their own, so this needs a manual bump once
 * a year when the FCF opens its new season — same trade-off already
 * accepted for `DEFAULT_UID_DOMAIN`-style config in `ics-config.ts`.
 *
 * TODO(each new season, ~August): confirm this still matches the FCF's
 * latest `temporadas` entry before the season starts; auto-detecting "the
 * highest temporada id" was considered and rejected for now — the FCF
 * sometimes lists a next season's shell before it has any real
 * competitions in it, which would silently point the app at empty data.
 */
export const DEFAULT_TEMPORADA_ID = '22';
