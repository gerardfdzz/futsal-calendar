import type { MatchStatus } from '../domain/match-status.js';

export type IcsEventStatus = 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';

export function mapMatchStatusToIcsStatus(status: MatchStatus): IcsEventStatus | undefined {
  switch (status) {
    case 'scheduled':
    case 'finished':
      return 'CONFIRMED';
    case 'postponed':
      return 'TENTATIVE';
    case 'cancelled':
      return 'CANCELLED';
    case 'unknown':
      return undefined;
  }
}
