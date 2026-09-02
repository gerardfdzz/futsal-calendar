import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTeamMatches } from '../../src/matches/team-matches.service.js';
import { buildMatch } from '../fixtures/match.fixtures.js';
import { FakeFederationProvider } from '../fixtures/fake-federation-provider.js';

const HOME_ID = '54755993';

test('getTeamMatches: fetches the group and filters to the given team', async () => {
  const match = buildMatch({ homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' } });
  const other = buildMatch({ id: 'other', homeTeam: { id: '1', name: 'X' }, awayTeam: { id: '2', name: 'Y' } });
  const provider = new FakeFederationProvider([match, other]);

  const result = await getTeamMatches(provider, '58162580', HOME_ID);

  assert.deepEqual(result, [match]);
  assert.deepEqual(provider.calledWithGroupIds, ['58162580']);
});

test('getTeamMatches: trims groupId and teamId before use', async () => {
  const match = buildMatch({ homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' } });
  const provider = new FakeFederationProvider([match]);

  const result = await getTeamMatches(provider, '  58162580  ', `  ${HOME_ID}  `);

  assert.deepEqual(result, [match]);
  assert.deepEqual(provider.calledWithGroupIds, ['58162580']);
});

test('getTeamMatches: returns an empty array (not throwing) when the team has no matches', async () => {
  const provider = new FakeFederationProvider([]);
  const result = await getTeamMatches(provider, '58162580', '99999999');
  assert.deepEqual(result, []);
});

test('getTeamMatches: propagates a provider failure', async () => {
  const provider = new FakeFederationProvider([], new Error('FCF is down'));
  await assert.rejects(() => getTeamMatches(provider, '58162580', HOME_ID), /FCF is down/);
});
