export const DEFAULT_DISCIPLINA_ID = '19308236';

export const DEFAULT_TEMPORADA_ID = process.env['FCF_DEFAULT_TEMPORADA_ID'] ?? '22';

// Discipline ids the sitemap crawler walks (src/sitemap/sitemap-crawler.ts). Confirmed
// 2026-09 against the real FCF catalog: "Futbol Sala" (== DEFAULT_DISCIPLINA_ID above) and
// "Futbol Sala Femení". Deliberately NOT every discipline the FCF has (Futbol 11/7/5,
// Futbol Femení, Futbol Platja): a full crawl across all 7 disciplines measured ~460+
// groups just for futsal alone, so covering every sport would multiply that several times
// over for a discipline this app was never built for. See README "Design decisions".
export const SITEMAP_DISCIPLINA_IDS = [DEFAULT_DISCIPLINA_ID, '24694879'] as const;
