import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FcfFederationProvider, FcfProviderError } from '../../../src/federation/fcf/fcf.provider.js';
import { buildByeMatchDto, buildFcfMatchDto } from '../../fixtures/fcf.fixtures.js';
import { noopFcfLogger } from '../../../src/federation/fcf/fcf-logger.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('getMatches: flattens jornada groups, excludes byes, and sorts by kickoff time', async () => {
  const earlyMatch = buildFcfMatchDto({ CODACTA: '1', COMIENZO1: '2026-09-05 18:00:00' });
  const lateMatch = buildFcfMatchDto({ CODACTA: '2', COMIENZO1: '2026-09-26 18:30:00' });
  const bye = buildByeMatchDto({ CODACTA: '3' });

  const fetchFn = async () =>
    jsonResponse({
      '1': [lateMatch],
      '2': [earlyMatch, bye],
    });

  const provider = new FcfFederationProvider({ fetchFn, logger: noopFcfLogger });
  const matches = await provider.getMatches('58162580');

  assert.equal(matches.length, 2);
  assert.equal(matches[0]?.id, '1');
  assert.equal(matches[0]?.round, 2);
  assert.equal(matches[1]?.id, '2');
  assert.equal(matches[1]?.round, 1);
});

test('getMatches: builds the request URL with the given groupId and required headers', async () => {
  let capturedUrl = '';
  let capturedHeaders: RequestInit['headers'];
  const fetchFn = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedHeaders = init.headers;
    return jsonResponse({});
  };

  const provider = new FcfFederationProvider({ fetchFn, logger: noopFcfLogger });
  await provider.getMatches('58162580');

  assert.equal(capturedUrl, 'https://www.fcf.cat/api/competition/partidos?grupId=58162580');
  const headers = new Headers(capturedHeaders);
  assert.equal(headers.get('accept'), 'application/json');
  assert.ok(headers.get('user-agent'));
});

test('getMatches: rejects an empty groupId without making a request', async () => {
  let called = false;
  const fetchFn = async () => {
    called = true;
    return jsonResponse({});
  };
  const provider = new FcfFederationProvider({ fetchFn, logger: noopFcfLogger });

  await assert.rejects(() => provider.getMatches('   '), FcfProviderError);
  assert.equal(called, false);
});

test('getMatches: a match that fails to map is skipped, the rest still come through', async () => {
  const good = buildFcfMatchDto({ CODACTA: '1' });
  const bad = buildFcfMatchDto({ CODACTA: '2', COMIENZO1: 'garbage' });
  const fetchFn = async () => jsonResponse({ '1': [good, bad] });

  const provider = new FcfFederationProvider({ fetchFn, logger: noopFcfLogger });
  const matches = await provider.getMatches('58162580');

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.id, '1');
});

test('getMatches: a match with an unexpectedly non-string field (real FCF data is not fully trustworthy) is skipped, not a whole-request crash', async () => {
  const good = buildFcfMatchDto({ CODACTA: '1' });
  const malformed = buildFcfMatchDto({ CODACTA: '2', CODEQUIPO_CASA: null as unknown as string });
  const fetchFn = async () => jsonResponse({ '1': [good, malformed] });

  const provider = new FcfFederationProvider({ fetchFn, logger: noopFcfLogger });
  const matches = await provider.getMatches('58162580');

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.id, '1');
});

test('getMatches: retries on HTTP 5xx and succeeds once the FCF recovers', async () => {
  let calls = 0;
  const fetchFn = async () => {
    calls++;
    if (calls < 3) return jsonResponse({ error: 'boom' }, 502);
    return jsonResponse({ '1': [buildFcfMatchDto()] });
  };

  const provider = new FcfFederationProvider({ fetchFn, maxRetries: 2, retryDelayMs: 1, logger: noopFcfLogger });
  const matches = await provider.getMatches('58162580');

  assert.equal(calls, 3);
  assert.equal(matches.length, 1);
});

