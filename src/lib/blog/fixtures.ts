import type {
  SiteStandardDocument,
  SiteStandardPublication,
} from '@atcute/standard-site';

// Wire-format builders deliberately allow unknown fields and malformed overrides.
export const block = (type: string, fields: Record<string, unknown> = {}) => ({
  $type: `pub.leaflet.blocks.${type}`,
  ...fields,
});
export const text = (plaintext: string) => block('text', { plaintext });
export const page = (
  blocks: unknown[],
  fields: Record<string, unknown> = {},
) => ({
  $type: 'pub.leaflet.pages.linearDocument',
  blocks: blocks.map((block) => ({ block })),
  ...fields,
});
export const content = (...pages: unknown[]) => ({
  $type: 'pub.leaflet.content' as const,
  pages,
});
export const singlePage = (blocks: unknown[]) => content(page(blocks));

export function documentFixture(fields: Record<string, unknown> = {}) {
  const document: SiteStandardDocument.Main = {
    $type: 'site.standard.document',
    title: 'Native article',
    site: 'https://example.com',
    publishedAt: '2026-10-23T00:00:00.000Z',
  };
  // Open-union bodies are validated by the reader, not by these test builders.
  return Object.assign(document, fields);
}

export function publicationFixture(fields: Record<string, unknown> = {}) {
  const publication: SiteStandardPublication.Main = {
    $type: 'site.standard.publication',
    name: 'Blog',
    url: 'https://example.com',
  };
  return Object.assign(publication, fields);
}
