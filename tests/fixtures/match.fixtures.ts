import type { Match } from '../../src/domain/match.js';

export function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    round: 1,
    homeTeam: { id: '54755993', name: 'CFS LA SÉNIA' },
    awayTeam: { id: '12345678', name: "L'AMETLLA" },
    startsAt: new Date('2026-09-26T16:30:00.000Z'),
    groupId: '58162580',
    status: 'scheduled',
    ...overrides,
  };
}
