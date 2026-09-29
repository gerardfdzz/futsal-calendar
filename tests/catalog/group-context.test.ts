import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGroupContextIndex } from '../../src/catalog/group-context.js';
import { SITEMAP_DISCIPLINA_IDS } from '../../src/federation/fcf/fcf-catalog-config.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { KeyedCompetitionCatalogProvider } from '../fixtures/keyed-competition-catalog-provider.js';

const [FUTSAL_ID, FUTSAL_FEM_ID] = SITEMAP_DISCIPLINA_IDS;

test('walks every configured discipline and indexes each group by id, with names attached', async () => {
  const catalog = new KeyedCompetitionCatalogProvider({
    disciplines: [
      { id: FUTSAL_ID, name: 'Futbol Sala' },
      { id: FUTSAL_FEM_ID, name: 'Futbol Sala Femení' },
    ],
    competitionsByDisciplinaId: new Map([
      [FUTSAL_ID, [{ id: 'compA', name: 'Primera Divisió Nacional' }]],
      [FUTSAL_FEM_ID, [{ id: 'compB', name: 'Divisió d\'Honor Femenina' }]],
    ]),
    groupsByCompeticioId: new Map([
      ['compA', [{ id: 'g1', name: 'TGN Gr. 14' }]],
      ['compB', [{ id: 'g2', name: 'BCN Gr. 3' }]],
    ]),
  });

  const index = await buildGroupContextIndex(catalog, noopHttpLogger);

  assert.deepEqual(index.get('g1'), {
    discipline: { id: FUTSAL_ID, name: 'Futbol Sala' },
    competition: { id: 'compA', name: 'Primera Divisió Nacional' },
    group: { id: 'g1', name: 'TGN Gr. 14' },
  });
  assert.deepEqual(index.get('g2'), {
    discipline: { id: FUTSAL_FEM_ID, name: 'Futbol Sala Femení' },
    competition: { id: 'compB', name: "Divisió d'Honor Femenina" },
    group: { id: 'g2', name: 'BCN Gr. 3' },
  });
  assert.equal(index.get('does-not-exist'), undefined);
});

test('a competition with no matching group is simply absent from the index, not an error', async () => {
  const catalog = new KeyedCompetitionCatalogProvider({
    competitionsByDisciplinaId: new Map([[FUTSAL_ID, [{ id: 'compA', name: 'Comp A' }]]]),
    groupsByCompeticioId: new Map([['compA', []]]),
  });

  const index = await buildGroupContextIndex(catalog, noopHttpLogger);

  assert.equal(index.size, 0);
});

test('a failure listing groups for one competition is logged and skipped, other branches still indexed', async () => {
  const catalog = new KeyedCompetitionCatalogProvider({
    competitionsByDisciplinaId: new Map([
      [FUTSAL_ID, [{ id: 'compA', name: 'Comp A' }]],
      [FUTSAL_FEM_ID, [{ id: 'compB', name: 'Comp B' }]],
    ]),
    groupsByCompeticioId: new Map([['compB', [{ id: 'g2', name: 'Group 2' }]]]),
    errorOn: { method: 'listGroups', arg: 'compA' },
  });

  const index = await buildGroupContextIndex(catalog, noopHttpLogger);

  assert.equal(index.get('g1'), undefined);
  assert.ok(index.get('g2'));
});

test('falling back to id-as-name when listDisciplines fails, rather than throwing', async () => {
  const catalog = new KeyedCompetitionCatalogProvider({
    competitionsByDisciplinaId: new Map([[FUTSAL_ID, [{ id: 'compA', name: 'Comp A' }]]]),
    groupsByCompeticioId: new Map([['compA', [{ id: 'g1', name: 'Group 1' }]]]),
    errorOn: { method: 'listDisciplines', arg: '' },
  });

  const index = await buildGroupContextIndex(catalog, noopHttpLogger);

  assert.deepEqual(index.get('g1')?.discipline, { id: FUTSAL_ID, name: FUTSAL_ID });
});

test('throws only when every configured discipline fails to list competitions', async () => {
  const catalog = new KeyedCompetitionCatalogProvider({
    errorOn: { method: 'listCompetitions', arg: FUTSAL_ID },
  });

  await assert.rejects(
    () => buildGroupContextIndex(catalog, noopHttpLogger, undefined, [FUTSAL_ID]),
    /failed to list competitions for every configured discipline/,
  );
});
