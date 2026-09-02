/**
 * Reference to a team as it participates in a match.
 *
 * `id` is the FCF team code (e.g. "54755993"), opaque outside the
 * federation layer — never assume it is numeric, sequential, or stable
 * across seasons.
 *
 * IMPORTANT: `id` must always come from CODEQUIPO_CASA / CODEQUIPO_FUERA,
 * never derived from the team name — the FCF has distinct teams with
 * overlapping names in the same group, so name-based matching would
 * silently mix their fixtures.
 */
export interface TeamRef {
  readonly id: string;
  readonly clubId?: string;
  readonly name: string;
  readonly crest?: string;
}
