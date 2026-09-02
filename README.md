# futsal-calendar

Sincroniza los partidos de un equipo de fútbol sala de la Federació Catalana de Futbol (FCF) con un calendario suscrito (`webcal://`, RFC 5545) en Apple Calendar u otro cliente compatible. Cuando la FCF cambia la fecha, hora, pabellón o estado de un partido, el calendario se actualiza solo — sin que el usuario tenga que descargar ni reimportar nada.

Backend Node/TypeScript en funciones serverless de Vercel + frontend Angular 17 para elegir equipo y obtener la URL de suscripción.

**Estado: funcional de extremo a extremo.** Desplegado en `partitsalcalendari.com`, con una suscripción real verificada en un iPhone. 171 tests, `tsc --strict` sin `any`.

## Cómo funciona

1. El usuario elige disciplina → competició → grup → equip en el wizard de `/`.
2. Eso lleva a `/equip/{groupId}/{teamId}`, con el calendario del equipo y un botón "Afegir al calendari" (`webcal://.../api/calendar/{groupId}/{teamId}.ics`).
3. Apple Calendar (u otro cliente) se suscribe a esa URL. Cada vez que la vuelve a consultar, recibe el `.ics` generado en el momento a partir de los datos actuales de la FCF — no hay caché ni base de datos de por medio.
4. El `UID` de cada evento es estable (`fcf-{CODACTA}@partitsalcalendari.com`), así que un cambio de fecha/hora/pabellón actualiza el evento existente en vez de crear uno duplicado.

No hay forma de forzar a un cliente de calendario a refrescar al instante — la app nunca promete sincronización instantánea, solo automática.

## Arquitectura

```
domain/                  Match, TeamRef, Venue, MatchStatus, catálogo — sin saber que existe la FCF
federation/fcf/*          único lugar que conoce fcf.cat: providers, parseo de fechas, mappers
matches/                  filtrado por equipo (nunca por nombre — dos clubes pueden compartir nombre)
calendar/                 generación ICS (RFC 5545) + orquestación + ETag de contenido
http/                     handlers HTTP framework-agnostic (request/response como objetos planos)
api/                      adaptadores Vercel, finos — delegan todo a http/
scripts/dev-server.ts     adaptador node:http local, mismo handler que Vercel
web/                      frontend Angular 17 (wizard de selección + calendario de equipo)
```

Principio general: la FCF queda completamente aislada detrás de `FederationProvider`/`CompetitionCatalogProvider` (puerto) y sus implementaciones `Fcf*` (adaptador). El resto de la app solo conoce el modelo de dominio propio.

### Estructura de carpetas

```
api/
  calendar/[groupId]/[teamId].ts        ICS
  disciplines.ts
  competitions.ts
  competitions/[competicioId]/groups.ts
  groups/[grupId]/teams.ts
  matches/[groupId]/[teamId].ts         JSON (consumido por el frontend)
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
tests/              misma estructura que src/, un *.test.ts por módulo
web/
  src/app/
    core/           models/, services/, utils/
    shared/         app-shell/, selector-step-list/, status-badge/, add-to-calendar-button/
    features/
      team-selector/team-selector.page.{ts,html,scss}
      team-calendar/team-calendar.page.{ts,html,scss}, next-match-hero/, match-list-item/
  src/styles/_tokens.scss, src/styles.scss
```

## Cómo ejecutar en local

Backend y frontend son dos procesos separados (el frontend llama a `/api/*` por HTTP).

```bash
# Terminal 1 — backend, puerto 3000
npm install
npm run dev

# Terminal 2 — frontend, puerto 4200 (con proxy de /api hacia el 3000)
cd web
npm install
npm start
```

Abre `http://localhost:4200/`. El proxy (`web/proxy.conf.json`, referenciado desde `angular.json`) solo hace falta en local — en Vercel, el frontend y las funciones de `api/` conviven bajo el mismo dominio, así que `/api/*` funciona sin proxy.

Para probar solo el backend:

```bash
curl -i http://localhost:3000/api/calendar/{groupId}/{teamId}.ics
curl -i http://localhost:3000/api/disciplines
```

## Variables de entorno

