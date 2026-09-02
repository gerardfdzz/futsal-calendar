import type { FcfCatalogOptionDto } from './fcf-catalog.types.js';

export function mapCatalogOption(dto: FcfCatalogOptionDto): { id: string; name: string } {
  return { id: dto.value.trim(), name: dto.label.trim() };
}

export function dedupeAndSortById<T extends { id: string; name: string }>(items: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ca'));
}
