/**
 * Local dev server for the `/api/calendar/{groupId}/{teamId}.ics`
 * endpoint — lets you test the real handler end-to-end (route parsing,
 * caching headers, ETag/304 behaviour, error mapping) against real FCF
 * data, over plain HTTP, without a Vercel account or the Vercel CLI.
 *
 * It mounts the exact same `handleCalendarRequest` function the real
 * Vercel deployment uses (see `api/calendar/[groupId]/[teamId].ts`) on a
 * plain `node:http` server — nothing Vercel-specific is re-implemented or
 * mocked here, so what you see locally is what ships.
 *
 * Usage:
 *   npx tsx scripts/dev-server.ts [port]
 *   npm run dev   (see package.json)
 *
 * Then, e.g.:
 *   curl -i http://localhost:3000/api/calendar/58162580/54755993.ics
 *   webcal://localhost:3000/api/calendar/58162580/54755993.ics   (won't
 *     resolve from a real device unless this machine is reachable from
 *     it — fine for curl/browser testing, not for an actual Apple
 *     Calendar subscription test; that needs Milestone 4's real
 *     deployment).
 */
import { createServer } from 'node:http';
import { FcfFederationProvider } from '../src/federation/fcf/fcf.provider.js';
import { handleCalendarRequest } from '../src/http/calendar-http-handler.js';

const port = Number(process.argv[2] ?? process.env['PORT'] ?? 3000);
const provider = new FcfFederationProvider();

const server = createServer((req, res) => {
  handleCalendarRequest(provider, {
    method: req.method,
    url: req.url ?? '',
    ifNoneMatch: firstHeaderValue(req.headers['if-none-match']),
  })
    .then((response) => {
      res.writeHead(response.status, response.headers);
      res.end(response.body);
    })
    .catch((error) => {
      console.error('[dev-server] unhandled error', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    });
});

server.listen(port, () => {
  console.log(`Dev server listening on http://localhost:${port}`);
  console.log(`Try: http://localhost:${port}/api/calendar/58162580/54755993.ics`);
});

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
