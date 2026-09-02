/**
 * Mirrors the backend's `src/federation/fcf/fcf-catalog-config.ts`.
 * Kept in sync by hand for now (small, stable values) — if this app
 * grows a build step that shares code with the backend, these two
 * files are the first candidate to unify.
 */

/** "Futbol Sala"'s id in the FCF's own catalog — the selector's default
 *  starting point. The user can still pick a different discipline. */
export const DEFAULT_DISCIPLINA_ID = '19308236';
