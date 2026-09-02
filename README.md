# futsal-calendar — Milestones 1-4

Sincronización de partidos de fútbol sala de la FCF con calendarios suscritos (Apple Calendar / iCalendar RFC 5545).

Estado: **Milestones 1 (FCF API → provider → mapper → `Match[]`), 2 (generador ICS), 3 (endpoint HTTP) y 4 (despliegue real en Vercel + suscripción `webcal://` confirmada en iPhone) completas.** Todavía NO hay cache/persistencia más allá del ETag actual (Milestone 5), ni Angular (Milestone 6).

## 0. Validado

- `npm run smoke:fcf` (Milestone 1): confirmado en Windows contra el grupo real 58162580 — 156 partidos, 24 para CFS LA SÉNIA y 24 para AES LA SÉNIA-STOCKPLUS, sin solapamiento. Todos los partidos vistos hasta ahora están `scheduled`; sigue pendiente observar un estado distinto para completar `mapFcfStatus`.
- `npm run smoke:ics` (Milestone 2): genera el `.ics` real de un equipo y lo escribe en disco (`tmp-{teamId}.ics`). **Confirmado visualmente en un iPhone real** (Mail/Files Quick Look): fechas, horas y pabellones correctos, agrupados por día. Ver sección 5 sobre lo que aún no está resuelto (importarlo *dentro* de la app Calendar).
- `npm run dev` (Milestone 3, nuevo): servidor HTTP local que monta el handler real. Verificado en este sandbox: `GET` válido → `200` con ICS + cabeceras correctas; `POST` → `405` con `Allow`; ruta mal formada → `400`; fallo de la FCF → `502` con `Cache-Control: no-store` (comprobado de verdad: este sandbox tampoco tiene acceso de red a `fcf.cat`, así que el propio error 403 de red se propaga correctamente como `502` — el camino de error está probado con un fallo real, no solo simulado).
- `npm test` verificado en Windows (PowerShell/cmd) con una ruta de proyecto con espacio + guion (`OneDrive - Empresa\...`).
- **Despliegue real en Vercel (Milestone 4, completo)**: proyecto conectado a GitHub, dominio propio `partitsalcalendari.com` (comprado directamente en Vercel, así que sin configuración DNS manual — nameservers ya apuntaban a Vercel). Primer intento de deploy falló por invocar `npm run build` automáticamente sin `typescript` instalado (ver "Por qué el script se llama `typecheck` y no `build`" más abajo); corregido renombrando el script.
- `GET https://partitsalcalendari.com/api/calendar/58162580/54755993.ics` verificado end-to-end contra la FCF real: 26 partidos de CFS LA SÉNIA, septiembre 2026 - mayo 2027, horarios/pabellón/`STATUS:CONFIRMED` correctos.
- **`webcal://partitsalcalendari.com/api/calendar/58162580/54755993.ics` suscrito con éxito en un iPhone real** vía Safari — iOS reconoció el esquema `webcal://` y ofreció el diálogo nativo "Añadir suscripción de calendario". Esto es lo que Milestone 2 dejaba sin resolver (un `.ics` suelto por Mail no deja claro cómo *suscribirse*, solo importar una vez); con `webcal://` y una URL pública sí queda enlazado como suscripción real. Milestone 4 completa.

## 1. Arquitectura

```
domain/            Match, TeamRef, Venue, MatchStatus — sin dependencias, sin saber que existe la FCF
shared/timezone.ts  primitivas Intl.DateTimeFormat (offset de zona, ida y vuelta wall-time <-> instante)
                          ▲                                    ▲
                          │                                    │
federation/fcf/*    parseFcfDate usa shared/timezone   calendar/ics-timezone.ts usa shared/timezone
  (Milestone 1)            │                                    │  (Milestone 2)
                          ▼                                    ▼
              Match[] ──────────► matches/match-filter.ts ──► calendar/ics-generator.ts ──► texto ICS
                                                                        │
                                                                        ▼
                                                        calendar/calendar.service.ts  (Milestone 3)
                                                        orquesta: provider → filtro → generateIcs → ETag
                                                                        │
                                                                        ▼
                                              http/calendar-http-handler.ts  (framework-agnostic)
                                                        │                              │
                                                        ▼                              ▼
                                    api/calendar/[groupId]/[teamId].ts        scripts/dev-server.ts
                                    (adaptador Vercel, fino)                   (adaptador node:http local, fino)
```