Ninguna es obligatoria — la app funciona con sus valores por defecto. Configúralas en Vercel (Project Settings → Environment Variables) si hace falta ajustarlas sin desplegar código nuevo:

| Variable | Efecto | Por defecto |
|---|---|---|
| `FCF_USER_AGENT_CONTACT` | Añade un contacto (email) a la cabecera `User-Agent` que la app envía a la FCF en cada request. | ninguno |
| `FCF_DEFAULT_TEMPORADA_ID` | `temporada` id que usa `/api/competitions` cuando el cliente no especifica uno. La FCF no expone una "temporada actual" estable, así que este valor necesita revisarse una vez al año, cuando la FCF abre la temporada siguiente (confirmar contra `/api/competition/temporadas` antes de cambiarlo). | `22` |

`DEFAULT_UID_DOMAIN` (dominio usado en el `UID` de cada evento ICS) **no** es configurable por entorno a propósito: cambiarlo generaría UIDs distintos para partidos ya existentes, lo que Apple Calendar (y cualquier cliente RFC 5545) interpretaría como eventos nuevos duplicados en vez de actualizaciones. Está fijado en código (`src/calendar/ics-config.ts`) al dominio real de despliegue.

## Testing

```bash
npm run typecheck   # tsc --noEmit, TypeScript strict, sin any
npm test            # 171 tests, node:test vía tsx
npm run smoke:fcf    # llamada real a la FCF — imprime partidos de un grupo real
npm run smoke:ics    # genera un .ics real de un equipo y lo escribe en disco
```

`scripts/run-tests.mjs` descubre los `*.test.ts` con `fs.readdirSync` (no `find`/shell globbing) y lanza `node --import tsx --test` sin `shell: true`, para funcionar igual en Windows que en Linux/macOS.

## Despliegue (Vercel)

`vercel.json`:

```json
{
  "buildCommand": "cd web && npm install && npm run build",
  "outputDirectory": "web/dist/web/browser",
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

`outputDirectory` apunta a `browser/` porque el builder `application` de Angular 17 siempre escribe ahí, incluso sin SSR. El rewrite es un fallback de SPA estándar: Vercel sirve primero cualquier archivo estático o función de `api/` que exista, y solo si no hay coincidencia cae a `index.html`.

El script de backend que hace `tsc --noEmit` se llama `typecheck`, no `build` — Vercel ejecuta automáticamente `npm run build` si existe ese script (incluso sin configurarlo en el dashboard), y con `NODE_ENV=production` no instala `devDependencies`, así que `tsc` no estaría ni disponible. Las funciones de `api/` las compila el propio runtime Node de Vercel al vuelo a partir del `.ts`.

## Decisiones de diseño

**Zona horaria**: la FCF devuelve fechas como `"2026-09-26 18:30:00"`, hora local de Europe/Madrid, sin offset. Nunca se parsean con `new Date(string)` (ambiguo/dependiente del runtime); `shared/timezone.ts` usa `Intl.DateTimeFormat` para resolver el offset real (CET/CEST) en el instante concreto y convertir de forma explícita entre wall-time y UTC.

**UID estable**: `fcf-{CODACTA}@partitsalcalendari.com`. `CODACTA` es el identificador de partido de la propia FCF y no cambia aunque cambien fecha/hora/pabellón/estado — es lo que permite que una actualización sea una actualización real y no un evento duplicado.

**Sin librería ICS externa**: el subconjunto de RFC 5545 usado es pequeño y estable, y las dos partes delicadas (folding a nivel de octeto UTF-8, escaping de `TEXT`) están aisladas en `ics-text.ts` con tests de casos límite. Cambiar a una librería como `ical-generator` es mecánico si hace falta más adelante.

**`SEQUENCE` fijo en `0`, `DTSTAMP`/`LAST-MODIFIED` siempre "ahora"**: calcular un `SEQUENCE` real exigiría persistir el último snapshot conocido de cada partido para poder diffear. Sin esa persistencia, cualquier otro valor sería inventado. El impacto práctico es bajo: `SEQUENCE` importa sobre todo en flujos de invitación iTIP (organizador/asistentes); este es un calendario **suscrito** de solo lectura (`METHOD:PUBLISH`), y los clientes de calendario reemplazan el evento por `UID` en cada refresco, sin diffear contra `SEQUENCE` — comportamiento ya confirmado con una suscripción real en iPhone.

**ETag de contenido, no de texto ICS**: como `DTSTAMP`/`LAST-MODIFIED` cambian en cada generación, un ETag sobre el texto ICS completo cambiaría siempre, inutilizando la caché. `match-content-hash.ts` calcula un SHA-256 solo sobre los campos que le importan a un suscriptor (equipos, horario, pabellón, estado, nombre del calendario) — estable mientras esos datos no cambien, permitiendo `304` real.

**Cache-Control de 30-60 minutos, sin promesa de sincronización instantánea**: acota cuánto reutiliza la respuesta un cliente HTTP-compliant, pero no controla cuándo Apple Calendar (u otro cliente `webcal://`) vuelve a consultar la URL — eso lo decide el cliente, no el servidor.

