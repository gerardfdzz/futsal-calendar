import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeAndSortById, mapCatalogOption } from '../../../src/federation/fcf/fcf-catalog.mapper.js';
import { buildFcfCatalogOptionDto } from '../../fixtures/fcf-catalog.fixtures.js';

test('mapCatalogOption: maps value/label to id/name, trimmed', () => {
  const result = mapCatalogOption(buildFcfCatalogOptionDto({ value: ' 123 ', label: ' TGN Gr. 14 ' }));
  assert.deepEqual(result, { id: '123', name: 'TGN Gr. 14' });
});

test('dedupeAndSortById: collapses repeated ids, keeping the first-seen name', () => {
  const items = [
    { id: '2', name: 'AES LA SÉNIA-STOCKPLUS' },
    { id: '1', name: 'CFS LA SÉNIA' },
    { id: '2', name: 'AES LA SÉNIA-STOCKPLUS (repeated jornada 2)' },
    { id: '1', name: 'CFS LA SÉNIA' },
  ];

  const result = dedupeAndSortById(items);

  assert.equal(result.length, 2);
  const byId = new Map(result.map((item) => [item.id, item.name]));
  assert.equal(byId.get('1'), 'CFS LA SÉNIA');
  assert.equal(byId.get('2'), 'AES LA SÉNIA-STOCKPLUS');
});

test('dedupeAndSortById: sorts the deduplicated result by name', () => {
  const items = [
    { id: '2', name: 'ZZZ Team' },
    { id: '1', name: 'AAA Team' },
  ];

  const result = dedupeAndSortById(items);

  assert.deepEqual(
    result.map((item) => item.name),
    ['AAA Team', 'ZZZ Team'],
  );
});

test('dedupeAndSortById: returns an empty array for empty input', () => {
  assert.deepEqual(dedupeAndSortById([]), []);
});
