// @ts-ignore Bun supplies test/runtime modules without app-wide ambient types.
import { expect, test } from 'bun:test';
import { DID } from '../constants';
import { isHomeBluesky } from '../bluesky';
import { isolatedModule } from '../testing';
import {
  fetchHomeBluesky,
  HOME_BLUESKY_MAX_BYTES,
  HOME_BLUESKY_TIMEOUT_MS,
} from './bluesky';

const cid = 'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4';
const uri = `at://${DID}/app.bsky.feed.post/3m4omtcysns2i`;
const createdAt = '2025-11-02T23:09:58.075Z';
const post = {
  uri,
  cid,
  author: {
    did: DID,
    handle: 'eliza.vg',
    displayName: 'Eliza',
    viewer: { muted: true },
    status: { private: true },
  },
  record: { $type: 'app.bsky.feed.post', text: 'Pinned 🙂', createdAt },
  likeCount: 4,
  repostCount: 2,
  replyCount: 1,
  indexedAt: createdAt,
  viewer: { like: 'private' },
};
const pin = { post, reason: { $type: 'app.bsky.feed.defs#reasonPin' } };
const feed = {
  feed: [
    { post: { ...post, uri: uri.replace('3m4omtcysns2i', '3m4omt5rj5c2i') } },
    pin,
  ],
};

function mockFetch(
  respond: (init?: RequestInit) => Response | Promise<Response>,
) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return respond(init);
  };
  return { fetcher, calls };
}

function streamResponse(
  chunks: Uint8Array[],
  headers?: HeadersInit,
  hang = false,
) {
  let cancelled = false;
  let index = 0;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index < chunks.length) controller.enqueue(chunks[index++]);
        else if (!hang) controller.close();
      },
      cancel() {
        cancelled = true;
      },
    }),
    { headers },
  );
  return { response, cancelled: () => cancelled };
}
const bytes = (value: string) => new TextEncoder().encode(value);

test('one fixed credential-free author-feed request projects only the owner pin from a two-item response', async () => {
  const { fetcher, calls } = mockFetch(() => Response.json(feed));
  const result = await fetchHomeBluesky(fetcher);
  expect(result).toEqual({
    profile: { displayName: 'Eliza' },
    pinned: { uri, text: post.record.text, createdAt },
    counts: { likeCount: 4, repostCount: 2, replyCount: 1 },
    handle: 'eliza.vg',
  });
  expect(isHomeBluesky(result)).toBe(true);
  expect(calls).toHaveLength(1);
  const url = new URL(calls[0].url);
  expect(url.origin).toBe('https://public.api.bsky.app');
  expect(url.pathname).toBe('/xrpc/app.bsky.feed.getAuthorFeed');
  expect([...url.searchParams]).toEqual([
    ['actor', DID],
    ['filter', 'posts_no_replies'],
    ['includePins', 'true'],
    ['limit', '1'],
  ]);
  expect(calls[0].init).toMatchObject({
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'omit',
    redirect: 'error',
  });
  expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
  for (const field of [
    'viewer',
    'status',
    'indexedAt',
    'cid',
    'author',
    'private',
  ])
    expect(JSON.stringify(result)).not.toContain(field);
  expect(HOME_BLUESKY_TIMEOUT_MS).toBe(2_500);
  expect(HOME_BLUESKY_MAX_BYTES).toBe(512 * 1024);
});

test('a bounded feed can contain a large nested quote which is never projected', async () => {
  const { fetcher } = mockFetch(() =>
    Response.json({
      feed: [
        feed.feed[0],
        {
          ...pin,
          post: {
            ...post,
            embed: {
              $type: 'app.bsky.embed.record#view',
              record: {
                $type: 'app.bsky.embed.record#viewRecord',
                uri,
                value: { text: 'nested private'.repeat(10_000) },
              },
            },
          },
        },
      ],
    }),
  );
  const result = await fetchHomeBluesky(fetcher);
  expect(result?.pinned.text).toBe(post.record.text);
  expect(JSON.stringify(result)).not.toContain('nested');
});

test('no pin, invalid owner/author/record and malformed envelopes fail closed without extra PDS requests', async () => {
  for (const value of [
    null,
    [],
    {},
    { feed: null },
    { feed: [] },
    { feed: [feed.feed[0]] },
    {
      feed: [{ ...pin, reason: { $type: 'app.bsky.feed.defs#reasonRepost' } }],
    },
    {
      feed: [
        { ...pin, post: { ...post, uri: uri.replace(DID, 'did:plc:foreign') } },
      ],
    },
    {
      feed: [
        {
          ...pin,
          post: { ...post, author: { ...post.author, did: 'did:plc:foreign' } },
        },
      ],
    },
    {
      feed: [
        {
          ...pin,
          post: { ...post, record: { ...post.record, createdAt: 'bad' } },
        },
      ],
    },
  ]) {
    const { fetcher, calls } = mockFetch(() => Response.json(value));
    expect(await fetchHomeBluesky(fetcher)).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0].init?.signal?.aborted).toBe(true);
  }
});

