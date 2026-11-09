import { FcfFederationProvider } from '../../src/federation/fcf/fcf.provider.js';
import { getTeamMatches } from '../../src/matches/team-matches.service.js';
import { buildSummaryText } from '../../src/calendar/ics-generator.js';
import { DEFAULT_MATCH_DURATION_MINUTES } from '../../src/calendar/ics-config.js';
import { GOOGLE_CALENDAR_SUMMARY, SUBSCRIPTIONS } from './config.js';
import { GoogleCalendarClient } from './google-calendar-client.js';

async function main(): Promise<void> {
  const provider = new FcfFederationProvider();
  const client = await GoogleCalendarClient.fromStoredCredentials();
  const calendarId = await client.getOrCreateCalendarId(GOOGLE_CALENDAR_SUMMARY);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const subscription of SUBSCRIPTIONS) {
    let matches;
    try {
      matches = await getTeamMatches(provider, subscription.groupId, subscription.teamId);
    } catch (error) {
      console.error(`[${subscription.label}] no s'han pogut obtenir els partits:`, error);
      failed += 1;
      continue;
    }

    console.log(`[${subscription.label}] ${matches.length} partits trobats.`);

    for (const match of matches) {
      const endsAt = new Date(match.startsAt.getTime() + DEFAULT_MATCH_DURATION_MINUTES * 60_000);

      try {
        const result = await client.upsertEvent(calendarId, {
          codacta: match.id,
          summary: buildSummaryText(match),
          startIso: match.startsAt.toISOString(),
          endIso: endsAt.toISOString(),
          timeZone: 'Europe/Madrid',
          ...(match.venue ? { location: match.venue.name } : {}),
        });

        if (result === 'created') {
          created += 1;
        } else {
          updated += 1;
        }
      } catch (error) {
        console.error(`[${subscription.label}] no s'ha pogut sincronitzar el partit ${match.id}:`, error);
        failed += 1;
      }
    }
  }

  console.log(`\nSincronització completa: ${created} creats, ${updated} actualitzats, ${failed} errors.`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Personal sync failed:', error);
  process.exitCode = 1;
});