## 2. Milestone 1 — FCF → dominio (resumen)

- `FcfFederationProvider` (`federation/fcf/fcf.provider.ts`): único punto que conoce `fcf.cat`, con timeout, reintentos con backoff+jitter en errores 5xx/red, User-Agent identificable y logging inyectable (`FcfLogger`).
- `mapFcfMatch` + `parseFcfDate`: DTO FCF → `Match` de dominio. Fechas parseadas de forma explícita como hora local **Europe/Madrid** (nunca `new Date(string)` directo) vía `shared/timezone.ts`, que usa `Intl.DateTimeFormat` para resolver el offset real (CET/CEST) en el instante concreto.
- `isBye` + `filterTeamMatches`: descansos excluidos por defecto; filtrado **siempre** por `CODEQUIPO_*`, nunca por nombre (dos equipos distintos comparten "La Sénia" en el mismo grupo).
- `mapFcfStatus`: solo mapea lo confirmado (`0`/`0` → `scheduled`); todo lo demás es `'unknown'` explícito, nunca inventado.

## 3. Milestone 2 — Generador ICS (resumen)

- `generateIcs(matches, options)` en `calendar/ics-generator.ts`: función pura, sin red ni conocimiento de la FCF. Genera `VCALENDAR` con `VTIMEZONE` estático de Europe/Madrid embebido, `UID:fcf-{CODACTA}@{uidDomain}` estable, `DTSTART/DTEND;TZID=Europe/Madrid`, `SUMMARY`/`LOCATION` escapados, `GEO` condicional, `STATUS` mapeado desde `MatchStatus`.
- Sin librería ICS externa (sigue sin haber acceso a `registry.npmjs.org` en este sandbox) — decisión documentada con criterio: el subconjunto de RFC 5545 usado es pequeño y estático, y las dos partes realmente delicadas (**folding a nivel de octeto UTF-8** y **escaping de TEXT**) están aisladas en `ics-text.ts` con tests de casos límite. Cambiar a `ical-generator` es mecánico si algún día hace falta.
- **SEQUENCE fijo en `0`, DTSTAMP/LAST-MODIFIED siempre "ahora"** — análisis completo y trade-off de una futura Fase 2 con Supabase/Postgres documentados directamente en `ics-generator.ts`. Sigue siendo válido en Milestone 3 (ver sección 4.3 más abajo sobre por qué el ETag no depende de estos valores).

## 4. Milestone 3 — Endpoint HTTP

### 4.1 Estructura nueva

```
src/calendar/
  calendar.service.ts        buildTeamCalendar(): provider.getMatches -> filterTeamMatches -> generateIcs -> ETag
  match-content-hash.ts       computeMatchesContentHash(): hash SHA-256 de los campos relevantes (sin DTSTAMP/LAST-MODIFIED)
src/http/
  calendar-route.ts           parseCalendarRoute(url): {groupId, teamId} — sin depender de Vercel
  calendar-http-handler.ts    handleCalendarRequest(): request plano -> response plano (status/headers/body)
  http-logger.ts               puerto de logging mínimo, igual patrón que fcf-logger.ts
api/calendar/[groupId]/[teamId].ts   adaptador Vercel (fino: 25 líneas, delega todo a calendar-http-handler)
scripts/dev-server.ts          adaptador node:http local (mismo handler, sin cuenta Vercel)
```

### 4.2 Decisión: `calendar.service.ts` no decide semántica HTTP

`buildTeamCalendar(provider, {groupId, teamId})` orquesta el pipeline completo pero **nunca lanza** por "0 partidos" — un equipo sin partidos en ese grupo (id equivocado, o un equipo genuinamente sin fixtures) produce un `VCALENDAR` vacío pero válido, y devuelve `matchCount: 0` para que la capa HTTP decida si eso es un `200` (lo que hace ahora mismo) o debería ser un `404` más adelante. Mantener esa decisión fuera de `calendar.service.ts` es lo que permite reutilizarlo tal cual desde un futuro cron (Milestone 5) sin arrastrar semántica HTTP.

`calendarName` (para `X-WR-CALNAME`) se resuelve del propio nombre del equipo dentro de sus partidos (la FCF no expone un endpoint de "nombre de equipo" independiente) — con fallback `"FCF {teamId}"` cuando no hay partidos de los que leerlo.

### 4.3 ETag: hash de contenido, no de texto ICS

