import type { MatchStatus } from '../../domain/match-status.js';
import type { FcfMatchDto } from './fcf.types.js';
import { noopFcfLogger, type FcfLogger } from './fcf-logger.js';

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
