// @ts-ignore Bun supplies bun:test at runtime; no global Bun types are needed by the app.
import { describe, expect, test } from 'bun:test';
import { anchorAllocator, MAX_BLOCKS, normalizeContent } from './normalize';

const block = (type: string, fields = {}) => ({
  $type: `pub.leaflet.blocks.${type}`,
  ...fields,
});
const page = (blocks: unknown[], fields = {}) => ({
  $type: 'pub.leaflet.pages.linearDocument',
  blocks: blocks.map((block) => ({ block })),
  ...fields,
});
const content = (...pages: unknown[]) => ({
  $type: 'pub.leaflet.content',
  pages,
});

describe('article normalization', () => {
  test('current known Leaflet schemas accept renderable and explicitly adapted blocks', () => {
    const cid = `bafkrei${'a'.repeat(52)}`;
    const image = {
      $type: 'blob',
      ref: { $link: cid },
      mimeType: 'image/png',
      size: 100,
    };
    const ratio = { width: 16, height: 9 };
    const reference = {
      uri: 'at://did:plc:aaaaaaaaaaaaaaaaaaaaaaaa/app.bsky.feed.post/test',
      cid,
    };
    const fixtures: [string, Record<string, unknown>][] = [
      ['text', { plaintext: 'Text' }],
      ['header', { plaintext: 'Header', level: 1 }],
      ['blockquote', { plaintext: 'Quote' }],
      ['code', { plaintext: '<escaped>', language: 'html' }],
      ['image', { image, aspectRatio: ratio, alt: 'Example' }],
      [
        'imageGallery',
        { images: [{ image, aspectRatio: ratio, alt: 'Gallery example' }] },
      ],
      ['horizontalRule', {}],
      ['website', { src: 'https://example.com', previewImage: image }],
      ['math', { tex: 'x^2' }],
      ['bskyPost', { postRef: reference }],
      ['button', { text: 'Visit', url: 'https://example.com' }],
      ['iframe', { url: 'https://example.com' }],
      ['html', { html: '<script>never injected</script>' }],
      [
        'drawing',
        {
          viewBox: { x: 0, y: 0, width: 100, height: 100 },
          strokes: [
            { color: 'primary', size: 2, points: [0, 0, 500, 100, 100, 500] },
          ],
        },
      ],
      ['page', { id: 'next' }],
      ['embeddedCanvas', { id: 'canvas', alt: 'Diagram' }],
      ['standardSitePost', { uri: reference.uri }],
      ['standardSitePublication', { uri: reference.uri }],
      ['poll', { pollRef: reference }],
      ['postHeader', {}],
      ['postsList', {}],
      ['questions', {}],
      ['recommendedPubs', {}],
      ['reply', {}],
      ['signup', {}],
      ['membersOnlyDelimiter', { audience: 'paid' }],
    ];
    const result = normalizeContent(
      content(page(fixtures.map(([type, fields]) => block(type, fields)))),
    );
    expect(result.pages[0].blocks.map((item) => item.kind)).toEqual(
      fixtures.map(([type]) => type),
    );
  });
  test('future and malformed blocks do not destroy valid siblings', () => {
    const result = normalizeContent(
      content(
        page([
          block('text', { plaintext: 'before' }),
          block('future', { html: '<script>bad</script>' }),
          block('image'),
          block('text', { plaintext: 'after' }),
        ]),
      ),
    );
    expect(result.pages[0].blocks.map((item) => item.kind)).toEqual([
      'text',
      'unsupported',
      'unsupported',
      'text',
    ]);
    expect(result.fallback).toBeNull();
  });
  test('plain text fallback for missing, unsupported, malformed or empty content', () => {
    for (const input of [
      undefined,
      null,
      {},
      { $type: 'other.content' },
      content(page([])),
      content(page([block('future')])),
    ])
      expect(normalizeContent(input, '<b>plain text</b>').fallback).toBe(
        '<b>plain text</b>',
      );
    expect(normalizeContent(null).pages).toEqual([]);
  });
  test('malformed facets do not erase valid text', () => {
    const result = normalizeContent(
      content(
        page([
          block('text', {
            plaintext: 'hello',
            facets: [{ index: null, features: [] }],
          }),
        ]),
      ),
    );
    const normalized = result.pages[0].blocks[0];
    expect(normalized.kind).toBe('text');
    if (normalized.kind === 'text') expect(normalized.value.facets).toEqual([]);
  });
  test('headings get deterministic collision-proof unique anchors', () => {
    const input = content(
      page([
        block('header', { plaintext: 'Hello!' }),
        block('header', { plaintext: 'Hello' }),
        block('header', { plaintext: 'Hello-2' }),
        block('header', { plaintext: 'Hello' }),
      ]),
    );
    const first = normalizeContent(input).pages[0].blocks.map(
      (item) => item.id,
    );
    expect(new Set(first).size).toBe(4);
    expect(first).toEqual(
      normalizeContent(input).pages[0].blocks.map((item) => item.id),
    );
    const allocate = anchorAllocator();
    expect(allocate('🦋')).toBe('article-section');
    expect(allocate('日本語')).toBe('article-日本語');
  });
  test('mixed nested lists preserve start, checks, children and malformed sibling fallback', () => {
    const input = block('orderedList', {
      startIndex: 4,
      children: [
        {
          checked: true,
          content: block('text', { plaintext: 'one' }),
          unorderedListChildren: block('unorderedList', {
            children: [{ content: block('text', { plaintext: 'nested' }) }],
          }),
        },
        { content: block('future') },
      ],
    });
    const result = normalizeContent(content(page([input]))).pages[0].blocks[0];
    expect(result.kind).toBe('list');
    if (result.kind === 'list') {
      expect(result.start).toBe(4);
      expect(result.items[0].checked).toBe(true);
      expect(result.items[0].nested?.ordered).toBe(false);
      expect(result.items[1].block.kind).toBe('unsupported');
    }
  });
  test('recursive/cyclic lists terminate at the depth cap', () => {
    const children: unknown[] = [];
    children.push({
      content: block('text', { plaintext: 'nested' }),
      children,
    });
    const result = normalizeContent(
      content(page([block('unorderedList', { children })])),
    );
    expect(result.truncated).toBe(true);
  });
  test('large articles stop at the global block cap', () => {
    const result = normalizeContent(
      content(
        page(
          Array.from({ length: MAX_BLOCKS + 1 }, () =>
            block('text', { plaintext: 'hello' }),
          ),
        ),
      ),
    );
    expect(result.pages[0].blocks.length).toBe(MAX_BLOCKS);
    expect(result.truncated).toBe(true);
  });
  test('canvas groups are flattened into ordered flow and page IDs are safe', () => {
    const canvas = {
      $type: 'pub.leaflet.pages.canvas',
      id: '__proto__',
      blocks: [
        {
          x: 10,
          y: 20,
          width: 200,
          block: page([block('text', { plaintext: 'canvas text' })]),
        },
      ],
    };
    const result = normalizeContent(
      content(canvas, page([block('page', { id: '__proto__' })])),
    );
    expect(result.pages[0].canvas).toBe(true);
    expect(result.pages[0].blocks[0].kind).toBe('group');
    expect(result.pageLinks.__proto__).toBe('#article-page-1');
  });
  test('decoded inline pages are used without fetching or examining blobPages metadata', () => {
    const input = {
      ...content(page([block('text', { plaintext: 'decoded' })])),
      blobPages: { arbitrary: 'metadata' },
    };
    expect(normalizeContent(input).pages[0].blocks[0].kind).toBe('text');
  });
  test('HTML remains a validated non-renderable block and never becomes markup', () => {
    expect(
      normalizeContent(
        content(page([block('html', { html: '<script>bad()</script>' })])),
        'fallback',
      ).fallback,
    ).toBe('fallback');
  });
});