El reto: `generateIcs` mete `DTSTAMP`/`LAST-MODIFIED` = "ahora" en cada evento (ver Milestone 2), así que un ETag calculado sobre el texto ICS completo cambiaría en **cada** petición aunque los datos de los partidos no hayan cambiado — inutilizando el propio ETag (nunca podríamos responder `304`).

Solución (`match-content-hash.ts`): SHA-256 sobre los campos que de verdad le importan a quien está suscrito — id, ronda, equipos, `startsAt.toISOString()`, pabellón, coordenadas, estado — más el `calendarName`, explícitamente **sin** tocar nada derivado de "ahora". Resultado ya entrecomillado según RFC 7232 (`"abc123..."`), listo para comparar contra `If-None-Match` sin transformación.

### 4.4 Handler: framework-agnostic a propósito

`handleCalendarRequest(provider, request, logger?)` en `calendar-http-handler.ts` recibe `{method, url, ifNoneMatch}` (objetos planos) y devuelve `{status, headers, body}` (otro objeto plano) — nunca toca `req`/`res` de Node ni tipos de Vercel. Motivo: tanto el adaptador Vercel real (`api/calendar/[groupId]/[teamId].ts`) como el servidor de pruebas local (`scripts/dev-server.ts`, Milestone 3 nuevo) son adaptadores de ~20 líneas que solo traducen `{status, headers, body}` a `res.writeHead(status, headers); res.end(body)` — funciona igual en los dos porque el runtime Node de Vercel *es*, en el fondo, `http.ServerResponse`. Esto también es lo que permite testear el handler con objetos planos, sin mockear ni Vercel ni `node:http`.

Deliberadamente **no se depende de `@vercel/node`** como paquete (mismo motivo que en Milestones 1-2: no hay forma de verificar una dependencia que no se puede instalar en este sandbox) — el handler Vercel está tipado contra `IncomingMessage`/`ServerResponse` de `node:http`, que es exactamente lo que Vercel expone en su runtime Node.js.

Comportamiento cubierto:

- `GET`/`HEAD` válidos → `200` (`HEAD` sin cuerpo) con `Content-Type: text/calendar; charset=utf-8`, `Content-Disposition: inline`, `ETag`, `Cache-Control`, `Last-Modified`.
- Cualquier otro método → `405` + `Allow: GET, HEAD`.
- Ruta que no encaja con `/api/calendar/{groupId}/{teamId}.ics` → `400`, sin llegar a llamar al provider.
- `If-None-Match` igual al ETag actual → `304`, cuerpo vacío.
- Fallo del provider (FCF caída, timeout, JSON inválido, lo que sea) → `502`, `Cache-Control: no-store` explícito para que un fallo puntual de la FCF no quede "congelado" en la caché de un cliente.
- Equipo sin partidos → `200` con calendario vacío válido (ver 4.2).

### 4.5 Cache-Control: 30 minutos, con una advertencia honesta

`Cache-Control: public, max-age=1800, must-revalidate` — acota cuánto puede reusar la respuesta un cliente que sí respeta HTTP cache (navegador, `curl`, un proxy intermedio) sin volver a preguntar. **Esto no es una promesa de que Apple Calendar vaya a refrescar cada 30 minutos** — no controlamos cuándo un `webcal://` se vuelve a consultar (iOS en particular puede tardar mucho más, y no es configurable por nosotros). El mensaje correcto de cara al usuario sigue siendo el del brief: "el calendario se mantiene sincronizado automáticamente con la Federación", nunca "sincronización instantánea".

### 4.6 Parser de ruta independiente de Vercel

`parseCalendarRoute(url)` en `calendar-route.ts` recibe el `url` crudo de la petición (con o sin query string) y extrae `{groupId, teamId}` a mano, **sin usar `req.query`** de Vercel. Dos motivos: (a) el propio `[teamId].ts` de Vercel captura el segmento completo (`"54755993.ics"`, con extensión) así que habría que despojar el sufijo igualmente; (b) parsear directamente de la URL hace que el comportamiento sea idéntico venga la petición de Vercel o del servidor de pruebas local, que no tiene inyección de parámetros de ruta de ningún tipo.

## 5. Cómo ejecutar

