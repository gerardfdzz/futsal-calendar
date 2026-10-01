import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import { DEFAULT_TEMPORADA_ID, SITEMAP_DISCIPLINA_IDS } from '../federation/fcf/fcf-catalog-config.js';
import { pMapLimit } from '../shared/p-map-limit.js';
import { buildTeamPageUrl } from '../seo/team-page-html.js';
import type { HttpLogger } from '../http/http-logger.js';

const CRAWL_CONCURRENCY = 6;

export interface CrawledTeamPage {
  readonly url: string;
}

export async function crawlTeamPageUrls(
  catalog: CompetitionCatalogProvider,
  logger: HttpLogger,
  temporadaId: string = DEFAULT_TEMPORADA_ID,
): Promise<CrawledTeamPage[]> {
  let disciplineFailures = 0;
  const competitionsPerDiscipline = await pMapLimit(SITEMAP_DISCIPLINA_IDS, CRAWL_CONCURRENCY, async (disciplinaId) => {
    try {
      return await catalog.listCompetitions(disciplinaId, temporadaId);
    } catch (error) {
      disciplineFailures++;
      logger.error('sitemap: failed to list competitions for a discipline, skipping it', {
        disciplinaId,
        error: errorMessage(error),
      });
      return [];
    }
  });

  if (SITEMAP_DISCIPLINA_IDS.length > 0 && disciplineFailures === SITEMAP_DISCIPLINA_IDS.length) {
    throw new Error('sitemap crawl: failed to list competitions for every configured discipline');
  }

  const competitions = competitionsPerDiscipline.flat();

  const groupsPerCompetition = await pMapLimit(competitions, CRAWL_CONCURRENCY, async (competition) => {
    try {
      return await catalog.listGroups(competition.id);
    } catch (error) {
      logger.error('sitemap: failed to list groups for a competition, skipping it', {
        competitionId: competition.id,
        error: errorMessage(error),
      });
      return [];
    }
  });
  const groups = groupsPerCompetition.flat();

  const seenTeamKeys = new Set<string>();
  const pages: CrawledTeamPage[] = [];

  await pMapLimit(groups, CRAWL_CONCURRENCY, async (group) => {
    try {
      const teams = await catalog.listTeams(group.id);
      for (const team of teams) {
        const key = `${group.id}:${team.id}`;
        if (seenTeamKeys.has(key)) {
          continue;
        }
        seenTeamKeys.add(key);
        pages.push({ url: buildTeamPageUrl(group.id, team.id) });
      }
    } catch (error) {
      logger.error('sitemap: failed to list teams for a group, skipping it', {
        groupId: group.id,
        error: errorMessage(error),
      });
    }
  });

  return pages;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
