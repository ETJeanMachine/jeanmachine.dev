// @ts-ignore Bun supplies bun:test at runtime; no global Bun types are needed by the app.
import { describe, expect, test } from 'bun:test';
import {
  anchorAllocator,
  MAX_BLOCKS,
  MAX_DEPTH,
  normalizeContent,
  type Block,
} from './normalize';

import { block, content, page, singlePage, text } from './fixtures';

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
      singlePage(fixtures.map(([type, fields]) => block(type, fields))),
    );
    expect(result.pages[0].blocks.map((item) => item.kind)).toEqual(
      fixtures.map(([type]) => type),
    );
  });
  test('future and malformed blocks do not destroy valid siblings', () => {
    const result = normalizeContent(
      singlePage([
        text('before'),
        block('future', { html: '<script>bad</script>' }),
        block('image'),
        text('after'),
      ]),
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
      singlePage([]),
      singlePage([block('future')]),
    ])
      expect(normalizeContent(input, '<b>plain text</b>').fallback).toBe(
        '<b>plain text</b>',
      );
    expect(normalizeContent(null).pages).toEqual([]);
  });
  test('malformed facets do not erase valid text', () => {
    const result = normalizeContent(
      singlePage([
        block('text', {
          plaintext: 'hello',
          facets: [{ index: null, features: [] }],
        }),
      ]),
    );
    const normalized = result.pages[0].blocks[0];
    expect(normalized.kind).toBe('text');
    if (normalized.kind === 'text') expect(normalized.value.facets).toEqual([]);
  });
  test('headings get deterministic collision-proof unique anchors', () => {
    const input = singlePage([
      block('header', { plaintext: 'Hello!' }),
      block('header', { plaintext: 'Hello' }),
      block('header', { plaintext: 'Hello-2' }),
      block('header', { plaintext: 'Hello' }),
    ]);
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
          content: text('one'),
          unorderedListChildren: block('unorderedList', {
            children: [{ content: text('nested') }],
          }),
        },
        { content: block('future') },
      ],
    });
    const result = normalizeContent(singlePage([input])).pages[0].blocks[0];
    expect(result.kind).toBe('list');
    if (result.kind === 'list') {
      expect(result.start).toBe(4);
      expect(result.items[0].checked).toBe(true);
      expect(result.items[0].nested?.ordered).toBe(false);
      expect(result.items[1].block.kind).toBe('unsupported');
    }
  });
  test('meaningful descendants of unsupported list items prevent plain-text fallback', () => {
    for (const nested of [
      { children: [{ content: text('nested text') }] },
      {
        orderedListChildren: block('orderedList', {
          children: [
            {
              content: block('future'),
              unorderedListChildren: block('unorderedList', {
                children: [{ content: text('nested text') }],
              }),
            },
          ],
        }),
      },
    ]) {
      const result = normalizeContent(
        singlePage([
          block('unorderedList', {
            children: [{ content: block('future'), ...nested }],
          }),
        ]),
        'Do not hide readable descendants',
      );
      expect(result.fallback).toBeNull();
      expect(result.pages[0].blocks[0].kind).toBe('list');
    }
    expect(
      normalizeContent(
        singlePage([
          block('unorderedList', {
            children: [
              {
                content: block('future'),
                children: [
                  { content: block('html', { html: 'not rendered' }) },
                ],
              },
            ],
          }),
        ]),
        'Use fallback',
      ).fallback,
    ).toBe('Use fallback');
  });
  test('recursive/cyclic lists terminate at the depth cap', () => {
    const children: unknown[] = [];
    children.push({ content: text('nested'), children });
    const result = normalizeContent(
      singlePage([block('unorderedList', { children })]),
    );
    expect(result.truncated).toBe(true);
  });
  test('large articles stop at the global block cap', () => {
    const result = normalizeContent(
      singlePage(Array.from({ length: MAX_BLOCKS + 1 }, () => text('hello'))),
    );
    expect(result.pages[0].blocks.length).toBe(MAX_BLOCKS);
    expect(result.truncated).toBe(true);
  });
  test('depth boundary accepts the last block and replaces only over-depth descendants', () => {
    const nested = (depth: number) => {
      let child: unknown = text('deep text');
      for (let i = 0; i < depth; i++) child = page([child]);
      return singlePage([child, text('sibling')]);
    };
    const leaf = (value: Block): Block =>
      value.kind === 'group' ? leaf(value.blocks[0]) : value;
    const atLimit = normalizeContent(nested(MAX_DEPTH));
    expect(atLimit.truncated).toBe(false);
    expect(leaf(atLimit.pages[0].blocks[0]).kind).toBe('text');
    const overLimit = normalizeContent(nested(MAX_DEPTH + 1));
    expect(overLimit.truncated).toBe(true);
    expect(leaf(overLimit.pages[0].blocks[0])).toMatchObject({
      kind: 'unsupported',
      label: 'Content nesting or size limit reached',
    });
    expect(overLimit.pages[0].blocks[1].kind).toBe('text');
  });
  test('the block budget is shared across list descendants, groups and pages', () => {
    const result = normalizeContent(
      content(
        page([
          page([
            block('unorderedList', {
              children: [
                {
                  content: block('future'),
                  children: [{ content: text('nested') }],
                },
              ],
            }),
          ]),
        ]),
        page(Array.from({ length: MAX_BLOCKS }, () => text('fill'))),
        page([text('past budget')]),
      ),
    );
    // Group + list shell + unsupported item + nested shell + readable descendant.
    expect(result.pages[1].blocks).toHaveLength(MAX_BLOCKS - 5);
    expect(result.pages[2].blocks).toEqual([]);
    expect(result.truncated).toBe(true);
    const exact = normalizeContent(
      singlePage(Array.from({ length: MAX_BLOCKS }, () => text('fill'))),
    );
    expect(exact.pages[0].blocks).toHaveLength(MAX_BLOCKS);
    expect(exact.truncated).toBe(false);
  });
  test('list child limits stop traversal without dropping valid predecessors', () => {
    const result = normalizeContent(
      singlePage([
        block('unorderedList', {
          children: Array.from({ length: MAX_BLOCKS + 1 }, () => ({
            content: text('item'),
          })),
        }),
      ]),
    );
    const list = result.pages[0].blocks[0];
    expect(list.kind).toBe('list');
    if (list.kind !== 'list') throw new Error('Expected list');
    expect(list.items).toHaveLength(MAX_BLOCKS - 1);
    expect(list.items.every((item) => item.block.kind === 'text')).toBe(true);
    expect(result.truncated).toBe(true);
  });
  test('page cap and duplicate source IDs preserve the first safe page target', () => {
    const pages = Array.from({ length: 100 }, (_, index) =>
      page([], { id: index < 2 ? '__proto__' : `page-${index}` }),
    );
    const exact = normalizeContent(content(...pages));
    expect(exact.pages).toHaveLength(100);
    expect(exact.truncated).toBe(false);
    expect(exact.pageLinks.__proto__).toBe(`#${exact.pages[0].id}`);
    expect(Object.getPrototypeOf(exact.pageLinks)).toBeNull();
    expect(new Set(exact.pages.map((page) => page.id)).size).toBe(100);
    const excess = normalizeContent(
      content(...pages, page([], { id: 'discarded' })),
    );
    expect(excess.pages).toHaveLength(100);
    expect(excess.truncated).toBe(true);
    expect(excess.pageLinks.discarded).toBeUndefined();
  });
  test('text at the code-unit cap keeps facets; excess text is clipped and loses stale facets', () => {
    const plaintext = 'x'.repeat(200_000);
    const facets = [
      {
        index: { byteStart: 0, byteEnd: 1 },
        features: [{ $type: 'pub.leaflet.richtext.facet#bold' }],
      },
    ];
    for (const type of ['text', 'header', 'blockquote', 'code']) {
      for (const excess of [false, true]) {
        const result = normalizeContent(
          singlePage([
            block(type, { plaintext: plaintext + (excess ? 'y' : ''), facets }),
          ]),
        );
        expect(result.truncated).toBe(excess);
        const normalized = result.pages[0].blocks[0];
        expect(normalized.kind).toBe(type);
        if (
          normalized.kind === 'text' ||
          normalized.kind === 'header' ||
          normalized.kind === 'blockquote' ||
          normalized.kind === 'code'
        ) {
          expect(normalized.value.plaintext).toBe(plaintext);
          if (normalized.kind !== 'code')
            expect(normalized.value.facets).toHaveLength(excess ? 0 : 1);
        }
      }
    }
  });
  test('gallery and drawing resource caps retain bounded valid geometry and siblings', () => {
    const image = {
      $type: 'blob',
      ref: { $link: `bafkrei${'a'.repeat(52)}` },
      mimeType: 'image/png',
      size: 100,
    };
    for (const excess of [0, 1]) {
      const stroke = {
        color: 'primary',
        size: 2,
        points: Array(12_000 + excess).fill(0),
      };
      const result = normalizeContent(
        singlePage([
          block('imageGallery', {
            images: Array(100 + excess).fill({
              image,
              aspectRatio: { width: 16, height: 9 },
              alt: 'Image',
            }),
          }),
          block('drawing', {
            viewBox: { x: 0, y: 0, width: 100, height: 100 },
            strokes: [
              stroke,
              ...Array(249 + excess).fill({ ...stroke, points: [0, 0, 500] }),
            ],
            fills: Array(250 + excess).fill({
              color: 'primary',
              points: [0, 0, 1, 1],
            }),
          }),
          text('sibling'),
        ]),
      );
      const [gallery, drawing, sibling] = result.pages[0].blocks;
      expect(gallery.kind).toBe('imageGallery');
      expect(drawing.kind).toBe('drawing');
      if (gallery.kind === 'imageGallery')
        expect(gallery.value.images).toHaveLength(100);
      if (drawing.kind === 'drawing') {
        expect(drawing.value.strokes).toHaveLength(250);
        expect(drawing.value.strokes[0].points).toHaveLength(12_000);
        expect(drawing.value.fills).toHaveLength(250);
      }
      expect(sibling.kind).toBe('text');
    }
  });
  test('canvas groups are flattened into ordered flow and page IDs are safe', () => {
    const canvas = {
      $type: 'pub.leaflet.pages.canvas',
      id: '__proto__',
      blocks: [
        { x: 10, y: 20, width: 200, block: page([text('canvas text')]) },
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
      ...singlePage([text('decoded')]),
      blobPages: { arbitrary: 'metadata' },
    };
    expect(normalizeContent(input).pages[0].blocks[0].kind).toBe('text');
  });
  test('HTML remains a validated non-renderable block and never becomes markup', () => {
    expect(
      normalizeContent(
        singlePage([block('html', { html: '<script>bad()</script>' })]),
        'fallback',
      ).fallback,
    ).toBe('fallback');
  });
});
