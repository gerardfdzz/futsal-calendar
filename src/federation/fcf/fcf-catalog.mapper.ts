import type { FcfCatalogOptionDto } from './fcf-catalog.types.js';

/**
 * Every catalog-selector domain type (`Discipline`, `Competition`,
 * `Group`, `TeamOption`) is structurally `{id, name}` — this is the one
 * function that maps the shared raw `{value, label}` shape into that.
 * Callers annotate the return type at the call site (see
 * `fcf-competition-catalog.provider.ts`); TypeScript's structural typing
 * accepts it for any of the four without a cast.
 */
export function mapCatalogOption(dto: FcfCatalogOptionDto): { id: string; name: string } {
  return { id: dto.value.trim(), name: dto.label.trim() };
}

/**
 * The FCF's `/api/competition/equipos` endpoint repeats each team once
 * per jornada it appears in (verified against real data: a 13-jornada
 * group returns most teams 10+ times). This collapses those duplicates
 * by `id`, keeping the first-seen `name` spelling, and returns the result
 * sorted by name for a predictable, user-friendly picker — the raw order
 * has no documented meaning we can rely on.
 */
export function dedupeAndSortById<T extends { id: string; name: string }>(items: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ca'));
}