```bash
npm install
npm run typecheck   # tsc --noEmit — TypeScript strict, sin `any`
npm test            # 126 tests, node:test vía tsx (cross-platform)
npm run smoke:fcf    # llamada real a la FCF (Milestone 1)
npm run smoke:ics    # genera un .ics real de un equipo real (Milestone 2)
npm run dev          # servidor local en :3000 con el endpoint real (Milestone 3, nuevo)
```

Con `npm run dev` en marcha:

```bash
curl -i http://localhost:3000/api/calendar/58162580/54755993.ics
```

Esto **no** sustituye la prueba real de Milestone 4 (una URL pública que un iPhone real pueda suscribir) — es para verificar cabeceras, cache y manejo de errores sin necesitar cuenta de Vercel.

### Por qué `npm test` funciona igual en Windows (nota permanente)

`scripts/run-tests.mjs` descubre los `*.test.ts` con `fs.readdirSync` de Node (nada de `find`/`sort` de shell) y lanza `node --import tsx --test <archivos>` **sin `shell: true`**. La primera versión sí usaba `shell: true`, y eso rompía en Windows con rutas tipo `OneDrive - Empresa\...` (espacio + guion) porque `cmd.exe` reparsea la línea de comandos completa.

### Nota sobre cómo se ha verificado este código en tu equipo

A partir de esta milestone trabajo directamente sobre tu carpeta (`futsal-calendar-milestone2`) en lugar de mandarte un `.zip` cada vez — ya no hace falta descomprimir nada. Una limitación que he detectado al probarlo: el acceso a tu equipo ejecuta comandos dentro de una máquina Linux aislada del propio entorno de Cowork, que **no** es tu terminal Windows real — puede leer y editar archivos de texto en tu carpeta sin problema, pero no puede ejecutar `npm test`/`npm run typecheck` ahí, porque tu `node_modules` tiene binarios nativos compilados para Windows (`esbuild`) que esa máquina Linux no puede correr. Por eso sigo verificando todo (build + 126 tests + smoke real del servidor) en mi propio sandbox antes de escribir nada en tu carpeta, y te sigo pidiendo que confirmes `npm test`/`npm run typecheck` en tu terminal real como última verificación — exactamente igual que en las Milestones 1 y 2, solo que ahora sin el paso del `.zip`.

### Por qué el script se llama `typecheck` y no `build` (Milestone 4)

Hasta la Milestone 3 este script se llamaba `build`. Al desplegar en Vercel, eso causó un fallo real: Vercel, con "Framework Preset: Other", ejecuta automáticamente `npm run build` si existe ese script en `package.json` — **incluso sin haberlo configurado explícitamente** en el dashboard, es su comportamiento por defecto. Además, la instalación de dependencias en Vercel usa `NODE_ENV=production`, que **omite `devDependencies`** (`typescript`, `tsx`, `@types/node` en nuestro caso), así que `tsc` ni siquiera estaba instalado cuando ese script se ejecutaba. Dos motivos independientes para el mismo fallo.

La solución correcta no es marcar un override vacío de "Build Command" en el dashboard de Vercel — eso funciona, pero es un ajuste invisible en la UI que cualquiera que reimporte el proyecto (o lo despliegue desde cero) puede olvidar. La solución correcta está en el propio repositorio: renombrar el script a `typecheck`, un nombre que Vercel no invoca automáticamente. Las funciones de `api/` las compila el propio runtime Node de Vercel al vuelo a partir del `.ts`; nuestro `tsc --noEmit` nunca fue parte del proceso de build de producción, es solo un chequeo de tipos para desarrollo/CI — no debía ejecutarse ahí en primer lugar.

## 6. Lo que NO se ha hecho todavía (a propósito)

- Cache/cron/persistencia más allá del `Cache-Control` + ETag actuales, incluido el SEQUENCE real de la sección 3 (Milestone 5).
- Angular (Milestone 6).
- Base de datos: no se ha introducido nada.
- Decidir si "0 partidos para este equipo" debería ser `404` en vez de `200` con calendario vacío — de momento es `200` a propósito (ver 4.2); es una decisión de producto, no técnica, y prefiero que la tomes tú viendo el comportamiento real.

## 7. Preguntas abiertas

De Milestones 1-2 (sin cambios, seguimos sin haber visto casos reales):

