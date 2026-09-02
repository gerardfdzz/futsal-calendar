import type { Match } from '../domain/match.js';

/**
 * Port for "some source of truth for a group's fixtures". The rest of the
 * app (calendar generation, the future Vercel endpoint, Angular later on)
 * depends only on this interface, never on `FcfFederationProvider`
 * directly — that keeps the FCF's data shape, quirks and status codes
 * fully isolated in `federation/fcf/*`.
 *
 * `getMatches` returns already-mapped domain `Match[]`, already excluding
 * bye rounds ("Descans"). It resolves for *any* group id; team filtering
 * is a separate, provider-agnostic concern (see `matches/match-filter.ts`).
 */
export interface FederationProvider {
  getMatches(groupId: string): Promise<Match[]>;
}