test('network, HTTP, malformed JSON/UTF-8 and broken body streams are contained', async () => {
  const responses = [
    () => {
      throw new TypeError('Network unavailable');
    },
    () => new Response('private upstream error', { status: 503 }),
    () => new Response('{bad'),
    () => new Response(),
    () => new Response(new Uint8Array([0xc3, 0x28])),
    () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new Error('Broken stream'));
          },
        }),
      ),
  ];
  for (const respond of responses) {
    const { fetcher, calls } = mockFetch(respond);
    expect(await fetchHomeBluesky(fetcher)).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0].init?.signal?.aborted).toBe(true);
  }
});

test('redirects and already-redirected responses are rejected and their bodies cancelled', async () => {
  for (const redirected of [false, true]) {
    const body = streamResponse([bytes('not read')], undefined, true);
    const response = redirected
      ? body.response
      : new Response(body.response.body, {
          status: 302,
          headers: { Location: 'https://evil.example/private' },
        });
    if (redirected)
      Object.defineProperty(response, 'redirected', { value: true });
    const { fetcher, calls } = mockFetch(() => response);
    expect(await fetchHomeBluesky(fetcher)).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0].init?.redirect).toBe('error');
    expect(body.cancelled()).toBe(true);
  }
});

test('deadline aborts a stalled fetch even if the injected fetcher ignores its signal, and cancels late responses', async () => {
  let resolve!: (value: Response) => void;
  const { fetcher, calls } = mockFetch(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      }),
  );
  const result = await fetchHomeBluesky(fetcher, { timeoutMs: 15 });
  expect(result).toBeNull();
  expect(calls[0].init?.signal?.aborted).toBe(true);
  const late = streamResponse([bytes('late')], undefined, true);
  resolve(late.response);
  await new Promise((done) => setTimeout(done, 0));
  expect(late.cancelled()).toBe(true);
});

test('one deadline bounds fetch plus body reading, cancelling a stalled body', async () => {
  const body = streamResponse([bytes('{"feed":[')], undefined, true);
  const { fetcher, calls } = mockFetch(async () => {
    await new Promise((done) => setTimeout(done, 5));
    return body.response;
  });
  expect(await fetchHomeBluesky(fetcher, { timeoutMs: 20 })).toBeNull();
  expect(calls[0].init?.signal?.aborted).toBe(true);
  expect(body.cancelled()).toBe(true);
});

test('caller cancellation aborts pending fetches/body reads; an already-aborted request never fetches', async () => {
  const before = new AbortController();
  before.abort();
  const skipped = mockFetch(() => Response.json(feed));
  expect(
    await fetchHomeBluesky(skipped.fetcher, { signal: before.signal }),
  ).toBeNull();
  expect(skipped.calls).toHaveLength(0);
  for (const pendingBody of [false, true]) {
    const controller = new AbortController();
    const body = streamResponse([bytes('{')], undefined, true);
    const { fetcher, calls } = mockFetch(() =>
      pendingBody ? body.response : new Promise<Response>(() => {}),
    );
    const operation = fetchHomeBluesky(fetcher, { signal: controller.signal });
    await new Promise((done) => setTimeout(done, 0));
    controller.abort();
    expect(await operation).toBeNull();
    expect(calls[0].init?.signal).not.toBe(controller.signal);
    expect(calls[0].init?.signal?.aborted).toBe(true);
    if (pendingBody) expect(body.cancelled()).toBe(true);
  }
});

test('streamed decoded bytes, not content-length or character count, enforce the size limit', async () => {
  const headerVariants: (HeadersInit | undefined)[] = [
    undefined,
    { 'Content-Length': '1' },
    { 'Content-Encoding': 'gzip' },
  ];
  for (const headers of headerVariants) {
    const body = streamResponse(
      [bytes('🙂'.repeat(33)), bytes('not read')],
      headers,
      true,
    );
    const { fetcher, calls } = mockFetch(() => body.response);
    expect(await fetchHomeBluesky(fetcher, { maxBytes: 128 })).toBeNull();
    expect(body.cancelled()).toBe(true);
    expect(calls[0].init?.signal?.aborted).toBe(true);
  }
  const oversized = streamResponse(
    [new Uint8Array(HOME_BLUESKY_MAX_BYTES + 1)],
    undefined,
    true,
  );
  expect(
    await fetchHomeBluesky(mockFetch(() => oversized.response).fetcher),
  ).toBeNull();
  expect(oversized.cancelled()).toBe(true);
});

