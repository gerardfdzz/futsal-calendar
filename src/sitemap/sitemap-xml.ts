export type SitemapChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface SitemapEntry {
  readonly url: string;
  readonly lastModified?: Date;
  readonly changeFrequency?: SitemapChangeFrequency;
  readonly priority?: number;
}

const XML_ESCAPES: ReadonlyMap<string, string> = new Map([
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&apos;'],
]);

export function buildSitemapXml(entries: readonly SitemapEntry[]): string {
  const urlElements = entries.map(buildUrlElement).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlElements}\n</urlset>\n`;
}

function buildUrlElement(entry: SitemapEntry): string {
  const lastmod = entry.lastModified ? `\n    <lastmod>${entry.lastModified.toISOString().slice(0, 10)}</lastmod>` : '';
  const changefreq = entry.changeFrequency ? `\n    <changefreq>${entry.changeFrequency}</changefreq>` : '';
  const priority = entry.priority !== undefined ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : '';
  return `  <url>\n    <loc>${escapeXml(entry.url)}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES.get(char) ?? char);
}
