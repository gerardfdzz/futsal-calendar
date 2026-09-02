# futsal-calendar

Sync a Catalan Futsal Federation (FCF) team's matches to a subscribed calendar (`webcal://`, RFC 5545) in Apple Calendar or any other compatible client. When the FCF changes a match's date, time, venue, or status, the calendar updates itself — no download or re-import required.

Node/TypeScript backend on Vercel serverless functions + Angular 17 frontend to pick a team and get the subscription URL.

**Status: working end to end.** Deployed at `partitsalcalendari.com`, with a real subscription verified on an iPhone. 171 tests, `tsc --strict` with no `any`.

## How it works

1. The user picks discipline → competition → group → team in the wizard at `/`.
2. That leads to `/equip/{groupId}/{teamId}`, with the team's calendar and a subscribe button whose behavior depends on the device (see "Platform-aware subscription" under Design decisions): on Apple it opens `webcal://.../api/calendar/{groupId}/{teamId}.ics` directly; on any other device it copies the `https://` URL and guides the user to add it from their calendar app.
3. The calendar client (Apple Calendar, Google Calendar...) subscribes to that URL. Every time it re-fetches it, it gets a `.ics` generated on the spot from the FCF's current data — no cache or database in between.
4. Each event's `UID` is stable (`fcf-{CODACTA}@partitsalcalendari.com`), so a date/time/venue change updates the existing event instead of creating a duplicate.

There's no way to force a calendar client to refresh instantly — the app never promises instant sync, only automatic sync.

## Architecture

```
domain/                  Match, TeamRef, Venue, MatchStatus, catalog — knows nothing about the FCF
federation/fcf/*          the only place that knows about fcf.cat: providers, date parsing, mappers
matches/                  filtering by team (never by name — two clubs can share a name)
calendar/                 ICS generation (RFC 5545) + orchestration + content ETag
http/                     framework-agnostic HTTP handlers (request/response as plain objects)
api/                      thin Vercel adapters — delegate everything to http/
scripts/dev-server.ts     local node:http adapter, same handler as Vercel
web/                      Angular 17 frontend (selection wizard + team calendar)
```

General principle: the FCF stays completely isolated behind `FederationProvider`/`CompetitionCatalogProvider` (port) and its `Fcf*` implementations (adapter). The rest of the app only knows its own domain model.

### Folder structure

```
api/
  calendar/[groupId]/[teamId].ts        ICS
  disciplines.ts
  competitions.ts
  competitions/[competicioId]/groups.ts
  groups/[grupId]/teams.ts
  matches/[groupId]/[teamId].ts         JSON (consumed by the frontend)
src/
  domain/           team.ts, venue.ts, match-status.ts, match.ts, competition-catalog.ts
  shared/           timezone.ts
  federation/
    federation-provider.ts, competition-catalog-provider.ts
    fcf/            fcf.provider.ts, fcf.mapper.ts, fcf-date.ts, fcf-bye.ts, fcf-status.mapper.ts,
                     fcf-http-client.ts, fcf-catalog-config.ts, fcf-competition-catalog.provider.ts,
                     fcf-catalog.mapper.ts, fcf-logger.ts, fcf.types.ts, fcf-catalog.types.ts
  matches/          match-filter.ts, team-matches.service.ts
  calendar/         ics-generator.ts, ics-config.ts, ics-text.ts, ics-timezone.ts, ics-status.mapper.ts,
                     calendar.service.ts, match-content-hash.ts
  http/             calendar-route.ts, calendar-http-handler.ts, catalog-route.ts,
                     catalog-http-handler.ts, matches-http-handler.ts, http-logger.ts
scripts/            run-tests.mjs, smoke-fcf.ts, smoke-ics.ts, dev-server.ts
tests/              same structure as src/, one *.test.ts per module
web/
  src/app/
    core/           models/, services/, utils/
    shared/         app-shell/, selector-step-list/, status-badge/, add-to-calendar-button/
    features/
      team-selector/team-selector.page.{ts,html,scss}
      team-calendar/team-calendar.page.{ts,html,scss}, next-match-hero/, match-list-item/
  src/styles/_tokens.scss, src/styles.scss
```

## Running locally

The backend and frontend are two separate processes (the frontend calls `/api/*` over HTTP).

