/** "Futbol Sala"'s id in the FCF's `/api/competition/disciplines` list —
 *  the selector's default starting point; the UI still lets a user pick
 *  a different discipline. */
export const DEFAULT_DISCIPLINA_ID = '19308236';

/**
 * Current `temporada` (season) id in the FCF's catalog. The FCF's ids
 * are sequential per season with no stable "current" marker, so this
 * needs a manual bump once a year. Overridable via `FCF_DEFAULT_TEMPORADA_ID`
 * so a new season doesn't require a code deploy — set it in the
 * deployment's environment when the FCF opens its next season.
 *
 * Auto-detecting "the highest temporada id" was considered and rejected:
 * the FCF sometimes lists a next season's shell before it has any real
 * competitions in it, which would silently point the app at empty data.
 */
export const DEFAULT_TEMPORADA_ID = process.env['FCF_DEFAULT_TEMPORADA_ID'] ?? '22';
