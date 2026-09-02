import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleCalendarRequest } from '../../src/http/calendar-http-handler.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { buildMatch } from '../fixtures/match.fixtures.js';
import { FakeFederationProvider } from '../fixtures/fake-federation-provider.js';

const HOME_ID = '54755993';

function providerWithOneMatch(): FakeFederationProvider {
  return new FakeFederationProvider([
    buildMatch({ homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' }, awayTeam: { id: '2', name: 'X' } }),
  ]);
}

test('GET a valid route returns 200 with the ICS body and expected headers', async () => {
  const provider = providerWithOneMatch();

  const response = await handleCalendarRequest(
    provider,
    { method: 'GET', url: `/api/calendar/58162580/${HOME_ID}.ics` },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers['Content-Type'], 'text/calendar; charset=utf-8');
  assert.equal(response.headers['Content-Disposition'], `inline; filename="${HOME_ID}.ics"`);
  assert.ok(response.headers['ETag']);
  assert.ok(response.headers['Cache-Control']?.includes('max-age='));
  assert.ok(response.headers['Last-Modified']);
  assert.ok(response.body.includes('BEGIN:VCALENDAR'));
  assert.ok(response.body.includes('X-WR-CALNAME:CFS LA SÉNIA'));
});

test('HEAD a valid route returns 200 with the same headers but an empty body', async () => {
  const provider = providerWithOneMatch();

  const response = await handleCalendarRequest(
    provider,
    { method: 'HEAD', url: `/api/calendar/58162580/${HOME_ID}.ics` },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.equal(response.body, '');
  assert.ok(response.headers['ETag']);
});

test('an unsupported method returns 405 with an Allow header', async () => {
  const provider = providerWithOneMatch();

  const response = await handleCalendarRequest(
    provider,
    { method: 'POST', url: `/api/calendar/58162580/${HOME_ID}.ics` },
    noopHttpLogger,
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers['Allow'], 'GET, HEAD');
});

test('a malformed path returns 400 without calling the provider', async () => {
  const provider = providerWithOneMatch();

  const response = await handleCalendarRequest(provider, { method: 'GET', url: '/favicon.ico' }, noopHttpLogger);

  assert.equal(response.status, 400);
  assert.equal(provider.calledWithGroupIds.length, 0);
});

test('a matching If-None-Match returns 304 with no body', async () => {
  const provider = providerWithOneMatch();
  const url = `/api/calendar/58162580/${HOME_ID}.ics`;

  const first = await handleCalendarRequest(provider, { method: 'GET', url }, noopHttpLogger);
  const etag = first.headers['ETag'];
  assert.ok(etag);

  const second = await handleCalendarRequest(provider, { method: 'GET', url, ifNoneMatch: etag }, noopHttpLogger);

  assert.equal(second.status, 304);
  assert.equal(second.body, '');
});

test('a stale If-None-Match returns a fresh 200 body', async () => {
  const provider = providerWithOneMatch();
  const url = `/api/calendar/58162580/${HOME_ID}.ics`;

  const response = await handleCalendarRequest(
    provider,
    { method: 'GET', url, ifNoneMatch: '"stale-etag"' },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.ok(response.body.includes('BEGIN:VCALENDAR'));
});

test('a provider failure maps to 502 with an uncacheable response', async () => {
  const provider = new FakeFederationProvider([], new Error('FCF is down'));

  const response = await handleCalendarRequest(
    provider,
    { method: 'GET', url: `/api/calendar/58162580/${HOME_ID}.ics` },
    noopHttpLogger,
  );

  assert.equal(response.status, 502);
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('a team with no matches still returns 200 with a valid, empty calendar', async () => {
  const provider = new FakeFederationProvider([]);

  const response = await handleCalendarRequest(
    provider,
    { method: 'GET', url: '/api/calendar/58162580/99999999.ics' },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.ok(response.body.includes('BEGIN:VCALENDAR'));
  assert.ok(!response.body.includes('BEGIN:VEVENT'));
});
