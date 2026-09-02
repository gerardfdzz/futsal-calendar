import type { FcfCatalogOptionDto } from '../../src/federation/fcf/fcf-catalog.types.js';

export function buildFcfCatalogOptionDto(overrides: Partial<FcfCatalogOptionDto> = {}): FcfCatalogOptionDto {
  return { value: '58162580', label: 'TGN Gr. 14', ...overrides };
}
