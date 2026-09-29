import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crawlTeamPageUrls } from '../../src/sitemap/sitemap-crawler.js';
import { SITEMAP_DISCIPLINA_IDS } from '../../src/federation/fcf/fcf-catalog-config.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { KeyedCompetitionCatalogProvider } from '../fixtures/keyed-competition-catalog-provider.js';

const [FUTSAL_ID, FUTSAL_FEM_ID] = SITEMAP_DISCIPLINA_IDS;

test('walks every configured discipline and returns one URL per team it finds', async () => {
  const catalog = new KeyedCompetitionCatalogProvider({
    competitionsByDisciplinaId: new Map([
      [FUTSAL_ID, [{ id: 'compA', name: 'Comp A' }]],
      [FUTSAL_FEM_ID, [{ id: 'compB', name: 'Comp B' }]],
    ]),
    groupsByCompeticioId: new Map([
      ['compA', [{ id: 'g1', name: 'Group 1' }]],
      ['compB', [{ id: 'g2', name: 'Group 2' }]],
    ]),
    teamsByGrupId: new Map([
      ['g1', [{ id: 't1', name: 'Team 1' }]],
      ['g2', [{ id: 't2', name: 'Team 2' }]],
    ]),
  });

  const pages = await crawlTeamPageUrls(catalog, noopHttpLogger, '22');

  const urls = pages.map((p) => p.url).sort();
  assert.deepEqual(urls, [
    'https://partitsalcalendari.com/equip/g1/t1',
    'https://partitsalcalendari.com/equip/g2/t2',
  ]);

  const disciplinesQueried = catalog.calls.filter((c) => c.method === 'listCompetitions').map((c) => c.args[0]);
  assert.deepEqual(new Set(disciplinesQueried), new Set(SITEMAP_DISCIPLINA_IDS));
});

test('never queries a discipline outside SITEMAP_DISCIPLINA_IDS', async () => {
  const catalog = new KeyedCompetitionCatalogProvider({});
  await crawlTeamPageUrls(catalog, noopHttpLogger, '22');

  const disciplinesQueried = catalog.calls
    .filter((c) => c.method === 'listCompetitions')
    .map((c) => c.args[0] ?? '');
  for (const id of disciplinesQueried) {
    assert.ok((SITEMAP_DISCIPLINA_IDS as readonly string[]).includes(id), `unexpected discipline id queried: ${id}`);
  }
});

test('dedupes the same (groupId, teamId) pair if the same group is reachable twice', async () => {
  const catalog = new KeyedCompetitionCatalogProvider({
    competitionsByDisciplinaId: new Map([
      [FUTSAL_ID, [{ id: 'compA', name: 'Comp A' }, { id: 'compB', name: 'Comp B' }]],
      [FUTSAL_FEM_ID, []],
    ]),
    groupsByCompeticioId: new Map([
      ['compA', [{ id: 'sharedGroup', name: 'Shared' }]],
      ['compB', [{ id: 'sharedGroup', name: 'Shared' }]],
    ]),
    teamsByGrupId: new Map([['sharedGroup', [{ id: 't1', name: 'Team 1' }]]]),
  });

  const pages = await crawlTeamPageUrls(catalog, noopHttpLogger, '22');
  assert.equal(pages.length, 1);
});

test('best-effort: a failing competition is skipped, the rest of the crawl still completes', async () => {
  const catalog = new KeyedCompetitionCatalogProvider({
    competitionsByDisciplinaId: new Map([
      [FUTSAL_ID, [{ id: 'brokenComp', name: 'Broken' }, { id: 'okComp', name: 'OK' }]],
      [FUTSAL_FEM_ID, []],
    ]),
    groupsByCompeticioId: new Map([['okComp', [{ id: 'g1', name: 'Group 1' }]]]),
    teamsByGrupId: new Map([['g1', [{ id: 't1', name: 'Team 1' }]]]),
    errorOn: { method: 'listGroups', arg: 'brokenComp' },
  });

  const pages = await crawlTeamPageUrls(catalog, noopHttpLogger, '22');
  assert.deepEqual(pages.map((p) => p.url), ['https://partitsalcalendari.com/equip/g1/t1']);
});

test('best-effort: a failing group is skipped, other groups still contribute their teams', async () => {
  const catalog = new KeyedCompetitionCatalogProvider({
    competitionsByDisciplinaId: new Map([
      [FUTSAL_ID, [{ id: 'compA', name: 'Comp A' }]],
      [FUTSAL_FEM_ID, []],
    ]),
    groupsByCompeticioId: new Map([['compA', [{ id: 'brokenGroup', name: 'Broken' }, { id: 'okGroup', name: 'OK' }]]]),
    teamsByGrupId: new Map([['okGroup', [{ id: 't1', name: 'Team 1' }]]]),
    errorOn: { method: 'listTeams', arg: 'brokenGroup' },
  });

  const pages = await crawlTeamPageUrls(catalog, noopHttpLogger, '22');
  assert.deepEqual(pages.map((p) => p.url), ['https://partitsalcalendari.com/equip/okGroup/t1']);
});
