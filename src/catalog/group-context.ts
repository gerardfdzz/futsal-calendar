import type { Competition, Discipline, Group } from '../domain/competition-catalog.js';
import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import { DEFAULT_TEMPORADA_ID, SITEMAP_DISCIPLINA_IDS } from '../federation/fcf/fcf-catalog-config.js';
import { pMapLimit } from '../shared/p-map-limit.js';
import type { HttpLogger } from '../http/http-logger.js';

const WALK_CONCURRENCY = 6;

export interface GroupContext {
  readonly discipline: Discipline;
  readonly competition: Competition;
  readonly group: Group;
}

/**
 * Walks the same discipline -> competitions -> groups tree as the sitemap crawler
 * (src/sitemap/sitemap-crawler.ts), but keeps the discipline/competition/group *names*
 * instead of turning them into team-page URLs. A `groupId` alone (all `TeamCalendarPage`
 * has) doesn't carry its competition or discipline name — the FCF catalog is a strictly
 * top-down hierarchy (discipline -> competitions -> groups -> teams) with no reverse
 * lookup endpoint, so the only way to answer "which competition/discipline is this group
 * in" is to walk the whole known tree and build an index once. Same best-effort
 * philosophy as the sitemap crawler: a failure on one branch is logged and skipped
 * rather than aborting the whole walk. Callers should cache the result — see
 * `src/http/group-context-http-handler.ts` — since this costs the same hundreds of FCF
 * requests the sitemap crawl does.
 */
export async function buildGroupContextIndex(
  catalog: CompetitionCatalogProvider,
  logger: HttpLogger,
  temporadaId: string = DEFAULT_TEMPORADA_ID,
  disciplinaIds: readonly string[] = SITEMAP_DISCIPLINA_IDS,
): Promise<Map<string, GroupContext>> {
  const disciplineById = new Map((await safeListDisciplines(catalog, logger)).map((d) => [d.id, d] as const));

  let disciplineFailures = 0;
  const competitionsPerDiscipline = await pMapLimit(disciplinaIds, WALK_CONCURRENCY, async (disciplinaId) => {
    try {
      const competitions = await catalog.listCompetitions(disciplinaId, temporadaId);
      return competitions.map((competition) => ({ competition, disciplinaId }));
    } catch (error) {
      disciplineFailures++;
      logger.error('group-context: failed to list competitions for a discipline, skipping it', {
        disciplinaId,
        error: errorMessage(error),
      });
      return [];
    }
  });

  if (disciplinaIds.length > 0 && disciplineFailures === disciplinaIds.length) {
    throw new Error('group-context: failed to list competitions for every configured discipline');
  }

  const competitionEntries = competitionsPerDiscipline.flat();
  const index = new Map<string, GroupContext>();

  await pMapLimit(competitionEntries, WALK_CONCURRENCY, async ({ competition, disciplinaId }) => {
    let groups: Group[];
    try {
      groups = await catalog.listGroups(competition.id);
    } catch (error) {
      logger.error('group-context: failed to list groups for a competition, skipping it', {
        competitionId: competition.id,
        error: errorMessage(error),
      });
      return;
    }

    const discipline: Discipline = disciplineById.get(disciplinaId) ?? { id: disciplinaId, name: disciplinaId };
    for (const group of groups) {
      index.set(group.id, { discipline, competition, group });
    }
  });

  return index;
}

async function safeListDisciplines(catalog: CompetitionCatalogProvider, logger: HttpLogger): Promise<Discipline[]> {
  try {
    return await catalog.listDisciplines();
  } catch (error) {
    logger.error('group-context: failed to list disciplines; falling back to id-as-name', {
      error: errorMessage(error),
    });
    return [];
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
