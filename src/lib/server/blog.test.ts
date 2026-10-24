// @ts-expect-error Bun's built-in test module is only needed by `bun test`, not the app.
import { describe, expect, test } from 'bun:test';
import { DID, PDS_URL, PUB_RKEY } from '../constants';
import { normalizeContent as normalizeArticleContent } from '../blog/normalize';
import { loadBlogArticle } from './blog';

const RKEY = '3lwddhdcemk2l';
const PUBLICATION_URI = `at://${DID}/site.standard.publication/${PUB_RKEY}`;
const CID = 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';
const publication = {
  $type: 'site.standard.publication',
  name: 'Fixture publication',
  url: 'https://example.com/writing',
};
const pages = [
  {
    $type: 'pub.leaflet.pages.linearDocument',
    id: 'page-one',
    blocks: [
      {
        block: {
          $type: 'pub.leaflet.blocks.text',
          plaintext: 'Hello from a native article.',
        },
      },
    ],
  },
];
const document = {
  $type: 'site.standard.document',
  site: PUBLICATION_URI,
  title: 'Fixture article',
  description: 'A fixture description.',
  publishedAt: '2026-10-20T12:00:00.000Z',
  updatedAt: '2026-10-21T12:00:00.000Z',
  path: '/fixture',
  textContent: 'Hello from a native article.',
  content: { $type: 'pub.leaflet.content', pages },
};
const blob = {
  $type: 'blob',
  ref: { $link: CID },
  mimeType: 'application/json',
  size: 256,
};

function record(value: unknown, collection = 'site.standard.document') {
  return Response.json({
    uri: `at://${DID}/${collection}/${RKEY}`,
    cid: CID,
    value,
  });
}

function mockPds(
  responses: Array<Response | (() => Response | Promise<Response>)>,
) {
  const calls: Array<{ url: URL; init: RequestInit | undefined }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({
      url: new URL(input instanceof Request ? input.url : input.toString()),
      init,
    });
    const response = responses[calls.length - 1];
    if (!response) throw new Error('Unexpected extra PDS request');
    return typeof response === 'function' ? response() : response;
  };
  return { fetcher, calls };
}

function fixturePds(
  article: unknown = document,
  pub: unknown = publication,
  extra: Response[] = [],
) {
  return mockPds([
    record(article),
    record(pub, 'site.standard.publication'),
    ...extra,
  ]);
}

async function expectFailure(
  operation: Promise<unknown>,
  status: number,
  message: string,
) {
  let failure: unknown;
  try {
    await operation;
  } catch (cause) {
    failure = cause;
  }
  expect(failure).toMatchObject({ status, body: { message } });
}

