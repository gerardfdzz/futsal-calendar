/**
 * Manual smoke test against the REAL FCF endpoint — not part of the test
 * suite (no network calls in `npm test`), just a way to eyeball real data.
 *
 * IMPORTANT: this has never been run against the live FCF endpoint yet.
 * The sandbox this project was built in has no network access to
 * www.fcf.cat, so `FcfFederationProvider` was only verified against
 * mocked responses (see tests/federation/fcf/fcf.provider.test.ts). This
 * script is the first real check — run it and tell me what comes back,
 * especially:
 *   - whether the actual JSON shape matches FcfMatchDto,
 *   - what CERRADA/ESTADO look like for matches that aren't scheduled,
 *   - whether isBye() correctly finds the "Descans" round, if any.
 *
 * Usage:
 *   npx tsx scripts/smoke-fcf.ts [groupId]
 *
 * Defaults to the group from the project brief (58162580, "TGN Gr. 14").
 */
import { FcfFederationProvider } from '../src/federation/fcf/fcf.provider.js';
import { filterTeamMatches } from '../src/matches/match-filter.js';

const GROUP_ID = process.argv[2] ?? '58162580';
const KNOWN_TEAM_IDS = {
  'CFS LA SÉNIA': '54755993',
  'AES LA SÉNIA-STOCKPLUS': '50795143',
};

async function main(): Promise<void> {
  console.log(`Fetching matches for groupId=${GROUP_ID}...\n`);

  const provider = new FcfFederationProvider();
  const matches = await provider.getMatches(GROUP_ID);

  console.log(`Total matches (byes already excluded): ${matches.length}\n`);

  for (const match of matches.slice(0, 5)) {
    console.log(
      `#${match.id} J${match.round} [${match.status}] ${match.homeTeam.name} (${match.homeTeam.id}) vs ` +
        `${match.awayTeam.name} (${match.awayTeam.id}) — ${match.startsAt.toISOString()} @ ${
          match.venue?.name ?? '(sin pabellón)'
        }`,
    );
  }
  if (matches.length > 5) {
    console.log(`... (${matches.length - 5} more)`);
  }

  console.log('\n--- Filtered by known team ---');
  for (const [name, teamId] of Object.entries(KNOWN_TEAM_IDS)) {
    const teamMatches = filterTeamMatches(matches, teamId);
    console.log(`${name} (${teamId}): ${teamMatches.length} matches`);
  }

  const unknownStatuses = matches.filter((m) => m.status === 'unknown');
  if (unknownStatuses.length > 0) {
    console.log(`\n${unknownStatuses.length} match(es) with status 'unknown' — check the warnings logged above.`);
  }
}

main().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exitCode = 1;
});
