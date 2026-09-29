# futsal-calendar

Sync a Catalan Futsal Federation (FCF) team's matches to a subscribed calendar (`webcal://`, RFC 5545) in Apple Calendar or any other compatible client. When the FCF changes a match's date, time, venue, or status, the calendar updates itself — no download or re-import required.

Node/TypeScript backend on Vercel serverless functions + Angular 17 frontend to pick a team and get the subscription URL.

**Status: working end to end.** Deployed at `partitsalcalendari.com`, with a real subscription verified on an iPhone. 227 tests, `tsc --strict` with no `any`.

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
├── calendar/[groupId]/[teamId].ts        ICS
├── disciplines.ts
├── competitions.ts
├── competitions/[competicioId]/groups.ts
├── groups/[grupId]/teams.ts
├── groups/[grupId]/context.ts            discipline/competition/group names for a groupId
├── matches/[groupId]/[teamId].ts         JSON (consumed by the frontend)
├── team-page.ts                          bot-only HTML snapshot (see "SEO" below)
└── sitemap.ts                            dynamic /sitemap.xml
src/
├── domain/         team.ts, venue.ts, match-status.ts, match.ts, match-score.ts, competition-catalog.ts
├── shared/         timezone.ts, p-map-limit.ts
├── federation/
│   ├── federation-provider.ts, competition-catalog-provider.ts
│   └── fcf/        fcf.provider.ts, fcf.mapper.ts, fcf-date.ts, fcf-bye.ts, fcf-status.mapper.ts,
│                   fcf-http-client.ts, fcf-catalog-config.ts, fcf-competition-catalog.provider.ts,
│                   fcf-catalog.mapper.ts, fcf-logger.ts, fcf.types.ts, fcf-catalog.types.ts
├── matches/        match-filter.ts, team-matches.service.ts
├── catalog/        group-context.ts (reverse-walks the catalog tree to name a bare groupId)
├── calendar/       ics-generator.ts, ics-config.ts, ics-text.ts, ics-timezone.ts, ics-status.mapper.ts,
│                   calendar.service.ts, match-content-hash.ts
├── seo/            html-escape.ts, team-page-html.ts (bot-facing HTML + SportsEvent JSON-LD)
├── sitemap/        sitemap-xml.ts, sitemap-crawler.ts (walks the FCF catalog for team pages)
└── http/           calendar-route.ts, calendar-http-handler.ts, catalog-route.ts,
                    catalog-http-handler.ts, matches-http-handler.ts, team-page-http-handler.ts,
                    sitemap-http-handler.ts, group-context-http-handler.ts, http-logger.ts
scripts/            run-tests.mjs, smoke-fcf.ts, smoke-ics.ts, dev-server.ts
tests/              same structure as src/, one *.test.ts per module
web/
└── src/
    ├── app/
    │   ├── core/       models/, services/ (incl. seo.service.ts), utils/, seo.config.ts
    │   ├── shared/     app-shell/, selector-step-list/, status-badge/, add-to-calendar-button/
    │   └── features/
    │       ├── team-selector/team-selector.page.{ts,html,scss}
    │       └── team-calendar/team-calendar.page.{ts,html,scss}, next-match-hero/, match-list-item/
    └── styles/_tokens.scss, styles.scss
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
npm test            # 238 tests, node:test via tsx
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

**Score in `SUMMARY`, independent of status**: once the FCF publishes numeric `GOLES_CASA`/`GOLES_FUERA` for both sides, `mapFcfMatch` attaches a `score` to the `Match` and the event's `SUMMARY` becomes `⚽ FINAL · Home X - Y Away`. This is deliberately **not** gated on `status === 'finished'`, even though that status code (`CERRADA=1, ESTADO=1`) is now confirmed: score presence is a direct, observable signal on its own, and stays correct even for any future status combination we haven't seen yet. `match-content-hash.ts` includes the score so a result landing (or being corrected) busts the ETag like any other change.