describe('loadBlogArticle', () => {
  test('loads validated inline content with request-supplied fetch', async () => {
    const { fetcher, calls } = fixturePds();
    const result = await loadBlogArticle(fetcher, RKEY);
    expect(result).toEqual({ document, publication, rkey: RKEY });
    expect(calls).toHaveLength(2);
    for (const { url, init } of calls) {
      expect(url.origin).toBe(PDS_URL);
      expect(url.pathname).toBe('/xrpc/com.atproto.repo.getRecord');
      expect(url.searchParams.get('repo')).toBe(DID);
      expect(init?.redirect).toBe('error');
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
    expect(calls[0].url.searchParams.get('collection')).toBe(
      'site.standard.document',
    );
    expect(calls[0].url.searchParams.get('rkey')).toBe(RKEY);
    expect(calls[1].url.searchParams.get('collection')).toBe(
      'site.standard.publication',
    );
    expect(calls[1].url.searchParams.get('rkey')).toBe(PUB_RKEY);
  });

  for (const rkey of [
    '',
    'fixture-slug',
    '../record',
    'z234567abcdef',
    '1234567890123',
  ]) {
    test(`rejects invalid document TID ${JSON.stringify(rkey)} before fetching`, async () => {
      const { fetcher, calls } = mockPds([]);
      await expectFailure(
        loadBlogArticle(fetcher, rkey),
        404,
        'Document not found',
      );
      expect(calls).toHaveLength(0);
    });
  }

  for (const status of [400, 404]) {
    test(`maps missing records (HTTP ${status}) to 404`, async () => {
      const { fetcher } = mockPds([
        Response.json({ error: 'RecordNotFound' }, { status }),
      ]);
      await expectFailure(
        loadBlogArticle(fetcher, RKEY),
        404,
        'Document record not found',
      );
    });
  }

  test('does not turn unrelated HTTP 400 errors into missing records', async () => {
    const { fetcher } = mockPds([
      Response.json({ error: 'InvalidRequest' }, { status: 400 }),
    ]);
    await expectFailure(
      loadBlogArticle(fetcher, RKEY),
      502,
      'Upstream Document record request failed (HTTP 400)',
    );
  });

  test('distinguishes upstream HTTP failures from malformed JSON', async () => {
    const { fetcher } = mockPds([new Response('Unavailable', { status: 503 })]);
    await expectFailure(
      loadBlogArticle(fetcher, RKEY),
      502,
      'Upstream Document record request failed (HTTP 503)',
    );
    const malformed = mockPds([new Response('not JSON')]);
    await expectFailure(
      loadBlogArticle(malformed.fetcher, RKEY),
      502,
      'Malformed JSON in upstream Document record',
    );
  });

  test('reports network failures as upstream failures', async () => {
    const { fetcher } = mockPds([
      () => {
        throw new TypeError('Network unavailable');
      },
    ]);
    await expectFailure(
      loadBlogArticle(fetcher, RKEY),
      502,
      'Unable to read upstream Document record',
    );
  });

  test('rejects malformed record envelopes and invalid document values', async () => {
    const malformed = mockPds([Response.json({ value: document })]);
    await expectFailure(
      loadBlogArticle(malformed.fetcher, RKEY),
      502,
      'Malformed upstream Document record envelope',
    );
    const invalid = fixturePds({ ...document, publishedAt: 'yesterday' });
    await expectFailure(
      loadBlogArticle(invalid.fetcher, RKEY),
      502,
      'Malformed upstream site.standard.document record',
    );
  });

  test('rejects another publication before fetching publication/blob data', async () => {
    const { fetcher, calls } = fixturePds({
      ...document,
      site: `at://${DID}/site.standard.publication/3lwddhdcemk2m`,
    });
    await expectFailure(
      loadBlogArticle(fetcher, RKEY),
      404,
      'Document not found in this publication',
    );
    expect(calls).toHaveLength(1);
  });

  test('validates publication records', async () => {
    const { fetcher } = fixturePds(document, { ...publication, name: 42 });
    await expectFailure(
      loadBlogArticle(fetcher, RKEY),
      502,
      'Malformed upstream site.standard.publication record',
    );
  });

  test('handles a missing configured publication', async () => {
    const { fetcher } = mockPds([
      record(document),
      Response.json({ error: 'RecordNotFound' }, { status: 400 }),
    ]);
    await expectFailure(
      loadBlogArticle(fetcher, RKEY),
      404,
      'Publication record not found',
    );
  });

  test('accepts a loose document only for the exact publication URL', async () => {
    const valid = fixturePds({ ...document, site: publication.url });
    expect((await loadBlogArticle(valid.fetcher, RKEY)).document.site).toBe(
      publication.url,
    );
    for (const site of [
      `${publication.url}/`,
      'https://example.com/writing-elsewhere',
      'https://unrelated.example',
    ]) {
      const { fetcher } = fixturePds({ ...document, site });
      await expectFailure(
        loadBlogArticle(fetcher, RKEY),
        404,
        'Document not found in this publication',
      );
    }
  });

  test('preserves unknown formats and textContent for renderer fallback', async () => {
    const article = {
      ...document,
      content: { $type: 'example.future.content', opaque: ['preserved'] },
    };
    const { fetcher, calls } = fixturePds(article);
    expect((await loadBlogArticle(fetcher, RKEY)).document).toEqual(article);
    expect(calls).toHaveLength(2);
  });

  test('supports documents with only plain text', async () => {
    const { content: _, ...article } = document;
    const { fetcher } = fixturePds(article);
    expect((await loadBlogArticle(fetcher, RKEY)).document).toEqual(article);
  });

  test('rejects unsafe publication URLs for loose membership', async () => {
    for (const url of [
      'javascript:alert(1)',
      'https://user:pass@example.com',
      'https://example.com/?q=1',
      'https://example.com/#fragment',
    ]) {
      const { fetcher } = fixturePds(
        { ...document, site: url },
        { ...publication, url },
      );
      await expectFailure(
        loadBlogArticle(fetcher, RKEY),
        404,
        'Document not found in this publication',
      );
    }
  });

  test('enforces record response byte limits without trusting Content-Length', async () => {
    const declared = mockPds([
      new Response('{}', { headers: { 'Content-Length': '1000001' } }),
    ]);
    await expectFailure(
      loadBlogArticle(declared.fetcher, RKEY),
      502,
      'Upstream Document record exceeds the response size limit',
    );
    const streamed = mockPds([new Response(' '.repeat(1_000_001))]);
    await expectFailure(
      loadBlogArticle(streamed.fetcher, RKEY),
      502,
      'Upstream Document record exceeds the response size limit',
    );
  });

  test('bounds JSON depth even for unknown content', async () => {
    let nested: unknown = null;
    for (let index = 0; index < 70; index++) nested = { child: nested };
    const { fetcher } = fixturePds({
      ...document,
      content: { $type: 'example.future.content', nested },
    });
    await expectFailure(
      loadBlogArticle(fetcher, RKEY),
      502,
      'Upstream Document record exceeds JSON complexity limits',
    );
  });

  test('rejects malformed UTF-8 instead of replacing invalid bytes', async () => {
    const { fetcher } = mockPds([new Response(new Uint8Array([0xff]))]);
    await expectFailure(
      loadBlogArticle(fetcher, RKEY),
      502,
      'Malformed UTF-8 in upstream Document record',
    );
  });

  test('bounds JSON breadth before queuing an oversized traversal', async () => {
    const { fetcher } = fixturePds({
      ...document,
      content: {
        $type: 'example.future.content',
        values: Array(100_001).fill(0),
      },
    });
    await expectFailure(
      loadBlogArticle(fetcher, RKEY),
      502,
      'Upstream Document record exceeds JSON complexity limits',
    );
  });

  test('bounds fetches and stalled response bodies, cancelling reads on timeout', async () => {
    const waiting = mockPds([() => new Promise<Response>(() => {})]);
    let cancelled = false;
    const stalled = mockPds([
      new Response(
        new ReadableStream<Uint8Array>({
          cancel() {
            cancelled = true;
          },
        }),
      ),
    ]);
    await Promise.all(
      [waiting, stalled].map(({ fetcher }) =>
        expectFailure(
          loadBlogArticle(fetcher, RKEY),
          502,
          'Upstream Document record timed out',
        ),
      ),
    );
    expect(waiting.calls[0].init?.signal?.aborted).toBe(true);
    expect(cancelled).toBe(true);
  }, 10_000);
});

describe('Leaflet blobPages', () => {
  test('retrieves owned PDS JSON and replaces inline stubs', async () => {
    const { fetcher, calls } = fixturePds(
      {
        ...document,
        content: {
          $type: 'pub.leaflet.content',
          blobPages: blob,
          pages: [{ $type: 'pub.leaflet.pages.linearDocument', blocks: [] }],
        },
      },
      publication,
      [Response.json(pages)],
    );
    const result = await loadBlogArticle(fetcher, RKEY);
    expect(result.document.content).toEqual(document.content);
    expect(result.document.content).not.toHaveProperty('blobPages');
    expect(calls).toHaveLength(3);
    expect(calls[2].url.origin).toBe(PDS_URL);
    expect(calls[2].url.pathname).toBe('/xrpc/com.atproto.sync.getBlob');
    expect(calls[2].url.searchParams.get('did')).toBe(DID);
    expect(calls[2].url.searchParams.get('cid')).toBe(CID);
  });

  test('ignores malformed inline pages when authoritative blobPages exists', async () => {
    const { fetcher } = fixturePds(
      {
        ...document,
        content: { $type: 'pub.leaflet.content', blobPages: blob, pages: null },
      },
      publication,
      [Response.json(pages)],
    );
    expect((await loadBlogArticle(fetcher, RKEY)).document.content).toEqual(
      document.content,
    );
  });

  test('supports legacy owned blob references', async () => {
    const { fetcher, calls } = fixturePds(
      {
        ...document,
        content: {
          $type: 'pub.leaflet.content',
          blobPages: { cid: CID, mimeType: 'application/json' },
          pages: [],
        },
      },
      publication,
      [Response.json(pages)],
    );
    expect((await loadBlogArticle(fetcher, RKEY)).document.content).toEqual(
      document.content,
    );
    expect(calls[2].url.searchParams.get('cid')).toBe(CID);
  });

  test('rejects inline content without a page array', async () => {
    for (const pages of [undefined, null, false, {}]) {
      const { fetcher } = fixturePds({
        ...document,
        content: { $type: 'pub.leaflet.content', pages },
      });
      await expectFailure(
        loadBlogArticle(fetcher, RKEY),
        502,
        'Malformed upstream Leaflet content: expected a page array',
      );
    }
  });

  test('validates blob MIME type and declared size before downloading', async () => {
    for (const blobPages of [
      { ...blob, mimeType: 'text/html' },
      { ...blob, size: 5_000_001 },
      { ...blob, size: -1 },
      { ...blob, ref: { $link: 'not-a-cid' } },
      { cid: 'not-a-cid', mimeType: 'application/json' },
      null,
      false,
    ]) {
      const { fetcher, calls } = fixturePds({
        ...document,
        content: { $type: 'pub.leaflet.content', blobPages, pages: [] },
      });
      await expectFailure(
        loadBlogArticle(fetcher, RKEY),
        502,
        'Malformed upstream Leaflet content',
      );
      expect(calls).toHaveLength(2);
    }
  });

  test('rejects malformed JSON and invalid decoded page arrays', async () => {
    for (const [response, message] of [
      [
        new Response('invalid'),
        'Malformed JSON in upstream Leaflet pages blob',
      ],
      [
        Response.json({ pages }),
        'Malformed upstream Leaflet pages blob: expected a page array',
      ],
      [
        Response.json(null),
        'Malformed upstream Leaflet pages blob: expected a page array',
      ],
    ] as const) {
      const { fetcher } = fixturePds(
        {
          ...document,
          content: { $type: 'pub.leaflet.content', blobPages: blob, pages: [] },
        },
        publication,
        [response],
      );
      await expectFailure(loadBlogArticle(fetcher, RKEY), 502, message);
    }
  });

  test('a missing blob is an upstream failure, not a missing article', async () => {
    const { fetcher } = fixturePds(
      {
        ...document,
        content: { $type: 'pub.leaflet.content', blobPages: blob, pages: [] },
      },
      publication,
      [new Response('not found', { status: 404 })],
    );
    await expectFailure(
      loadBlogArticle(fetcher, RKEY),
      502,
      'Upstream Leaflet pages blob request failed (HTTP 404)',
    );
  });

  test('enforces the actual blob response byte limit', async () => {
    const { fetcher } = fixturePds(
      {
        ...document,
        content: { $type: 'pub.leaflet.content', blobPages: blob, pages: [] },
      },
      publication,
      [new Response(' '.repeat(5_000_001))],
    );
    await expectFailure(
      loadBlogArticle(fetcher, RKEY),
      502,
      'Upstream Leaflet pages blob exceeds the response size limit',
    );
  });
});

describe('loader to tolerant renderer integration', () => {
  const text = (plaintext: string, extra = {}) => ({
    $type: 'pub.leaflet.blocks.text',
    plaintext,
    ...extra,
  });
  const linear = (blocks: unknown[]) => ({
    $type: 'pub.leaflet.pages.linearDocument',
    blocks: blocks.map((block) => ({ block })),
  });

  for (const transport of ['inline', 'blob'] as const) {
    async function loadPages(pages: unknown[]) {
      const { fetcher } = fixturePds(
        {
          ...document,
          content:
            transport === 'inline'
              ? { $type: 'pub.leaflet.content', pages }
              : { $type: 'pub.leaflet.content', blobPages: blob, pages: null },
        },
        publication,
        transport === 'blob' ? [Response.json(pages)] : [],
      );
      const result = await loadBlogArticle(fetcher, RKEY);
      expect(result.document.content).toEqual({
        $type: 'pub.leaflet.content',
        pages,
      });
      return normalizeArticleContent(
        result.document.content,
        result.document.textContent,
      );
    }

    test(`${transport}: a bad known image does not hide valid siblings`, async () => {
      const normalized = await loadPages([
        linear([
          text('before'),
          { $type: 'pub.leaflet.blocks.image', image: 'not-a-blob' },
          text('after'),
        ]),
      ]);
      expect(normalized.pages[0].blocks.map((block) => block.kind)).toEqual([
        'text',
        'unsupported',
        'text',
      ]);
      expect(normalized.pages[0].blocks[0]).toMatchObject({
        value: { plaintext: 'before' },
      });
      expect(normalized.pages[0].blocks[2]).toMatchObject({
        value: { plaintext: 'after' },
      });
      expect(normalized.fallback).toBeNull();
    });

    test(`${transport}: malformed facets do not erase text or its siblings`, async () => {
      const normalized = await loadPages([
        linear([
          text('before'),
          text('still readable', { facets: [{ index: null, features: [] }] }),
          text('after'),
        ]),
      ]);
      expect(normalized.pages[0].blocks.map((block) => block.kind)).toEqual([
        'text',
        'text',
        'text',
      ]);
      expect(normalized.pages[0].blocks[1]).toMatchObject({
        value: { plaintext: 'still readable', facets: [] },
      });
      expect(normalized.fallback).toBeNull();
    });

    test(`${transport}: ignored canvas geometry does not block ordered text`, async () => {
      const normalized = await loadPages([
        {
          $type: 'pub.leaflet.pages.canvas',
          id: 'canvas',
          theme: { deliberately: 'invalid' },
          blocks: [
            {
              x: 'invalid',
              y: null,
              width: { invalid: true },
              block: linear([
                text('before'),
                text('canvas text'),
                text('after'),
              ]),
            },
          ],
        },
      ]);
      expect(normalized.pages[0].canvas).toBe(true);
      const group = normalized.pages[0].blocks[0];
      expect(group.kind).toBe('group');
      if (group.kind === 'group') {
        expect(group.blocks).toMatchObject([
          { kind: 'text', value: { plaintext: 'before' } },
          { kind: 'text', value: { plaintext: 'canvas text' } },
          { kind: 'text', value: { plaintext: 'after' } },
        ]);
      }
      expect(normalized.fallback).toBeNull();
    });

    test(`${transport}: malformed known pages leave valid pages renderable`, async () => {
      const normalized = await loadPages([
        { $type: 'pub.leaflet.pages.linearDocument', blocks: false },
        linear([text('valid sibling page')]),
      ]);
      expect(normalized.pages[1].blocks[0]).toMatchObject({
        kind: 'text',
        value: { plaintext: 'valid sibling page' },
      });
      expect(normalized.fallback).toBeNull();
    });

    test(`${transport}: unknown pages reach the renderer's text fallback`, async () => {
      const normalized = await loadPages([
        { $type: 'example.future.page', opaque: 'preserved' },
      ]);
      expect(normalized.pages).toEqual([]);
      expect(normalized.fallback).toBe(document.textContent);
    });
  }
});
