import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  InvalidRouteError,
  parseCompetitionsQuery,
  parseGroupsRoute,
  parseMatchesRoute,
  parseTeamsRoute,
} from '../../src/http/catalog-route.js';

test('parseCompetitionsQuery: reads both params when present', () => {
  const result = parseCompetitionsQuery('/api/competitions?disciplinaId=19308236&temporada=22');
  assert.deepEqual(result, { disciplinaId: '19308236', temporada: '22' });
});

test('parseCompetitionsQuery: omits keys that are absent (no defaults applied here)', () => {
  assert.deepEqual(parseCompetitionsQuery('/api/competitions'), {});
});

test('parseGroupsRoute: parses a well-formed path', () => {
  assert.deepEqual(parseGroupsRoute('/api/competitions/58162570/groups'), { competicioId: '58162570' });
});

test('parseGroupsRoute: decodes URL-encoded segments', () => {
  assert.deepEqual(parseGroupsRoute('/api/competitions/id%20with%20space/groups'), {
    competicioId: 'id with space',
  });
});

test('parseGroupsRoute: throws when the trailing "groups" segment is missing', () => {
  assert.throws(() => parseGroupsRoute('/api/competitions/58162570'), InvalidRouteError);
});

test('parseGroupsRoute: throws when competicioId is empty', () => {
  assert.throws(() => parseGroupsRoute('/api/competitions//groups'), InvalidRouteError);
});

test('parseTeamsRoute: parses a well-formed path', () => {
  assert.deepEqual(parseTeamsRoute('/api/groups/58162580/teams'), { grupId: '58162580' });
});

test('parseTeamsRoute: throws when the trailing "teams" segment is missing', () => {
  assert.throws(() => parseTeamsRoute('/api/groups/58162580'), InvalidRouteError);
});

test('parseMatchesRoute: parses a well-formed path', () => {
  assert.deepEqual(parseMatchesRoute('/api/matches/58162580/54755993'), {
    groupId: '58162580',
    teamId: '54755993',
  });
});

test('parseMatchesRoute: ignores a query string', () => {
  assert.deepEqual(parseMatchesRoute('/api/matches/58162580/54755993?foo=bar'), {
    groupId: '58162580',
    teamId: '54755993',
  });
});

test('parseMatchesRoute: throws when teamId is missing', () => {
  assert.throws(() => parseMatchesRoute('/api/matches/58162580'), InvalidRouteError);
});

test('parseMatchesRoute: throws for a completely unrelated path', () => {
  assert.throws(() => parseMatchesRoute('/favicon.ico'), InvalidRouteError);
});