```bash
# Terminal 1 — backend, port 3000
npm install
npm run dev

# Terminal 2 — frontend, port 4200 (proxies /api to 3000)
cd web
npm install
npm start
```

Open `http://localhost:4200/`. The proxy (`web/proxy.conf.json`, referenced from `angular.json`) is only needed locally — on Vercel, the frontend and the `api/` functions live under the same domain, so `/api/*` works without a proxy.

To test just the backend:

```bash
curl -i http://localhost:3000/api/calendar/{groupId}/{teamId}.ics
curl -i http://localhost:3000/api/disciplines
```

## Environment variables

None is required — the app works with its defaults. Set them in Vercel (Project Settings → Environment Variables) if you need to adjust them without a new code deploy:

| Variable | Effect | Default |
|---|---|---|
| `FCF_USER_AGENT_CONTACT` | Adds a contact (email) to the `User-Agent` header the app sends to the FCF on every request. | none |
| `FCF_DEFAULT_TEMPORADA_ID` | `temporada` id used by `/api/competitions` when the client doesn't specify one. The FCF doesn't expose a stable "current season", so this value needs a yearly check when the FCF opens the next season (confirm against `/api/competition/temporadas` before changing it). | `22` |

`DEFAULT_UID_DOMAIN` (the domain used in each ICS event's `UID`) is **deliberately not** configurable via environment: changing it would generate different UIDs for existing matches, which Apple Calendar (and any RFC 5545 client) would interpret as new duplicate events instead of updates. It's fixed in code (`src/calendar/ics-config.ts`) to the real deployment domain.

## Testing

```bash
npm run typecheck   # tsc --noEmit, TypeScript strict, no any
npm test            # 171 tests, node:test via tsx
npm run smoke:fcf    # real call to the FCF — prints matches for a real group
npm run smoke:ics    # generates a real .ics for a team and writes it to disk
```

`scripts/run-tests.mjs` discovers `*.test.ts` files with `fs.readdirSync` (not `find`/shell globbing) and runs `node --import tsx --test` without `shell: true`, so it behaves the same on Windows as on Linux/macOS.

## Deployment (Vercel)

`vercel.json`:

```json
{
  "buildCommand": "cd web && npm install && npm run build",
  "outputDirectory": "web/dist/web/browser",
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

`outputDirectory` points at `browser/` because Angular 17's `application` builder always writes there, even without SSR. The rewrite is a standard SPA fallback: Vercel first serves any static file or `api/` function that exists, and only falls back to `index.html` when nothing matches.

The backend script that runs `tsc --noEmit` is called `typecheck`, not `build` — Vercel automatically runs `npm run build` if that script exists (even without configuring it in the dashboard), and with `NODE_ENV=production` it doesn't install `devDependencies`, so `tsc` wouldn't even be available. The `api/` functions are compiled on the fly from `.ts` by Vercel's own Node runtime.

## Design decisions

**Time zone**: the FCF returns dates like `"2026-09-26 18:30:00"`, Europe/Madrid local time, with no offset. They're never parsed with `new Date(string)` (ambiguous/runtime-dependent); `shared/timezone.ts` uses `Intl.DateTimeFormat` to resolve the real offset (CET/CEST) at that specific instant and explicitly convert between wall time and UTC.

**Stable UID**: `fcf-{CODACTA}@partitsalcalendari.com`. `CODACTA` is the FCF's own match identifier and doesn't change even if date/time/venue/status change — that's what lets an update be a real update instead of a duplicate event.

**No external ICS library**: the subset of RFC 5545 in use is small and stable, and the two delicate parts (UTF-8 octet-level folding, `TEXT` escaping) are isolated in `ics-text.ts` with edge-case tests. Switching to a library like `ical-generator` is a mechanical change if it's ever needed.

**`SEQUENCE` fixed at `0`, `DTSTAMP`/`LAST-MODIFIED` always "now"**: computing a real `SEQUENCE` would require persisting the last known snapshot of each match in order to diff it. Without that persistence, any other value would be made up. The practical impact is low: `SEQUENCE` matters mostly in iTIP invitation flows (organizer/attendees); this is a read-only **subscribed** calendar (`METHOD:PUBLISH`), and calendar clients replace the event by `UID` on every refresh, without diffing against `SEQUENCE` — behavior already confirmed with a real subscription on an iPhone.

**Content ETag, not ICS-text ETag**: since `DTSTAMP`/`LAST-MODIFIED` change on every generation, an ETag over the full ICS text would always change, defeating the cache. `match-content-hash.ts` computes a SHA-256 only over the fields a subscriber actually cares about (teams, schedule, venue, status, calendar name) — stable as long as that data doesn't change, enabling a real `304`.

**30–60 minute Cache-Control, no promise of instant sync**: caps how long an HTTP-compliant client reuses the response, but doesn't control when Apple Calendar (or another `webcal://` client) re-fetches the URL — that's up to the client, not the server.

**No cron or persistence (for now)**: live generation on every request (with `Cache-Control` + ETag) already handles immediate change propagation and cache reuse by HTTP-compliant clients. The only thing it doesn't give us is a real `SEQUENCE`/`LAST-MODIFIED` (see above). Introducing cron + persistence would make sense if real signals show up: FCF outages observed in production, more subscribers than a live request can sustain, or a genuine need for a correct `SEQUENCE` (for example, if the project moved to an invitation-based flow). If it's ever needed, the only thing worth persisting is "the last known match snapshot per group" — a simple key-value store (e.g. Vercel KV) is enough, not a relational database.

**Always filter by team id, never by name**: two different clubs in the same group can share text in their name (seen in real data), so all filtering uses `CODEQUIPO_CASA`/`CODEQUIPO_FUERA`.

**FCF statuses**: only what's confirmed against real data is mapped (`scheduled`); any other code is an explicit `'unknown'` instead of a guessed translation.

**Cascading selector instead of free search**: the FCF's club-name search (`/api/clubs/search`) is broken for Futsal (returns no teams), confirmed against the real API. The wizard instead uses the FCF's own cascading catalog (discipline → competition → group → team), verified end-to-end and with the same schema across every discipline.

**Framework-agnostic HTTP handlers**: `handle*Request()` takes and returns plain objects (`{method, url, ...}` → `{status, headers, body}`), with no Vercel or `node:http` types. The `api/` and `scripts/dev-server.ts` adapters are each a ~20-line translation to their concrete runtime, which lets the handlers be tested without mocking either one.

**Platform-aware subscription**: the Google Calendar app for Android has no way to subscribe to a URL directly (confirmed — it's a known limitation of the app itself, not something a client can work around), so a single `webcal://` link button only really works on Apple. `AddToCalendarButtonComponent` detects the platform from `navigator.userAgent`: on Apple (iOS/macOS) it keeps the one-tap `webcal://` link; on any other device, the primary button becomes "copy URL", together with a shortcut to Google Calendar's add-by-URL screen and instructions for that flow.

**No team crests**: the crest URLs the FCF returns (`ESCUDO_CASA`/`ESCUDO_FUERA`) don't load reliably, so the UI only shows the team name — no image and no initials fallback.

**Visual design**: the UI's look and feel (colors, typography, spacing, layout) was designed with [Google Stitch](https://stitch.withgoogle.com/), Google's AI-assisted UI design tool, starting from this project: https://stitch.withgoogle.com/projects/6523744783108261217. The resulting design tokens were ported by hand into plain CSS custom properties in `web/src/styles/_tokens.scss` — no runtime dependency on Stitch.

## What was intentionally left out

- Cache/cron/persistence beyond `Cache-Control` + ETag (see "Design decisions").
- A database.
- Authentication, favorites, user profile, live results — no reliable data source and no clear need for the MVP.
- Updating a match's `SUMMARY`/`DESCRIPTION` with the result once it's over — the architecture allows for it (`GOLES_CASA`/`GOLES_FUERA`/`CERRADA` are already available in the DTO), but it isn't implemented.

## Open questions

1. FCF status codes beyond `scheduled` (finished/postponed/suspended/cancelled) — none seen yet in real data.
2. Confirm `isBye` against a real "Descans" (bye) case.
3. Human-readable group name (e.g. "TGN Gr. 14") — the FCF doesn't expose it outside the competition page, which this app doesn't scrape.
4. `404` or `200` with an empty calendar for a team with no matches? It's a product decision, not a technical one; right now it's `200` on purpose (see `calendar.service.ts`).
5. Is the current `max-age` (30–60 min) reasonable? An initial choice made without real request-volume data; it's a named constant in each handler, easy to adjust.