1. Códigos de estado FCF más allá de `scheduled` (acabado/aplazado/suspendido/cancelado).
2. Confirmar `isBye` contra un caso real de "Descans".
3. Nombre legible del grupo ("TGN Gr. 14") — sigue sin fuente confirmada.
4. ~~Cómo importar de verdad un `.ics` suscrito en Apple Calendar desde iPhone~~ — resuelto en Milestone 4: `webcal://` con la URL pública real dispara el diálogo nativo "Añadir suscripción de calendario" en Safari/iOS, sin la confusión de Mail/Files de Milestone 2.

Nuevas de Milestone 3-4:

5. ~~Dominio real de despliegue~~ — resuelto en Milestone 4: `DEFAULT_UID_DOMAIN` en `ics-config.ts` es ahora `partitsalcalendari.com`, el dominio real de despliegue. A partir de aquí, cambiarlo sería una breaking change (ver comentario en `ics-config.ts`).
6. **¿`404` o `200` vacío para un equipo sin partidos?** Ver sección 6, último punto.
7. **¿30 minutos de `max-age` es razonable?** Es una elección inicial sin datos reales de cuántos usuarios/peticiones habrá — fácil de ajustar, es una constante en `calendar-http-handler.ts`.

## 8. Estructura de carpetas (actualizada)

```
api/
  calendar/[groupId]/[teamId].ts   (nuevo — adaptador Vercel)
src/
  domain/
    team.ts, venue.ts, match-status.ts, match.ts, index.ts
  shared/
    timezone.ts
  federation/
    federation-provider.ts
    fcf/
      fcf.types.ts, fcf-date.ts, fcf-bye.ts, fcf-status.mapper.ts,
      fcf.mapper.ts, fcf.provider.ts, fcf-logger.ts
  matches/
    match-filter.ts
  calendar/
    ics-config.ts, ics-text.ts, ics-timezone.ts, ics-status.mapper.ts, ics-generator.ts,
    calendar.service.ts (nuevo), match-content-hash.ts (nuevo)
  http/                              (nuevo — Milestone 3)
    calendar-route.ts, calendar-http-handler.ts, http-logger.ts
scripts/
  run-tests.mjs, smoke-fcf.ts, smoke-ics.ts, dev-server.ts (nuevo)
tests/
  fixtures/
    fcf.fixtures.ts, match.fixtures.ts, fake-federation-provider.ts (nuevo)
  shared/
    timezone.test.ts
  federation/fcf/
    fcf-date.test.ts, fcf-bye.test.ts, fcf-status.mapper.test.ts, fcf.mapper.test.ts, fcf.provider.test.ts
  matches/
    match-filter.test.ts
  calendar/
    ics-text.test.ts, ics-timezone.test.ts, ics-status.mapper.test.ts,
    ics-generator.test.ts, ics-generator.integration.test.ts,
    calendar.service.test.ts (nuevo), match-content-hash.test.ts (nuevo)
  http/                              (nuevo)
    calendar-route.test.ts, calendar-http-handler.test.ts
```

## 9. Cobertura de tests (126 tests)

Milestones 1+2 (88, sin cambios de comportamiento) + Milestone 3 (38 nuevos):

- `match-content-hash.ts`: estable entre llamadas para el mismo input, formato entrecomillado RFC 7232, cambia ante cambios de fecha/pabellón/estado/nombre, sensible al orden de los partidos, estable para una lista vacía.
- `calendar.service.ts`: filtra correctamente por equipo (incluyendo el caso de los dos "La Sénia"), resuelve `calendarName` desde casa/fuera, override explícito de `calendarName`, equipo sin partidos nunca lanza, propaga errores del provider sin tragárselos, hace `trim` de `groupId`/`teamId`, ETag estable entre dos llamadas con datos idénticos, ETag distinto cuando cambia el horario, pasa `icsOptions` (duración/`now`/`uidDomain`) hasta `generateIcs`.
- `calendar-route.ts`: ruta bien formada, sufijo `.ics` insensible a mayúsculas, query string ignorada, segmentos con URL-encoding, con/sin prefijo `/api`, y cada caso de ruta inválida (sin `calendar`, sin `teamId`, sin sufijo `.ics`, `groupId`/`teamId` vacíos, ruta no relacionada).
- `calendar-http-handler.ts`: `GET` y `HEAD` válidos con todas las cabeceras esperadas, `405` con `Allow`, `400` sin llegar a llamar al provider, `304` con `If-None-Match` correcto, `200` fresco con `If-None-Match` obsoleto, `502` no cacheable ante fallo del provider, calendario vacío válido para equipo sin partidos.
