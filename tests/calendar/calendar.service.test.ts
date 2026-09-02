import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamCalendar } from '../../src/calendar/calendar.service.js';
import { buildMatch } from '../fixtures/match.fixtures.js';
import { FakeFederationProvider } from '../fixtures/fake-federation-provider.js';

const HOME_ID = '54755993';
const OTHER_TEAM_SAME_NAME_ID = '50795143';

test('builds an ICS containing only the requested team\'s matches', async () => {
  const homeMatch = buildMatch({
    id: 'home-1',
    homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' },
    awayTeam: { id: '11111111', name: "L'AMETLLA" },
  });
  const awayMatch = buildMatch({
    id: 'away-1',
    homeTeam: { id: '22222222', name: 'CFS Roquetes' },
    awayTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' },
  });
  const otherTeamMatch = buildMatch({
    id: 'other-1',
    homeTeam: { id: OTHER_TEAM_SAME_NAME_ID, name: 'AES LA SÉNIA-STOCKPLUS' },
    awayTeam: { id: '33333333', name: 'Vinallop' },
  });

  const provider = new FakeFederationProvider([homeMatch, awayMatch, otherTeamMatch]);

  const result = await buildTeamCalendar(provider, { groupId: '58162580', teamId: HOME_ID });

  assert.equal(result.matchCount, 2);
  assert.ok(result.ics.includes('UID:fcf-home-1@'));
  assert.ok(result.ics.includes('UID:fcf-away-1@'));
  assert.ok(!result.ics.includes('UID:fcf-other-1@'));
});

test('resolves calendarName from the team\'s own name in its matches (home case)', async () => {
  const provider = new FakeFederationProvider([
    buildMatch({ homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' }, awayTeam: { id: '2', name: 'X' } }),
  ]);

  const result = await buildTeamCalendar(provider, { groupId: 'g', teamId: HOME_ID });

  assert.equal(result.calendarName, 'CFS LA SÉNIA');
  assert.ok(result.ics.includes('X-WR-CALNAME:CFS LA SÉNIA'));
});

test('resolves calendarName from the team\'s own name in its matches (away case)', async () => {
  const provider = new FakeFederationProvider([
    buildMatch({ homeTeam: { id: '1', name: 'X' }, awayTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' } }),
  ]);

  const result = await buildTeamCalendar(provider, { groupId: 'g', teamId: HOME_ID });

  assert.equal(result.calendarName, 'CFS LA SÉNIA');
});

test('an explicit calendarName override wins over the resolved one', async () => {
  const provider = new FakeFederationProvider([
    buildMatch({ homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' }, awayTeam: { id: '2', name: 'X' } }),
  ]);

  const result = await buildTeamCalendar(provider, {
    groupId: 'g',
    teamId: HOME_ID,
    calendarName: 'Custom Name',
  });

  assert.equal(result.calendarName, 'Custom Name');
});

test('a team with zero matches still yields a valid, empty calendar (never throws)', async () => {
  const provider = new FakeFederationProvider([]);

  const result = await buildTeamCalendar(provider, { groupId: '58162580', teamId: '99999999' });

  assert.equal(result.matchCount, 0);
  assert.equal(result.calendarName, 'FCF 99999999');
  assert.ok(result.ics.includes('BEGIN:VCALENDAR'));
  assert.ok(result.ics.includes('END:VCALENDAR'));
  assert.ok(!result.ics.includes('BEGIN:VEVENT'));
});

test('propagates provider errors untouched (no swallowing)', async () => {
  const boom = new Error('FCF is down');
  const provider = new FakeFederationProvider([], boom);

  await assert.rejects(
    () => buildTeamCalendar(provider, { groupId: 'g', teamId: 't' }),
    (error: unknown) => error === boom,
  );
});

test('trims groupId/teamId before use', async () => {
  const provider = new FakeFederationProvider([
    buildMatch({ homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' }, awayTeam: { id: '2', name: 'X' } }),
  ]);

  const result = await buildTeamCalendar(provider, { groupId: '  58162580  ', teamId: `  ${HOME_ID}  ` });

  assert.equal(provider.calledWithGroupIds[0], '58162580');
  assert.equal(result.matchCount, 1);
});

test('etag is stable across two calls with unchanged underlying data', async () => {
  const provider = new FakeFederationProvider([
    buildMatch({ homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' }, awayTeam: { id: '2', name: 'X' } }),
  ]);

  const first = await buildTeamCalendar(provider, { groupId: 'g', teamId: HOME_ID });
  const second = await buildTeamCalendar(provider, { groupId: 'g', teamId: HOME_ID });

  assert.equal(first.etag, second.etag);
});

test('etag changes when the underlying match data changes', async () => {
  const providerBefore = new FakeFederationProvider([
    buildMatch({
      homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' },
      awayTeam: { id: '2', name: 'X' },
      startsAt: new Date('2026-09-26T16:30:00.000Z'),
    }),
  ]);
  const providerAfter = new FakeFederationProvider([
    buildMatch({
      homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' },
      awayTeam: { id: '2', name: 'X' },
      startsAt: new Date('2026-09-26T19:00:00.000Z'),
    }),
  ]);

  const before = await buildTeamCalendar(providerBefore, { groupId: 'g', teamId: HOME_ID });
  const after = await buildTeamCalendar(providerAfter, { groupId: 'g', teamId: HOME_ID });

  assert.notEqual(before.etag, after.etag);
});

test('passes icsOptions through to generateIcs (e.g. injectable now, duration)', async () => {
  const provider = new FakeFederationProvider([
    buildMatch({
      homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' },
      awayTeam: { id: '2', name: 'X' },
      startsAt: new Date('2026-09-26T16:30:00.000Z'),
    }),
  ]);

  const result = await buildTeamCalendar(provider, {
    groupId: 'g',
    teamId: HOME_ID,
    icsOptions: { now: new Date('2026-09-01T10:00:00.000Z'), matchDurationMinutes: 60, uidDomain: 'example.com' },
  });

  assert.ok(result.ics.includes('DTSTAMP:20260901T100000Z'));
  assert.ok(result.ics.includes('DTEND;TZID=Europe/Madrid:20260926T193000'));
  assert.ok(result.ics.includes(`UID:fcf-${result.ics.match(/UID:fcf-([^@]+)@/)?.[1]}@example.com`));
});
