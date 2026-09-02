/**
 * Raw shape shared by every FCF "selector" endpoint used to browse the
 * competition catalog: `/api/competition/disciplines`,
 * `/api/competition/competicions`, `/api/competition/grupos`, and
 * `/api/competition/equipos` all return a plain array of these — the
 * exact `{value, label}` pairs the FCF's own `<select>` dropdowns are
 * built from (verified against real responses; `competicions` sends a
 * couple of extra fields — `CODTEMPORADA`, `TIPO_COMPETICION` — that we
 * deliberately ignore, since we have no confirmed use for them yet).
 *
 * Only ever consumed by `fcf-catalog.mapper.ts` /
 * `fcf-competition-catalog.provider.ts`; nothing outside
 * `federation/fcf/` should import it.
 */
export interface FcfCatalogOptionDto {
  readonly value: string;
  readonly label: string;
}
