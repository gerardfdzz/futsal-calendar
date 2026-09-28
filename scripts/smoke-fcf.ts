import { FcfFederationProvider } from '../src/federation/fcf/fcf.provider.js';
import { filterTeamMatches } from '../src/matches/match-filter.js';

const GROUP_ID = process.argv[2] ?? '58162580';
const LOOKUP_CODACTA = process.argv[3];
const KNOWN_TEAM_IDS = {
  'CFS LA SÉNIA': '54755993',
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

  if (LOOKUP_CODACTA) {
    console.log(`\n--- Match with CODACTA=${LOOKUP_CODACTA} ---`);
    const found = matches.find((m) => m.id === LOOKUP_CODACTA);
    if (!found) {
      console.log('(not found in mapped matches — could be a bye, or excluded/failed to map; check warnings above)');
    } else {
      console.log(JSON.stringify(found, null, 2));
    }
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
