import type { Match } from '../domain/match.js';
import type { MatchStatus } from '../domain/match-status.js';
import { escapeHtml } from './html-escape.js';
import { DEFAULT_UID_DOMAIN } from '../calendar/ics-config.js';

const TIME_ZONE = 'Europe/Madrid';
const MAX_LISTED_MATCHES = 10;

const SCHEMA_EVENT_STATUS: Readonly<Partial<Record<MatchStatus, string>>> = {
  postponed: 'https://schema.org/EventPostponed',
  cancelled: 'https://schema.org/EventCancelled',
};

const dateFormatter = new Intl.DateTimeFormat('ca-ES', {
  timeZone: TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

export interface TeamPageHtmlOptions {
  readonly teamName: string;
  readonly groupId: string;
  readonly teamId: string;
  readonly matches: readonly Match[];
  readonly now?: Date;
}

export function buildTeamPageUrl(groupId: string, teamId: string): string {
  return `https://${DEFAULT_UID_DOMAIN}/equip/${encodeURIComponent(groupId)}/${encodeURIComponent(teamId)}`;
}

export function buildTeamPageHtml(options: TeamPageHtmlOptions): string {
  const now = options.now ?? new Date();
  const pageUrl = buildTeamPageUrl(options.groupId, options.teamId);

  const upcoming = [...options.matches]
    .filter((match) => match.startsAt.getTime() >= now.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const nextMatch = upcoming[0];

  const title = `${options.teamName} · Calendari FCF | Partits al Calendari`;
  const description = `Calendari i pròxims partits de ${options.teamName} (Federació Catalana de Futbol). Sincronitza'l amb Apple Calendar o Google Calendar sense haver de descarregar res.`;
  const imageUrl = `https://${DEFAULT_UID_DOMAIN}/og-image.png`;

  const jsonLdScript = nextMatch
    ? `<script type="application/ld+json">${safeJsonForScript(buildNextMatchJsonLd(nextMatch, pageUrl))}</script>\n`
    : '';

  return `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${pageUrl}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Partits al Calendari" />
<meta property="og:locale" content="ca_ES" />
<meta property="og:url" content="${pageUrl}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${imageUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${imageUrl}" />
${jsonLdScript}</head>
<body>
<h1>${escapeHtml(options.teamName)}</h1>
<p>Calendari de partits de ${escapeHtml(options.teamName)}, sincronitzat automàticament amb la Federació Catalana de Futbol (FCF).</p>
${buildMatchListHtml(upcoming, options.teamId)}
<p><a href="${pageUrl}">Veure el calendari complet i afegir-lo al teu Apple Calendar o Google Calendar</a></p>
</body>
</html>
`;
}

function buildMatchListHtml(upcoming: readonly Match[], teamId: string): string {
  if (upcoming.length === 0) {
    return '<p>Aquest equip no té cap partit pendent en aquest moment.</p>';
  }

  const items = upcoming
    .slice(0, MAX_LISTED_MATCHES)
    .map((match) => {
      const opponent = match.homeTeam.id === teamId ? match.awayTeam : match.homeTeam;
      const venue = match.venue ? ` — ${escapeHtml(match.venue.name)}` : '';
      return `<li>${escapeHtml(dateFormatter.format(match.startsAt))}: vs ${escapeHtml(opponent.name)}${venue}</li>`;
    })
    .join('\n');

  return `<ul>\n${items}\n</ul>`;
}

function buildNextMatchJsonLd(match: Match, pageUrl: string): Record<string, unknown> {
  const eventStatus = SCHEMA_EVENT_STATUS[match.status];
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeTeam.name} - ${match.awayTeam.name}`,
    startDate: match.startsAt.toISOString(),
    url: pageUrl,
    ...(eventStatus ? { eventStatus } : {}),
    ...(match.venue
      ? {
          location: {
            '@type': 'Place',
            name: match.venue.name,
            ...(match.venue.latitude !== undefined && match.venue.longitude !== undefined
              ? {
                  geo: {
                    '@type': 'GeoCoordinates',
                    latitude: match.venue.latitude,
                    longitude: match.venue.longitude,
                  },
                }
              : {}),
          },
        }
      : {}),
    homeTeam: { '@type': 'SportsTeam', name: match.homeTeam.name },
    awayTeam: { '@type': 'SportsTeam', name: match.awayTeam.name },
  };
}

function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
