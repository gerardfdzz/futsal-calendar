/**
 * Manual smoke test: fetches real matches for a team from the FCF,
 * generates the actual `.ics` file, writes it locally, and prints a
 * short summary — so you can open the file in a calendar app or ICS
 * validator and eyeball it.
 *
 * Usage:
 *   npx tsx scripts/smoke-ics.ts [groupId] [teamId]
 *
 * Defaults to CFS LA SÉNIA in group 58162580.
 */
import { writeFileSync } from 'node:fs';
import { FcfFederationProvider } from '../src/federation/fcf/fcf.provider.js';
import { filterTeamMatches } from '../src/matches/match-filter.js';
import { generateIcs } from '../src/calendar/ics-generator.js';

const GROUP_ID = process.argv[2] ?? '58162580';
const TEAM_ID = process.argv[3] ?? '54755993'; // CFS LA SÉNIA

async function main(): Promise<void> {
  console.log(`Fetching matches for groupId=${GROUP_ID}, teamId=${TEAM_ID}...\n`);

  const provider = new FcfFederationProvider();
  const allMatches = await provider.getMatches(GROUP_ID);
  const teamMatches = filterTeamMatches(allMatches, TEAM_ID);

  if (teamMatches.length === 0) {
    console.error(`No matches found for teamId=${TEAM_ID} in groupId=${GROUP_ID}. Wrong id?`);
    process.exitCode = 1;
    return;
  }

  const firstMatch = teamMatches[0];
  if (!firstMatch) {
    throw new Error('unreachable: teamMatches.length > 0 but no [0] element');
  }
  const calendarName =
    firstMatch.homeTeam.id === TEAM_ID ? firstMatch.homeTeam.name : firstMatch.awayTeam.name;

  const ics = generateIcs(teamMatches, { calendarName });

  const outputPath = `./tmp-${TEAM_ID}.ics`;
  writeFileSync(outputPath, ics, 'utf-8');

  console.log(`Wrote ${teamMatches.length} events to ${outputPath}\n`);
  console.log('--- First event (unfolded preview) ---');
  const firstEventBlock = ics.split('BEGIN:VEVENT')[1]?.split('END:VEVENT')[0];
  console.log('BEGIN:VEVENT' + (firstEventBlock ?? '') + 'END:VEVENT');

  console.log(
    '\nOpen the .ics file with Calendar (double-click, or "Import" in Apple Calendar / Google Calendar) to check it renders correctly.',
  );
}

main().catch((error) => {
  console.error('ICS smoke test failed:', error);
  process.exitCode = 1;
});
