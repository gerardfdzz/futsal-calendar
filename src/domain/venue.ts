/**
 * Where a match is played.
 *
 * `latitude` / `longitude` are optional because the FCF sends them as
 * strings that are frequently empty for some venues — we do not want a
 * missing coordinate to block generating a perfectly valid calendar event
 * that simply has no GEO property.
 */
export interface Venue {
  readonly id?: string;
  readonly name: string;
  readonly latitude?: number;
  readonly longitude?: number;
}
