import { PubLeafletRichtextFacet as Facet } from '@atcute/leaflet';
import { is } from '@atcute/lexicons';
import { blueskyProfileUrl, safeLink } from './urls';

export type Mark =
  'bold' | 'italic' | 'code' | 'underline' | 'strikethrough' | 'highlight';
export interface Footnote {
  id: string;
  text: string;
  facets: unknown[];
}
export interface Segment {
  text: string;
  marks: Mark[];
  href: string | null;
  notes: string[];
}
export interface RichText {
  segments: Segment[];
  footnotes: Footnote[];
}
export const MAX_FACETS = 1000;
const prefix = 'pub.leaflet.richtext.facet#';
const markNames = new Set<Mark>([
  'bold',
  'italic',
  'code',
  'underline',
  'strikethrough',
  'highlight',
]);

/** Validate features independently; nested footnotes are flattened to prevent recursive schemas. */
export function cleanFacets(input: unknown): Facet.Main[] {
  if (!Array.isArray(input)) return [];
  const result: Facet.Main[] = [];
  for (const item of input.slice(0, MAX_FACETS)) {
    if (!item || typeof item !== 'object' || !Array.isArray(item.features))
      continue;
    const features: Facet.Main['features'] = [];
    for (const feature of item.features.slice(0, 30)) {
      if (!feature || typeof feature !== 'object') continue;
      const candidate =
        feature.$type === `${prefix}footnote`
          ? { ...feature, contentFacets: undefined }
          : feature;
      if (is(Facet.mainSchema, { index: item.index, features: [candidate] }))
        features.push(candidate);
    }
    const candidate = {
      $type: 'pub.leaflet.richtext.facet' as const,
      index: item.index,
      features,
    };
    if (is(Facet.mainSchema, candidate)) result.push(candidate);
  }
  return result;
}

/** Split at UTF-8 boundaries, then combine all overlapping facets without nesting anchors. */
export function richText(
  text: string,
  input: unknown,
  scope = 'richtext',
): RichText {
  const boundaries = new Map<number, number>([[0, 0]]);
  let byte = 0;
  let utf16 = 0;
  const encoder = new TextEncoder();
  for (const character of text) {
    byte += encoder.encode(character).length;
    utf16 += character.length;
    boundaries.set(byte, utf16);
  }
  const facets = cleanFacets(input).filter(
    ({ index }) =>
      index.byteStart >= 0 &&
      index.byteEnd > index.byteStart &&
      boundaries.has(index.byteStart) &&
      boundaries.has(index.byteEnd),
  );
  const cuts = [
    ...new Set([
      0,
      byte,
      ...facets.flatMap(({ index }) => [index.byteStart, index.byteEnd]),
    ]),
  ].sort((a, b) => a - b);
  const footnotes: Footnote[] = [];
  const noteIds = new Map<string, string>();
  const segments: Segment[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const start = cuts[i];
    const end = cuts[i + 1];
    const marks = new Set<Mark>();
    const notes: string[] = [];
    let href: string | null = null;
    for (const facet of facets) {
      if (facet.index.byteStart > start || facet.index.byteEnd < end) continue;
      for (const feature of facet.features) {
        const name = feature.$type?.slice(prefix.length);
        if (markNames.has(name as Mark)) marks.add(name as Mark);
        if (name === 'link' && 'uri' in feature) href ??= safeLink(feature.uri);
        if (name === 'atMention' && 'href' in feature)
          href ??= safeLink(feature.href);
        if (
          name === 'didMention' &&
          'did' in feature &&
          typeof feature.did === 'string'
        )
          href ??= blueskyProfileUrl(feature.did);
        if (
          feature.$type === `${prefix}footnote` &&
          end === facet.index.byteEnd
        ) {
          let id = noteIds.get(feature.footnoteId);
          if (!id) {
            // Article heading/page slugs never contain colons or use this namespace.
            id = `footnote:${scope}:${footnotes.length + 1}`;
            noteIds.set(feature.footnoteId, id);
            footnotes.push({ id, text: feature.contentPlaintext, facets: [] });
            notes.push(id);
          }
        }
      }
    }
    segments.push({
      text: text.slice(boundaries.get(start), boundaries.get(end)),
      marks: [...marks],
      href,
      notes,
    });
  }
  return { segments, footnotes };
}
