/**
 * Reference to a team as it participates in a match.
 *
 * `id` is the FCF team code (e.g. "54755993"). It is opaque outside the
 * federation layer: the rest of the app must never assume it is numeric,
 * sequential, or stable across seasons — it is just "whatever the FCF used
 * to identify this team in this match".
 *
 * IMPORTANT: `id` must always come from CODEQUIPO_CASA / CODEQUIPO_FUERA,
 * never derived from the team name. The FCF is known to have two distinct
 * teams with overlapping names in the same group (see project notes:
 * "CFS LA SÉNIA" vs "AES LA SÉNIA-STOCKPLUS"), so name-based matching would
 * silently mix their fixtures.
 */
export interface TeamRef {
  readonly id: string;
  readonly clubId?: string;
  readonly name: string;
  readonly crest?: string;
}
