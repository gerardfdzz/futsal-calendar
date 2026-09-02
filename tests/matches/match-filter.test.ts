import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterTeamMatches } from '../../src/matches/match-filter.js';
import { buildMatch } from '../fixtures/match.fixtures.js';

test('filterTeamMatches: keeps matches where the team plays at home', () => {
  const match = buildMatch({ homeTeam: { id: '54755993', name: 'CFS LA SÉNIA' } });
  const result = filterTeamMatches([match], '54755993');
  assert.deepEqual(result, [match]);
});

test('filterTeamMatches: keeps matches where the team plays away', () => {
  const match = buildMatch({ awayTeam: { id: '54755993', name: 'CFS LA SÉNIA' } });
  const result = filterTeamMatches([match], '54755993');
  assert.deepEqual(result, [match]);
});

test('filterTeamMatches: excludes matches the team is not part of', () => {
  const match = buildMatch({
    homeTeam: { id: '11111111', name: 'Team A' },
    awayTeam: { id: '22222222', name: 'Team B' },
  });
  assert.deepEqual(filterTeamMatches([match], '54755993'), []);
});

test('filterTeamMatches: two teams with similar names in the same group are never confused', () => {
  const cfsHome = buildMatch({
    id: 'm-cfs',
    homeTeam: { id: '54755993', name: 'CFS LA SÉNIA' },
    awayTeam: { id: '99999999', name: 'Rival' },
  });
  const aesHome = buildMatch({
    id: 'm-aes',
    homeTeam: { id: '50795143', name: 'AES LA SÉNIA-STOCKPLUS' },
    awayTeam: { id: '88888888', name: 'Other Rival' },
  });

  assert.deepEqual(filterTeamMatches([cfsHome, aesHome], '54755993'), [cfsHome]);
  assert.deepEqual(filterTeamMatches([cfsHome, aesHome], '50795143'), [aesHome]);
});

test('filterTeamMatches: trims the requested teamId before comparing', () => {
  const match = buildMatch({ homeTeam: { id: '54755993', name: 'CFS LA SÉNIA' } });
  assert.deepEqual(filterTeamMatches([match], '  54755993  '), [match]);
});

test('filterTeamMatches: returns an empty array (not throwing) for an empty input list', () => {
  assert.deepEqual(filterTeamMatches([], '54755993'), []);
});
