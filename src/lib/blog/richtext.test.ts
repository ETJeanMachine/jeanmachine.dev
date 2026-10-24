// @ts-ignore Bun supplies bun:test at runtime; no global Bun types are needed by the app.
import { describe, expect, test } from 'bun:test';
import { cleanFacets, richText } from './richtext';
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