test('oversized declared bodies are cancelled before reading, while exact-limit split UTF-8 JSON succeeds', async () => {
  const tooLarge = streamResponse(
    [],
    { 'Content-Length': String(HOME_BLUESKY_MAX_BYTES + 1) },
    true,
  );
  expect(
    await fetchHomeBluesky(mockFetch(() => tooLarge.response).fetcher),
  ).toBeNull();
  expect(tooLarge.cancelled()).toBe(true);
  const encoded = bytes(JSON.stringify(feed));
  const emoji = encoded.findIndex((byte) => byte === 0xf0);
  const body = streamResponse([
    encoded.slice(0, emoji + 1),
    encoded.slice(emoji + 1),
  ]);
  const result = await fetchHomeBluesky(
    mockFetch(() => body.response).fetcher,
    { maxBytes: encoded.byteLength },
  );
  expect(result?.pinned.text).toBe(post.record.text);
});

interface RouteModule {
  GET(event: {
    fetch: typeof fetch;
    request: Request;
    url: URL;
  }): Promise<Response>;
}
async function routeModule(dev = false): Promise<RouteModule> {
  const { module } = await isolatedModule(
    new URL('../../routes/api/atproto/home/+server.ts', import.meta.url),
    { virtual: { '$app/environment': `export const dev = ${dev};` } },
  );
  return module as RouteModule;
}
function request(fetcher: typeof fetch, signal?: AbortSignal) {
  const url = new URL(
    'https://jeanmachine.dev/api/atproto/home?actor=did:plc:foreign&url=https://evil.example&limit=100',
  );
  return {
    fetch: fetcher,
    request: new Request(url, {
      signal,
      headers: { Cookie: 'private=secret', Authorization: 'Bearer secret' },
    }),
    url,
  };
}

test('route uses request fetch, ignores caller parameters/credentials, and returns only public JSON cached for 60 seconds', async () => {
  const route = await routeModule();
  const { fetcher, calls } = mockFetch(() => Response.json(feed));
  const response = await route.GET(request(fetcher));
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  expect(response.headers.get('Content-Type')).toContain('application/json');
  expect(isHomeBluesky(await response.json())).toBe(true);
  expect(calls).toHaveLength(1);
  expect(new URL(calls[0].url).searchParams.get('actor')).toBe(DID);
  expect(calls[0].init?.credentials).toBe('omit');
  expect(calls[0].init?.headers).toEqual({ Accept: 'application/json' });
});

test('development success is no-store and every upstream/no-pin/malformed/redirect failure is non-OK no-store JSON', async () => {
  const dev = await routeModule(true);
  const production = await routeModule();
  const ok = await dev.GET(
    request(mockFetch(() => Response.json(feed)).fetcher),
  );
  expect(ok.ok).toBe(true);
  expect(ok.headers.get('Cache-Control')).toBe('no-store');
  for (const route of [dev, production]) {
    for (const respond of [
      () => {
        throw new TypeError('Network failure with private upstream details');
      },
      () => Response.json({ feed: [] }),
      () => new Response('{bad'),
      () => new Response('private', { status: 503 }),
      () =>
        new Response(null, {
          status: 302,
          headers: { Location: 'https://evil.example' },
        }),
      () => new Response(new Uint8Array(HOME_BLUESKY_MAX_BYTES + 1)),
    ]) {
      const { fetcher, calls } = mockFetch(respond);
      const response = await route.GET(request(fetcher));
      expect(response.ok).toBe(false);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('Content-Type')).toContain(
        'application/json',
      );
      expect(await response.json()).toEqual({
        error: 'Bluesky feed unavailable',
      });
      expect(calls).toHaveLength(1);
    }
  }
});

test('route passes request cancellation to the child deadline without returning SSR error HTML', async () => {
  const route = await routeModule();
  const controller = new AbortController();
  const { fetcher, calls } = mockFetch(() => new Promise<Response>(() => {}));
  const operation = route.GET(request(fetcher, controller.signal));
  controller.abort();
  const response = await operation;
  expect(response.ok).toBe(false);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({ error: 'Bluesky feed unavailable' });
  expect(calls[0].init?.signal?.aborted).toBe(true);
});
