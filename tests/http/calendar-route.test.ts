import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidCalendarRouteError, parseCalendarRoute } from '../../src/http/calendar-route.js';

test('parses a well-formed calendar path', () => {
  const params = parseCalendarRoute('/api/calendar/58162580/54755993.ics');
  assert.deepEqual(params, { groupId: '58162580', teamId: '54755993' });
});

test('is case-insensitive about the .ics suffix', () => {
  const params = parseCalendarRoute('/api/calendar/58162580/54755993.ICS');
  assert.equal(params.teamId, '54755993');
});

test('ignores a query string', () => {
  const params = parseCalendarRoute('/api/calendar/58162580/54755993.ics?foo=bar&baz=qux');
  assert.deepEqual(params, { groupId: '58162580', teamId: '54755993' });
});

test('decodes URL-encoded segments', () => {
  const params = parseCalendarRoute('/api/calendar/group%20id/team%2Did.ics');
  assert.deepEqual(params, { groupId: 'group id', teamId: 'team-id' });
});

test('works with or without a leading "/api" prefix, as long as "calendar" is present', () => {
  const withApi = parseCalendarRoute('/api/calendar/58162580/54755993.ics');
  const withoutApi = parseCalendarRoute('/calendar/58162580/54755993.ics');
  assert.deepEqual(withApi, withoutApi);
});

test('throws InvalidCalendarRouteError when the "calendar" segment is missing', () => {
  assert.throws(() => parseCalendarRoute('/api/58162580/54755993.ics'), InvalidCalendarRouteError);
});

test('throws InvalidCalendarRouteError when the teamId segment is missing', () => {
  assert.throws(() => parseCalendarRoute('/api/calendar/58162580'), InvalidCalendarRouteError);
});

test('throws InvalidCalendarRouteError when the team segment has no .ics suffix', () => {
  assert.throws(() => parseCalendarRoute('/api/calendar/58162580/54755993'), InvalidCalendarRouteError);
});

test('throws InvalidCalendarRouteError when groupId is empty', () => {
  assert.throws(() => parseCalendarRoute('/api/calendar//54755993.ics'), InvalidCalendarRouteError);
});

test('throws InvalidCalendarRouteError when teamId is empty (just the extension)', () => {
  assert.throws(() => parseCalendarRoute('/api/calendar/58162580/.ics'), InvalidCalendarRouteError);
});

test('throws InvalidCalendarRouteError for a completely unrelated path', () => {
  assert.throws(() => parseCalendarRoute('/favicon.ico'), InvalidCalendarRouteError);
});
