/**
 * Raw shape shared by every FCF "selector" endpoint used to browse the
 * competition catalog (`disciplines`, `competicions`, `grupos`,
 * `equipos`) — the `{value, label}` pairs the FCF's own `<select>`
 * dropdowns are built from. `competicions` sends extra fields
 * (`CODTEMPORADA`, `TIPO_COMPETICION`) that we deliberately ignore.
 *
 * Nothing outside `federation/fcf/` should import it.
 */
export interface FcfCatalogOptionDto {
  readonly value: string;
  readonly label: string;
}