test('getMatches: gives up after exhausting retries on persistent HTTP 5xx', async () => {
  let calls = 0;
  const fetchFn = async () => {
    calls++;
    return jsonResponse({}, 503);
  };

  const provider = new FcfFederationProvider({ fetchFn, maxRetries: 2, retryDelayMs: 1, logger: noopFcfLogger });

  await assert.rejects(() => provider.getMatches('58162580'), FcfProviderError);
  assert.equal(calls, 3);
});

test('getMatches: does NOT retry on HTTP 4xx (treated as a non-transient contract error)', async () => {
  let calls = 0;
  const fetchFn = async () => {
    calls++;
    return jsonResponse({ message: 'not found' }, 404);
  };

  const provider = new FcfFederationProvider({ fetchFn, maxRetries: 2, retryDelayMs: 1, logger: noopFcfLogger });

  await assert.rejects(() => provider.getMatches('58162580'), FcfProviderError);
  assert.equal(calls, 1);
});

test('getMatches: retries on a request timeout and eventually throws FcfProviderError', async () => {
  let calls = 0;
  const fetchFn = (_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      calls++;
      init.signal?.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });

  const provider = new FcfFederationProvider({
    fetchFn,
    timeoutMs: 10,
    maxRetries: 1,
    retryDelayMs: 1,
    logger: noopFcfLogger,
  });

  await assert.rejects(() => provider.getMatches('58162580'), FcfProviderError);
  assert.equal(calls, 2);
});

test('getMatches: throws FcfProviderError for invalid JSON', async () => {
  const fetchFn = async () => new Response('not json{{', { status: 200 });
  const provider = new FcfFederationProvider({ fetchFn, logger: noopFcfLogger });

  await assert.rejects(() => provider.getMatches('58162580'), FcfProviderError);
});

test('getMatches: throws FcfProviderError for an unexpected top-level shape (e.g. an array)', async () => {
  const fetchFn = async () => jsonResponse([buildFcfMatchDto()]);
  const provider = new FcfFederationProvider({ fetchFn, logger: noopFcfLogger });

  await assert.rejects(() => provider.getMatches('58162580'), FcfProviderError);
});

test('getWithdrawnTeamIds: reports a real team id whose own name has become "Descans" across the whole response', async () => {
  const withdrawnMatch = buildFcfMatchDto({ CODACTA: '1', CODEQUIPO_CASA: '51463150', NOMBRE_CASA: 'Descans' });
  const normalMatch = buildFcfMatchDto({ CODACTA: '2' });
  const fetchFn = async () => jsonResponse({ '1': [withdrawnMatch, normalMatch] });
  const provider = new FcfFederationProvider({ fetchFn, logger: noopFcfLogger });

  const withdrawn = await provider.getWithdrawnTeamIds('58162580');

  assert.deepEqual([...withdrawn], ['51463150']);
});

test('getWithdrawnTeamIds: an all-real, no-bye response withdraws nobody', async () => {
  const fetchFn = async () => jsonResponse({ '1': [buildFcfMatchDto()] });
  const provider = new FcfFederationProvider({ fetchFn, logger: noopFcfLogger });

  const withdrawn = await provider.getWithdrawnTeamIds('58162580');

  assert.deepEqual([...withdrawn], []);
});

test('getWithdrawnTeamIds: rejects an empty groupId without making a request', async () => {
  const provider = new FcfFederationProvider({ fetchFn: async () => jsonResponse({}), logger: noopFcfLogger });

  await assert.rejects(() => provider.getWithdrawnTeamIds('   '), FcfProviderError);
});

test('getWithdrawnTeamIds: throws FcfProviderError for invalid JSON, same as getMatches', async () => {
  const fetchFn = async () => new Response('not json', { status: 200 });
  const provider = new FcfFederationProvider({ fetchFn, logger: noopFcfLogger });

  await assert.rejects(() => provider.getWithdrawnTeamIds('58162580'), FcfProviderError);
});
