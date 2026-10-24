// @ts-ignore Bun supplies bun:test at runtime; no global Bun types are needed by the app.
import { describe, expect, test } from 'bun:test';
import { cleanFacets, MAX_FACETS, richText } from './richtext';
import {
  blueskyProfileUrl,
  blueskyUrl,
  imageUrl,
  recordUrl,
  safeFrameUrl,
  safeLink,
  safeWebUrl,
} from './urls';
import { renderMath } from './math';

const feature = (name: string, extra = {}) => ({
  $type: `pub.leaflet.richtext.facet#${name}`,
  ...extra,
});
const facet = (start: number, end: number, features: unknown[]) => ({
  index: { byteStart: start, byteEnd: end },
  features,
});

describe('UTF-8 rich text', () => {
  test('emoji, combining characters, CJK and accents use byte offsets, not UTF-16', () => {
    const text = 'A🦋é中e\u0301Z';
    const result = richText(text, [
      facet(1, 6, [feature('bold')]),
      facet(6, 12, [feature('italic')]),
    ]);
    expect(result.segments.map((item) => item.text).join('')).toBe(text);
    expect(result.segments.find((item) => item.text === '🦋é')).toBeUndefined();
    // Emoji occupies bytes 1..5, é 5..7: offsets into é must be discarded.
    expect(result.segments.every((item) => !item.marks.includes('bold'))).toBe(
      true,
    );
    const valid = richText(text, [
      facet(1, 7, [feature('bold')]),
      facet(7, 13, [feature('italic')]),
    ]);
    expect(valid.segments.find((item) => item.text === '🦋é')?.marks).toEqual([
      'bold',
    ]);
    expect(
      valid.segments.find((item) => item.text === '中e\u0301')?.marks,
    ).toEqual(['italic']);
  });
  test('all overlapping and combined marks survive without nested anchors', () => {
    const result = richText('abcdef', [
      facet(0, 4, [
        feature('bold'),
        feature('italic'),
        feature('link', { uri: 'https://example.com' }),
      ]),
      facet(2, 6, [
        feature('code'),
        feature('underline'),
        feature('strikethrough'),
        feature('highlight'),
        feature('link', { uri: 'https://other.example' }),
      ]),
    ]);
    expect(result.segments.map((item) => item.text)).toEqual([
      'ab',
      'cd',
      'ef',
    ]);
    expect(result.segments[1].marks).toEqual([
      'bold',
      'italic',
      'code',
      'underline',
      'strikethrough',
      'highlight',
    ]);
    expect(result.segments[1].href).toBe('https://example.com/');
    expect(result.segments[2].href).toBe('https://other.example/');
  });
  test('DID mentions preserve structural colons in Bluesky profile links', () => {
    const result = richText('mention', [
      facet(0, 7, [
        feature('didMention', { did: 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb' }),
      ]),
    ]);
    expect(result.segments[0].href).toBe(
      'https://bsky.app/profile/did:plc:bbbbbbbbbbbbbbbbbbbbbbbb',
    );
  });
  test('invalid/future features do not discard valid marks', () => {
    const result = richText('hello', [
      facet(0, 5, [
        feature('bold'),
        feature('future'),
        feature('link', { uri: 'javascript:alert(1)' }),
      ]),
      facet(-1, 3, [feature('italic')]),
      facet(1, 100, [feature('code')]),
    ]);
    expect(result.segments).toEqual([
      { text: 'hello', marks: ['bold'], href: null, notes: [] },
    ]);
    expect(
      cleanFacets([{ features: [], index: { byteStart: 'bad', byteEnd: 3 } }]),
    ).toEqual([]);
  });
  test('footnotes use bounded, escaped text and deterministic local IDs', () => {
    const note = feature('footnote', {
      footnoteId: 'x" onclick="evil',
      contentPlaintext: '<script>bad</script>',
    });
    const result = richText(
      'abc',
      [facet(0, 3, [note]), facet(1, 2, [feature('bold')])],
      'article-block-1',
    );
    expect(result.footnotes[0]).toEqual({
      id: 'footnote:article-block-1:1',
      text: '<script>bad</script>',
      facets: [],
    });
    expect(result.segments.flatMap((item) => item.notes)).toEqual([
      'footnote:article-block-1:1',
    ]);
    const cyclic = { ...note, contentFacets: [] as unknown[] };
    cyclic.contentFacets.push(facet(0, 1, [cyclic]));
    expect(richText('a', [facet(0, 1, [cyclic])]).footnotes).toHaveLength(1);
  });
  test('facet and feature budgets bound raw entries rather than searching past invalid input', () => {
    const valid = facet(0, 1, [feature('bold')]);
    const atLimit = cleanFacets(Array(MAX_FACETS).fill(valid));
    expect(atLimit).toHaveLength(MAX_FACETS);
    const overLimit = cleanFacets([
      ...Array(MAX_FACETS).fill(valid),
      facet(0, 1, [feature('italic')]),
    ]);
    expect(overLimit).toHaveLength(MAX_FACETS);
    expect(
      overLimit.every((item) =>
        item.features.every(
          (value) => value.$type === 'pub.leaflet.richtext.facet#bold',
        ),
      ),
    ).toBe(true);
    expect(cleanFacets([...Array(MAX_FACETS).fill(null), valid])).toEqual([]);
    const features = cleanFacets([
      facet(0, 1, [...Array(30).fill(feature('bold')), feature('italic')]),
    ]);
    expect(features[0].features).toHaveLength(30);
    expect(
      richText('a', [facet(0, 1, [...Array(30).fill(null), feature('bold')])])
        .segments[0].marks,
    ).toEqual([]);
    // Adjacent accepted facets remain usable at the boundary, without clipping text.
    const result = richText('ab', [
      ...Array(MAX_FACETS - 1).fill(facet(0, 1, [feature('bold')])),
      facet(1, 2, [feature('italic')]),
      facet(0, 2, [feature('code')]),
    ]);
    expect(result.segments).toEqual([
      { text: 'a', marks: ['bold'], href: null, notes: [] },
      { text: 'b', marks: ['italic'], href: null, notes: [] },
    ]);
  });
  test('zero-length, reversed, fractional, non-finite and out-of-range byte offsets are ignored losslessly', () => {
    const text = 'a🦋é';
    const result = richText(text, [
      ...[
        [0, 0],
        [5, 1],
        [-1, 1],
        [0.5, 1],
        [0, NaN],
        [0, Infinity],
        [0, 8],
        [2, 5],
      ].map(([start, end]) => facet(start, end, [feature('italic')])),
      facet(1, 5, [feature('bold')]),
    ]);
    expect(result.segments).toEqual([
      { text: 'a', marks: [], href: null, notes: [] },
      { text: '🦋', marks: ['bold'], href: null, notes: [] },
      { text: 'é', marks: [], href: null, notes: [] },
    ]);
    expect(result.segments.map((item) => item.text).join('')).toBe(text);
  });
  test('repeated footnote identities allocate one note at the first endpoint with separate scoped IDs', () => {
    const note = feature('footnote', {
      footnoteId: 'same',
      contentPlaintext: 'first note',
    });
    const facets = [
      facet(0, 1, [note]),
      facet(1, 3, [{ ...note, contentPlaintext: 'ignored duplicate' }]),
    ];
    const result = richText('abc', facets, 'first');
    expect(result.footnotes).toEqual([
      { id: 'footnote:first:1', text: 'first note', facets: [] },
    ]);
    expect(result.segments.flatMap((item) => item.notes)).toEqual([
      'footnote:first:1',
    ]);
    expect(richText('abc', facets, 'second').footnotes[0].id).toBe(
      'footnote:second:1',
    );
  });
  test('empty text and facets inside emoji do not produce replacement characters', () => {
    expect(richText('', []).segments).toEqual([]);
    expect(richText('🦋', [facet(1, 3, [feature('bold')])]).segments).toEqual([
      { text: '🦋', marks: [], href: null, notes: [] },
    ]);
  });
});

describe('URL policy', () => {
  test('executable, protocol-relative, credentialed and obfuscated URLs are rejected', () => {
    for (const input of [
      'javascript:alert(1)',
      'data:text/html,x',
      '//evil.example',
      '/\\evil.example',
      'https://user:pass@example.com',
      ' javaScript:x',
      'https:\n//example.com',
      'file:///etc/passwd',
      'vbscript:x',
    ])
      expect(safeLink(input)).toBeNull();
    expect(safeLink('https://example.com/a?b=1#c')).toBe(
      'https://example.com/a?b=1#c',
    );
    expect(safeLink('mailto:hello@example.com')).toBe(
      'mailto:hello@example.com',
    );
    expect(safeLink('/blog/test')).toBe('/blog/test');
    expect(safeLink('#article-heading')).toBe('#article-heading');
    expect(safeWebUrl('mailto:hello@example.com')).toBeNull();
  });
  test('only explicit HTTPS embed providers and paths are allowed', () => {
    expect(
      safeFrameUrl('https://www.youtube-nocookie.com/embed/abc-123'),
    ).not.toBeNull();
    expect(safeFrameUrl('https://player.vimeo.com/video/123')).not.toBeNull();
    for (const input of [
      'https://example.com/embed/abc',
      'http://player.vimeo.com/video/1',
      'https://player.vimeo.com.evil.example/video/1',
      'https://www.youtube-nocookie.com/watch?v=abc',
      'https://www.youtube.com/embed/dQw4w9WgXc',
      'https://www.youtube-nocookie.com.evil.example/embed/dQw4w9WgXc',
      'https://www.youtube-nocookie.com@evil.example/embed/dQw4w9WgXc',
      'https://user@www.youtube-nocookie.com/embed/dQw4w9WgXc',
      'https://www.youtube-nocookie.com:8443/embed/dQw4w9WgXc',
      'https://player.vimeo.com:8443/video/1',
      'https://player.vimeo.com/video/1/extra',
      'https://player.vimeo.com/video/%31',
      'https://www.youtube-nocookie.com/embed/%2Fmalicious',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXc/extra',
      'https://www.youtube-nocookie.com./embed/dQw4w9WgXc',
      'javascript:alert(1)',
      'data:text/html,<iframe src="https://player.vimeo.com/video/1">',
    ])
      expect(safeFrameUrl(input)).toBeNull();
  });
  test('Bluesky profiles preserve colons but escape reserved path characters', () => {
    expect(blueskyProfileUrl('alice.bsky.social')).toBe(
      'https://bsky.app/profile/alice.bsky.social',
    );
    expect(blueskyProfileUrl('did:plc:bbbbbbbbbbbbbbbbbbbbbbbb')).toBe(
      'https://bsky.app/profile/did:plc:bbbbbbbbbbbbbbbbbbbbbbbb',
    );
    expect(blueskyProfileUrl('did:web:example.com/path?query#hash%3A')).toBe(
      'https://bsky.app/profile/did:web:example.com%2Fpath%3Fquery%23hash%253A',
    );
  });
  test('PDSls record links preserve DID colons and handle authorities', () => {
    expect(
      recordUrl(
        'at://did:plc:6vxtya3serxcwvcdk5e7psvv/site.standard.document/3mexample',
      ),
    ).toBe(
      'https://pdsls.dev/at/did:plc:6vxtya3serxcwvcdk5e7psvv/site.standard.document/3mexample',
    );
    expect(
      recordUrl('at://did:web:example.com/site.standard.document/article'),
    ).toBe(
      'https://pdsls.dev/at/did:web:example.com/site.standard.document/article',
    );
    expect(
      recordUrl('at://alice.bsky.social/site.standard.document/article'),
    ).toBe(
      'https://pdsls.dev/at/alice.bsky.social/site.standard.document/article',
    );
  });
  test('PDSls record keys preserve allowed colons without decoding percent escapes', () => {
    expect(
      recordUrl(
        'at://did:web:example.com/site.standard.document/article:part:1',
      ),
    ).toBe(
      'https://pdsls.dev/at/did:web:example.com/site.standard.document/article:part:1',
    );
    expect(
      recordUrl(
        'at://did:web:example.com%3A8443/site.standard.%2F/a%3Ab%2Fc%3Fquery%23hash%',
      ),
    ).toBe(
      'https://pdsls.dev/at/did:web:example.com%253A8443/site.standard.%252F/a%253Ab%252Fc%253Fquery%2523hash%25',
    );
  });
  test('PDSls links escape query/hash-like segments without introducing URL components', () => {
    const href = recordUrl(
      'at://did:web:example.com?query#hash/site.standard.document?query#hash/article',
    );
    expect(href).toBe(
      'https://pdsls.dev/at/did:web:example.com%3Fquery%23hash/site.standard.document%3Fquery%23hash/article',
    );
    const url = new URL(href!);
    expect(url.origin).toBe('https://pdsls.dev');
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
    expect(safeWebUrl(href)).toBe(href);
  });
  test('PDSls links reject non-record URIs and query/hash suffixes', () => {
    for (const uri of [
      '',
      'javascript:alert(1)',
      'https://example.com/site.standard.document/article',
      'at://did:web:example.com',
      'at://did:web:example.com/site.standard.document',
      'at://did:web:example.com/site.standard.document/',
      'at:///site.standard.document/article',
      'at://did:web:example.com//article',
      'at://did:web:example.com/site.standard.document/article/extra',
      'at://did:web:example.com/site.standard.document/article?query',
      'at://did:web:example.com/site.standard.document/article#hash',
    ])
      expect(recordUrl(uri)).toBeNull();
  });
  test('Bluesky post links retain the referenced author, not the site owner', () => {
    expect(blueskyUrl('at://did:plc:other/app.bsky.feed.post/abc')).toBe(
      'https://bsky.app/profile/did:plc:other/post/abc',
    );
    expect(blueskyUrl('at://alice.bsky.social/app.bsky.feed.post/a%2Fb')).toBe(
      'https://bsky.app/profile/alice.bsky.social/post/a%252Fb',
    );
    expect(blueskyUrl('javascript:bad')).toBeNull();
    expect(imageUrl(undefined)).toBeNull();
  });
});

test('math produces trusted MathML, blocks unsafe extensions, and handles invalid TeX', () => {
  expect(renderMath('x^2 + \\frac{1}{2}')).toContain('<math');
  // KaTeX displays disabled commands as text rather than throwing; no live attributes are emitted.
  expect(renderMath('\\href{javascript:alert(1)}{click}')).not.toMatch(
    /href\s*=/i,
  );
  expect(renderMath('\\htmlClass{evil}{x}') ?? '').not.toContain(
    'class="evil"',
  );
  expect(renderMath('\\unknowncommand')).toBeNull();
  expect(renderMath('x'.repeat(20_001))).toBeNull();
});