**Sin cron ni persistencia (por ahora)**: la generación en vivo en cada request (con `Cache-Control` + ETag) ya resuelve propagación inmediata de cambios y reutilización de caché por clientes HTTP-compliant. Lo único que no da son `SEQUENCE`/`LAST-MODIFIED` reales (ver arriba). Introducir cron + persistencia tendría sentido si aparecen señales reales: caídas de la FCF observadas en producción, más suscriptores de los que un request en vivo pueda sostener, o necesidad genuina de `SEQUENCE` correcto (por ejemplo, si el proyecto migrara a un flujo con invitaciones). Si hiciera falta, lo único que habría que persistir es "el último snapshot de partidos conocido por grupo" — un almacén clave-valor simple (p. ej. Vercel KV) es suficiente, no una base de datos relacional.

**Filtrado siempre por id de equipo, nunca por nombre**: dos clubes distintos del mismo grupo pueden compartir texto en el nombre (visto en datos reales), así que todo el filtrado usa `CODEQUIPO_CASA`/`CODEQUIPO_FUERA`.

**Estados FCF**: solo se mapea lo confirmado contra datos reales (`scheduled`); cualquier otro código es `'unknown'` explícito en vez de una traducción adivinada.

**Selector en cascada en vez de búsqueda libre**: la búsqueda por nombre de club de la FCF (`/api/clubs/search`) está rota para Futbol Sala (no devuelve equipos), confirmado contra la API real. El wizard usa en su lugar el propio catálogo en cascada de la FCF (disciplina → competició → grup → equip), verificado end-to-end y con el mismo esquema para todas las disciplines.

**Handlers HTTP framework-agnostic**: `handle*Request()` recibe y devuelve objetos planos (`{method, url, ...}` → `{status, headers, body}`), sin tipos de Vercel ni de `node:http`. Los adaptadores de `api/` y `scripts/dev-server.ts` son una traducción de ~20 líneas cada uno hacia su runtime concreto, lo que permite testear los handlers sin mockear ninguno de los dos.

## Lo que no se ha hecho a propósito

- Cache/cron/persistencia más allá de `Cache-Control` + ETag (ver "Decisiones de diseño").
- Base de datos.
- Autenticación, favoritos, perfil de usuario, resultados en vivo — sin fuente de datos fiable ni necesidad clara para el MVP.
- Actualizar el `SUMMARY`/`DESCRIPTION` de un partido con el resultado tras acabar — la arquitectura lo permite (`GOLES_CASA`/`GOLES_FUERA`/`CERRADA` ya están disponibles en el DTO), pero no está implementado.

## Preguntas abiertas

1. Códigos de estado FCF más allá de `scheduled` (acabado/aplazado/suspendido/cancelado) — sin haber visto ninguno todavía en datos reales.
2. Confirmar `isBye` contra un caso real de "Descans".
3. Nombre legible del grupo (p. ej. "TGN Gr. 14") — la FCF no lo expone fuera de la página de competición, que esta app no scrapea.
4. ¿`404` o `200` con calendario vacío para un equipo sin partidos? Es una decisión de producto, no técnica; ahora mismo es `200` a propósito (ver `calendar.service.ts`).
5. ¿Es razonable el `max-age` actual (30-60 min)? Elección inicial sin datos reales de volumen de peticiones; es una constante nombrada en cada handler, fácil de ajustar.