**Team crests**: `ESCUDO_CASA`/`ESCUDO_FUERA` are bare filenames, not URLs (the original assumption that they were ready-to-use links was wrong — never actually verified against real data). Confirmed 2026-09 by inspecting real `<img>` requests on fcf.cat's own competition pages: every crest resolves at `https://files.fcf.cat/escudos/clubes/escudos/{filename}`. `mapTeam` in `fcf.mapper.ts` builds that full URL; the UI renders it next to the team name and hides the `<img>` on load error (no initials fallback) rather than showing a broken image.

**Visual design**: the UI's look and feel (colors, typography, spacing, layout) was designed with [Google Stitch](https://stitch.withgoogle.com/), Google's AI-assisted UI design tool, starting from this project: https://stitch.withgoogle.com/projects/6523744783108261217. The resulting design tokens were ported by hand into plain CSS custom properties in `web/src/styles/_tokens.scss` — no runtime dependency on Stitch.

**Rebrand (branch `PRE`) — "Senyera Dinàmica" palette, scoped to the existing 2 pages**: a second Stitch design pass (`Senyera Dinàmica`: crimson `#D91424`, federative navy `#121C3B`, senyera gold `#FFC700`) was ported into the same `_tokens.scss` file — new color roles, `Space Grotesk`/`DM Sans` in place of `Hanken Grotesk`/`Inter`, card shadows and a crimson left-edge accent on the next-match hero card, and a gold primary "afegir al calendari" button matching the mockups. A few deliberate departures from the raw Stitch mockups: the mockups' copy ("OFICIAL FCF", "Portal Federat Homologat", "Certificat FCF 2026", "Dades directes de la intranet FCF") was **not** ported — this app has no official relationship with the FCF, only reads its public JSON endpoint, and text implying certification or an official federative product would be misleading; the product name stays **Partits al Calendari** (not the mockups' "CatFutbol") since the domain and all the SEO work already point to that name; and the mockups' extra screens (search bar, notifications, bottom tab navigation, a competitions browser) were not built — this pass is visual only, applied to the two pages that already exist (team selector, team calendar), with no new functionality. A couple of the mockup's auto-generated M3 color tones (`on-surface-variant`, `outline`) came out visibly brownish, which read as an artifact of the token generator rather than an intentional choice, so those two were replaced by hand with a neutral cool gray that fits the rest of the navy/red/gold palette. The header logo (`AppShellComponent`) uses the full lockup from the Stitch "catfutbol_senyera_logo" export — the senyera-striped badge with the ball, plus the "CATFUTBOL" wordmark baked into the same SVG — inlined in the template (it's a dozen small paths, not worth a separate asset file or an extra HTTP request) and recolored to the exact token hex values (`#D91424`/`#FFC700`/`#121C3B`) instead of the mockup's slightly-off `#FFD100`/`#0F2042`, so the logo and the rest of the UI are drawn from the same palette. This is a deliberate, explicitly-requested exception to "the product name stays Partits al Calendari" above: the header now visually reads "CatFutbol" while `<title>`, meta tags, the domain and the rest of the copy still say "Partits al Calendari" — an intentional visual-only choice for the header lockup, not a full rename.

**2-column grid for competition/group/team steps, desktop only, not discipline**: `SelectorStepListComponent` (`web/src/app/shared/selector-step-list/`) takes a `layout: 'list' | 'grid'` input, defaulting to `'list'`. `team-selector.page.html` passes `layout="grid"` for the competition, group and team steps — the ones that can list dozens of items — but leaves the discipline step (always ~7 items) on the default single column, exactly as asked. The grid is mobile-first single-column and only becomes 2 columns from a 768px viewport upward: a first pass tried 2 columns everywhere with a narrow-phone fallback, but on a real phone even the "wide enough" widths still cut most names down to 2-3 words, which read worse than the plain list it replaced — this app's primary audience is a phone subscribing to a calendar, so mobile keeps the original single column and only desktop/tablet gets the grid's shorter-scroll trade-off. The page container itself (`.team-selector`) was capped at `max-width: 640px` regardless of viewport — fine for a single column, but it meant the grid's two columns would still only be ~300px wide on desktop, clipping most competition names hard. A `team-selector--wide` modifier (bound to the same "not discipline" condition, same 768px breakpoint) widens that cap to 960px on desktop/tablet only; mobile stays at 640px, single column, unchanged from before the grid was introduced.

**Senyera stripe on every selector card, matching the next-match hero's accent**: each card in `SelectorStepListComponent` (discipline, competition, group and team alike) keeps the card's own `border-radius: var(--radius-lg)` rounded on all four corners, and gets a 4px senyera-striped left edge — 9 equal **horizontal** bands (5 gold `var(--color-tertiary)`, 4 red `var(--color-primary)`, starting and ending gold) via a hard-edged `linear-gradient(to bottom, ...)` on a `::before`, flush with the card (`top/left/bottom: 0`, `width: 4px`) and given its own matching `border-radius: var(--radius-lg) 0 0 var(--radius-lg)` so it sits inside the card's rounded left corners instead of being cut by them. The width and position deliberately match `next-match-hero.component.scss`'s own `border-left: 4px solid var(--color-primary)` accent — same treatment, just striped instead of solid. This went through several earlier layouts (full-width top strip in both orientations, a wider 10px left strip, a version extended 1px past the card's own box to close a seam, and a brief experiment squaring off the card's left corners entirely to sidestep the rounding question) before settling back here, on explicit request. **Known limitation, inherent to the technique**: a solid single-color `border-left` (as in `next-match-hero`) gets a smooth native taper around a rounded corner, because the browser blends differing border-side widths through the curve — a `::before` overlay with its own independent `border-radius` can only be clipped into its own rounded rectangle, so the corner reads as a clean rounded inset rather than a true taper. Verified in a local Playwright render (4x DPI, cropped to the card) that it reads as rounded, not cut — just not pixel-identical to the hero's native corner.

**Every upcoming match gets the same hero-style card, no separate "next match" section**: `TeamCalendarPage` used to render the single next match with `NextMatchHeroComponent` (a larger, distinct card) and every match after it with the plain, borderless `MatchListItemComponent`, in two separate sections ("Pròxim partit" / "Pròxims partits"). This is now one "Pròxims partits" section that renders every entry in `upcomingMatches()` with `NextMatchHeroComponent` — so instead of one highlighted card followed by a plain list, all upcoming matches look like equally-weighted cards (border, `border-left` accent, shadow, rounded corners), stacked with `--space-md` gaps via the new `team-calendar__list--cards` modifier. `MatchListItemComponent` stays as-is for "Partits jugats" (past results weren't part of this request) — the two components now diverge in role: `NextMatchHeroComponent` for anything upcoming, `MatchListItemComponent` for history. The `nextMatch` computed signal stays for the `SportsEvent` JSON-LD (a separate SEO concern); the `laterMatches` computed was removed as dead code once the template stopped needing the split.

**CASA/FORA badge instead of "Programat" on upcoming match cards**: `NextMatchHeroComponent` used to always show `app-status-badge` next to the round number, which for any upcoming match just says "Programat" — true but not useful once every card shows a scheduled match. It now shows that generic status badge only when the status is genuinely informative (`postponed`, `cancelled`, `finished`, `unknown`); for `scheduled` matches it instead shows whether `CFS LA SÉNIA` is playing at home or away, reusing `isHome()` (already computed for team-name bolding). Colors reuse existing brand tokens rather than adding new ones: `CASA` is `var(--color-tertiary)`/`var(--color-on-tertiary)` (the brand gold), `FORA` is `var(--color-secondary-container)`/`var(--color-secondary)` (the existing light-blue/navy pair already used elsewhere) — no new tokens needed.

**"Finalitzat" badge recoloured green**: `--color-status-finished-bg`/`--color-status-finished-text` were `#e8ebf2`/`#121c3b` (a neutral grey-navy, indistinguishable in intent from "Programat"'s blue). Changed to `#dcf2e4`/`#0e8a44` — the text color is the existing `--color-pitch-green` value already in the palette (reused, not a new token), matching the light-tint-background/saturated-text pattern the other three status colors already follow.

**Logo centered in the header on mobile, left-aligned on desktop**: `app-shell.component.scss`'s `&__header` is `display:flex` with just the brand link inside; it defaults to `justify-content: center` (mobile-first, matching the same 768px breakpoint used for the selector grid and the wide team-selector container) and switches to `justify-content: flex-start` at `@media (min-width: 768px)`.

**Crest, group, discipline and competition on the team page — a new reverse-lookup endpoint, cached**: the team page (`/equip/:groupId/:teamId`) only ever knew `groupId`/`teamId`; showing "which group/category/competition is this" needed names the FCF's catalog only exposes top-down (discipline -> competitions -> groups -> teams — see `CompetitionCatalogProvider`), with no endpoint to go the other way. `src/catalog/group-context.ts` walks that same tree the sitemap crawler already walks (`SITEMAP_DISCIPLINA_IDS`, `crawlTeamPageUrls`'s sibling) and builds a `Map<groupId, {discipline, competition, group}>`; `GET /api/groups/{grupId}/context` (`src/http/group-context-http-handler.ts`) serves from that map, building it at most once per hour (module-level cache, same shape as the sitemap's, including in-flight de-duping and "serve the last known-good index if a rebuild fails" — see `src/http/sitemap-http-handler.ts`). The Angular page (`TeamCalendarPage`) fetches it alongside the matches and treats it as purely decorative: a 404 (a group outside `SITEMAP_DISCIPLINA_IDS`) or any other failure just means the breadcrumb line under the team name doesn't render, never a page-level error — the matches are the content that matters. **Caught locally**: this same silent-failure design meant a real bug — `scripts/dev-server.ts` routes requests by hand (unlike Vercel's file-based `api/` routing) and its route table hadn't been taught the new `/api/groups/{grupId}/context` path, so every local request 404'd and the breadcrumb never appeared, with nothing in the UI to say why. Fixed by adding the missing route alongside the existing `.../teams` one. The breadcrumb reads discipline · competition · group — the same top-down order the FCF catalog itself uses (and the order the team-selector wizard walks it in), not the group-first order it briefly shipped with. The crest above the name reuses `TeamRef.crest`, already present on any match; no new data source needed for that part.

**Played matches are cards too, deliberately plainer than the upcoming-match cards**: `MatchListItemComponent` was a borderless row separated by `border-bottom` (a classic list). It's now a card — `background`, `border`, `border-radius: var(--radius-lg)` — so "Partits jugats" reads consistently with "Pròxims partits" (both cards, stacked with the same `team-calendar__list--cards` gap modifier) rather than one section of cards and one section of plain rows. The two card styles are deliberately NOT identical: `NextMatchHeroComponent` keeps `--color-surface` (white), the `border-left` accent, `box-shadow` and an internal divider under the meta row; the past-match card uses `--color-surface-container-low` (a light lavender tint already in the palette) with no accent border, no shadow, no internal divider — flatter and quieter, since these matches are settled history, not something to act on. No new tokens needed.

**SEO — dynamic `Title`/`Meta`/canonical/JSON-LD, no static route titles**: `SeoService` (`web/src/app/core/services/seo.service.ts`) updates `<title>`, description, Open Graph/Twitter tags, the canonical `<link>`, and a `SportsEvent` JSON-LD block from each page's own component, once real data (team name, next match) is available. Angular Router's static `title:` route property was tried first and removed: it fired on every route identically and overwrote the good default title from `index.html` with a generic one, for every team page alike — actively worse than doing nothing.

**SEO for bots — dynamic rendering via a Vercel header-matched rewrite, not full SSR**: the Angular app is CSR-only (no Angular Universal), so anything `SeoService` sets is invisible to bots that don't execute JS (link-preview scrapers for WhatsApp, X, LinkedIn, Slack, iMessage — Googlebot itself does execute JS and doesn't need this). Rather than migrating to Angular SSR, `vercel.json` rewrites `/equip/:groupId/:teamId` to `api/team-page.ts` **only** when the request's `user-agent` header matches a known bot pattern (Vercel's `has` rewrite condition); everyone else still gets the normal SPA. `team-page-http-handler.ts` renders a small, real HTML page (title, description, canonical, OG/Twitter tags, the same `SportsEvent` JSON-LD, an `<h1>`, and the team's upcoming matches) from the same `FederationProvider`/`CompetitionCatalogProvider` the rest of the backend already uses. This is Google's documented "dynamic rendering" pattern, not cloaking, because the bot-served content matches what a user would see once the SPA finishes loading — it's a much smaller change than an SSR migration and can be replaced by one later without touching the rest of the app.

**Sitemap scoped to 2 of 7 FCF disciplines, crawled and cached, not persisted**: `sitemap-crawler.ts` walks the FCF's own discipline → competition → group → team catalog to list every team page. Measured live against production before building it: all 7 disciplines together are ~460+ groups just for temporada 22's futsal disciplines alone, and other disciplines (Futbol 11, Futbol 7, Futbol 5, Futbol Platja) push that much higher. `SITEMAP_DISCIPLINA_IDS` deliberately limits the crawl to Futbol Sala and Futbol Sala Femení — the disciplines this app is actually built for — with bounded concurrency (`pMapLimit`, 6 at a time) and best-effort skip-on-error per branch (one bad competition or group is logged and skipped, matching `FcfFederationProvider`'s existing philosophy of not letting one bad branch abort the whole request), **except** when every configured discipline fails at the top level (e.g. the FCF is fully down): that specific case throws instead of silently returning an empty page list, precisely so the cache below sees it as a failed crawl and keeps serving the last known-good sitemap instead of overwriting it with an empty one. The result is cached in memory for 12h (`sitemap-http-handler.ts`), with the last successful crawl kept and served if a later crawl fails, and a bare homepage-only fallback if there's never been a successful crawl at all. Trade-off accepted deliberately: a Vercel cold start resets this cache (no persistence, matching the project's "no DB for now" stance elsewhere), so the first request after a cold start pays the full crawl cost — mitigated by the generous `maxDuration: 60` on that function and the 6h HTTP `Cache-Control` telling well-behaved crawlers not to hit it too often either.

## What was intentionally left out

- Cache/cron/persistence beyond `Cache-Control` + ETag (see "Design decisions").
- A database.
- Authentication, favorites, user profile, live (in-progress) results — no reliable data source and no clear need for the MVP.
- A full Angular SSR/Universal migration — the bot-only dynamic-rendering rewrite (see "Design decisions") covers the actual need (link previews, non-JS crawlers) at a fraction of the complexity; SSR remains an option later if a real reason shows up (e.g. Core Web Vitals on first paint).
- Sitemap coverage for the other 5 FCF disciplines (Futbol 11/7/5, Futbol Platja) — this app targets futsal; adding them is a one-line change to `SITEMAP_DISCIPLINA_IDS` if the app ever expands.

## Open questions

1. FCF status codes beyond `scheduled`/`finished` — `CERRADA=1, ESTADO=1` is now confirmed as `finished` against real data (grup 60090763, 2026-09-26/27, 6/6 played matches, each with a real score); `postponed`/`suspended`/`cancelled` are still unconfirmed.
2. Confirm `isBye` against a real "Descans" (bye) case.
3. Human-readable group name (e.g. "TGN Gr. 14") — the FCF doesn't expose it outside the competition page, which this app doesn't scrape.
4. `404` or `200` with an empty calendar for a team with no matches? It's a product decision, not a technical one; right now it's `200` on purpose (see `calendar.service.ts`).
5. Is the current `max-age` (30–60 min) reasonable? An initial choice made without real request-volume data; it's a named constant in each handler, easy to adjust.
6. The bot User-Agent pattern in `vercel.json`'s dynamic-rendering rewrite covers the well-known crawlers (WhatsApp, Twitter/X, LinkedIn, Slack, Facebook, iMessage, Googlebot, Bingbot); it should be revisited once real traffic shows which other bots actually request team pages.
7. `og-image.png` still reflects the pre-rebrand look. `favicon.ico`, `favicon-16.png`, `favicon-32.png` and `apple-touch-icon.png` were regenerated from `web/src/assets/favicon/icon.svg` (the same badge as the header logo, minus the wordmark) with ImageMagick's `convert`; the apple touch icon renders from a square (non-rounded) variant of that SVG since iOS applies its own corner mask and a pre-rounded source would show transparent corner artifacts underneath it. `og-image.png` (1200×630, used for link previews) needs actual layout work, not just a resize, so it's left for when that's explicitly asked for.
