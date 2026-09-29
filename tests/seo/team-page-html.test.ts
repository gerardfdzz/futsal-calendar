import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamPageHtml, buildTeamPageUrl } from '../../src/seo/team-page-html.js';
import { buildMatch } from '../fixtures/match.fixtures.js';

const NOW = new Date('2026-09-20T00:00:00.000Z');
const TEAM_ID = '54755993';

test('buildTeamPageUrl builds the same canonical shape the Angular app routes to', () => {
  assert.equal(buildTeamPageUrl('58162580', '54755993'), 'https://partitsalcalendari.com/equip/58162580/54755993');
});

test('title, description and canonical all reference the real team name and page URL', () => {
  const html = buildTeamPageHtml({
    teamName: 'CFS LA SÉNIA',
    groupId: '58162580',
    teamId: TEAM_ID,
    matches: [],
    now: NOW,
  });

  assert.match(html, /<title>CFS LA SÉNIA · Calendari FCF \| Partits al Calendari<\/title>/);
  assert.match(html, /CFS LA SÉNIA/);
  assert.match(html, /<link rel="canonical" href="https:\/\/partitsalcalendari\.com\/equip\/58162580\/54755993" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/partitsalcalendari\.com\/equip\/58162580\/54755993" \/>/);
});

test('escapes a team name containing an apostrophe and an ampersand', () => {
  const html = buildTeamPageHtml({
    teamName: "L'AMETLLA & CO",
    groupId: '1',
    teamId: '2',
    matches: [],
    now: NOW,
  });

  assert.match(html, /<title>L&#39;AMETLLA &amp; CO/);
  assert.doesNotMatch(html, /<title>L'AMETLLA & CO/);
});

test('lists upcoming matches with the opponent (not the team itself), for both home and away legs', () => {
  const html = buildTeamPageHtml({
    teamName: 'CFS LA SÉNIA',
    groupId: '58162580',
    teamId: TEAM_ID,
    matches: [
      buildMatch({
        homeTeam: { id: TEAM_ID, name: 'CFS LA SÉNIA' },
        awayTeam: { id: '2', name: 'AWAY RIVAL' },
        startsAt: new Date('2026-09-27T18:30:00.000Z'),
      }),
      buildMatch({
        homeTeam: { id: '3', name: 'HOME RIVAL' },
        awayTeam: { id: TEAM_ID, name: 'CFS LA SÉNIA' },
        startsAt: new Date('2026-10-04T18:30:00.000Z'),
      }),
    ],
    now: NOW,
  });

  assert.match(html, /vs AWAY RIVAL/);
  assert.match(html, /vs HOME RIVAL/);
  assert.doesNotMatch(html, /vs CFS LA SÉNIA/);
});

test('says there is no pending match when every match is in the past', () => {
  const html = buildTeamPageHtml({
    teamName: 'CFS LA SÉNIA',
    groupId: '58162580',
    teamId: TEAM_ID,
    matches: [
      buildMatch({
        homeTeam: { id: TEAM_ID, name: 'CFS LA SÉNIA' },
        awayTeam: { id: '2', name: 'AWAY RIVAL' },
        startsAt: new Date('2026-09-01T18:30:00.000Z'),
      }),
    ],
    now: NOW,
  });

  assert.match(html, /no té cap partit pendent/);
  assert.doesNotMatch(html, /application\/ld\+json/);
});

test('includes a SportsEvent JSON-LD block for the next match, with venue and geo when present', () => {
  const html = buildTeamPageHtml({
    teamName: 'CFS LA SÉNIA',
    groupId: '58162580',
    teamId: TEAM_ID,
    matches: [
      buildMatch({
        homeTeam: { id: TEAM_ID, name: 'CFS LA SÉNIA' },
        awayTeam: { id: '2', name: 'AWAY RIVAL' },
        startsAt: new Date('2026-09-27T18:30:00.000Z'),
        venue: { name: 'Pavelló Municipal', latitude: 40.6335, longitude: 0.4756 },
      }),
    ],
    now: NOW,
  });

  const scriptMatch = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/);
  assert.ok(scriptMatch, 'expected a JSON-LD script tag');
  const jsonLd = JSON.parse(scriptMatch![1] as string) as Record<string, unknown>;

  assert.equal(jsonLd['@type'], 'SportsEvent');
  assert.equal(jsonLd['name'], 'CFS LA SÉNIA - AWAY RIVAL');
  assert.equal(jsonLd['startDate'], '2026-09-27T18:30:00.000Z');
  assert.deepEqual(jsonLd['location'], {
    '@type': 'Place',
    name: 'Pavelló Municipal',
    geo: { '@type': 'GeoCoordinates', latitude: 40.6335, longitude: 0.4756 },
  });
});

test('sets a schema.org eventStatus for a postponed match, but not for a plain scheduled one', () => {
  const postponedHtml = buildTeamPageHtml({
    teamName: 'CFS LA SÉNIA',
    groupId: '1',
    teamId: TEAM_ID,
    matches: [
      buildMatch({
        homeTeam: { id: TEAM_ID, name: 'CFS LA SÉNIA' },
        awayTeam: { id: '2', name: 'AWAY RIVAL' },
        startsAt: new Date('2026-09-27T18:30:00.000Z'),
        status: 'postponed',
      }),
    ],
    now: NOW,
  });
  assert.match(postponedHtml, /"eventStatus":"https:\/\/schema\.org\/EventPostponed"/);

  const scheduledHtml = buildTeamPageHtml({
    teamName: 'CFS LA SÉNIA',
    groupId: '1',
    teamId: TEAM_ID,
    matches: [
      buildMatch({
        homeTeam: { id: TEAM_ID, name: 'CFS LA SÉNIA' },
        awayTeam: { id: '2', name: 'AWAY RIVAL' },
        startsAt: new Date('2026-09-27T18:30:00.000Z'),
        status: 'scheduled',
      }),
    ],
    now: NOW,
  });
  assert.doesNotMatch(scheduledHtml, /eventStatus/);
});
