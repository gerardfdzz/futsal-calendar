import type { MatchStatus } from '../../domain/match-status.js';
import type { FcfMatchDto } from './fcf.types.js';
import { noopFcfLogger, type FcfLogger } from './fcf-logger.js';

/**
 * Translates the FCF's `(CERRADA, ESTADO)` pair into our domain
 * `MatchStatus`.
 *
 * As of writing we have only confirmed ONE combination against real data:
 * a scheduled, not-yet-played match reports `CERRADA="0"`, `ESTADO="0"`.
 * We do NOT know the codes for finished / postponed / suspended /
 * cancelled matches yet, and this function deliberately refuses to guess
 * them — guessing wrong here would mean silently mislabeling a cancelled
 * match as scheduled (or vice versa), which is worse than an honest
 * `'unknown'`.
 *
 * `KNOWN_STATUS_CODES` is the single place to extend once real examples
 * of other states are observed (e.g. by watching a match through kickoff
 * and recording what `CERRADA`/`ESTADO` become). Add a line, add a test
 * that pins it, done — no other code needs to change.
 */
const KNOWN_STATUS_CODES: ReadonlyMap<string, MatchStatus> = new Map([['0|0', 'scheduled']]);

export function mapFcfStatus(
  dto: Pick<FcfMatchDto, 'CERRADA' | 'ESTADO' | 'CODACTA'>,
  logger: FcfLogger = noopFcfLogger,
): MatchStatus {
  const cerrada = dto.CERRADA.trim();
  const estado = dto.ESTADO.trim();
  const key = `${cerrada}|${estado}`;

  const known = KNOWN_STATUS_CODES.get(key);
  if (known) {
    return known;
  }

  logger.warn('Unrecognized FCF status code combination, mapping to "unknown"', {
    codacta: dto.CODACTA,
    cerrada,
    estado,
  });
  return 'unknown';
}
