// @ts-ignore Bun supplies test/runtime modules without app-wide ambient types.
import { expect, test } from 'bun:test';
import { useFetchMock } from '../testing';
import { GET as blob } from '../../routes/api/atproto/blob/+server';
import { GET as record } from '../../routes/api/atproto/record/+server';
import { GET as list } from '../../routes/api/atproto/listRecords/+server';
import { GET as metaImage } from '../../routes/api/meta-image/+server';
import { DID, PDS_URL, PUB_RKEY } from '../constants';

const fetchMock = useFetchMock();
function upstream(
  respond: (url: URL, init?: RequestInit) => Response | Promise<Response>,
) {
  return fetchMock((url, init) => respond(new URL(url), init));
}
function request(
  handler: typeof blob | typeof record | typeof list | typeof metaImage,
  params: Record<string, string> = {},
) {
  const url = new URL('https://jeanmachine.dev/api/test');
  url.search = new URLSearchParams(params).toString();
  // These handlers read only url; omit the unrelated, route-specific event fields.
  const invoke = handler as (event: { url: URL }) => ReturnType<typeof blob>;
  return invoke({ url });
}
const cid = 'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4';
const icon = {
  $type: 'blob',
  ref: { $link: cid },
  mimeType: 'image/png',
  size: 4,
};
function publication(value: unknown = { ...icon }) {
  return Response.json({
    value: {
      $type: 'site.standard.publication',
      name: 'Test publication',
      url: 'https://jeanmachine.dev',
      ...(value === undefined ? {} : { icon: value }),
    },
  });
}

test('blob query values cannot inject upstream parameters; binary bytes, MIME and cache survive', async () => {
  const value = 'cid&did=evil +?#/';
  const bytes = new Uint8Array([0, 255, 1, 128]);
  const mock = upstream((url) => {
    expect(url.origin).toBe(PDS_URL);
    expect(url.pathname).toBe('/xrpc/com.atproto.sync.getBlob');
    expect([...url.searchParams]).toEqual([
      ['did', DID],
      ['cid', value],
    ]);
    return new Response(bytes, { headers: { 'Content-Type': 'image/webp' } });
  });
  const response = await request(blob, { cid: value, mimetype: 'image/png' });
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  expect(response.headers.get('content-type')).toBe('image/webp');
  expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
  expect(mock).toHaveBeenCalledTimes(1);
});

test('blob without upstream MIME uses authored MIME or octet-stream, never literal null', async () => {
  upstream(() => new Response(new Uint8Array([1])));
  for (const [params, expected] of [
    [{ cid, mimetype: 'image/png' }, 'image/png'],
    [{ cid }, 'application/octet-stream'],
    [{ cid, mimetype: '' }, 'application/octet-stream'],
  ] as const) {
    expect((await request(blob, params)).headers.get('content-type')).toBe(
      expected,
    );
  }
});

test('missing proxy parameters fail before fetching', async () => {
  const mock = upstream(() => {
    throw new Error('Unexpected fetch');
  });
  for (const [handler, params] of [
    [blob, {}],
    [record, {}],
    [record, { collection: 'test.collection' }],
    [record, { rkey: 'key' }],
    [list, {}],
  ] as const) {
    await expect(request(handler, params)).rejects.toMatchObject({
      status: 400,
    });
  }
  expect(mock).not.toHaveBeenCalled();
});

for (const [name, handler, params, method, data] of [
  [
    'record',
    record,
    { collection: 'test.collection&repo=other', rkey: 'key +?&#/' },
    'getRecord',
    { value: { title: 'Untouched' }, cid: 'opaque' },
  ],
  [
    'list',
    list,
    {
      collection: 'test.collection&repo=other',
      cursor: 'cursor +?&#/',
      limit: '5&limit=9',
    },
    'listRecords',
    { records: [], cursor: 'opaque' },
  ],
] as const) {
  test(`${name} encodes each query value and preserves JSON/cache without strict blog validation`, async () => {
    upstream((url, init) => {
      expect(url.origin).toBe(PDS_URL);
      expect(url.pathname).toBe(`/xrpc/com.atproto.repo.${method}`);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        repo: DID,
        ...params,
      });
      expect(init).toMatchObject({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return Response.json(data);
    });
    const response = await request(handler, params);
    expect(await response.json()).toEqual(data);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
  });
}

test('list retains empty cursor/limit parameters when absent', async () => {
  upstream((url) => {
    expect(Object.fromEntries(url.searchParams)).toEqual({
      repo: DID,
      collection: 'test.collection',
      cursor: '',
      limit: '',
    });
    return Response.json({ records: [] });
  });
  await request(list, { collection: 'test.collection' });
});

for (const [name, handler, params] of [
  ['blob', blob, { cid }],
  ['record', record, { collection: 'test.collection', rkey: 'key' }],
  ['list', list, { collection: 'test.collection' }],
  ['meta-image record', metaImage, {}],
] as const) {
  test(`${name} preserves upstream HTTP statuses and maps network failures to 502`, async () => {
    let status = 404;
    upstream(() => {
      if (status === 0) throw new TypeError('Network unavailable');
      return new Response('upstream error', { status });
    });
    for (status of [400, 404, 429, 503]) {
      await expect(request(handler, params)).rejects.toMatchObject({ status });
    }
    status = 0;
    await expect(request(handler, params)).rejects.toMatchObject({
      status: 502,
    });
  });
}

for (const [name, handler, params] of [
  ['record', record, { collection: 'test.collection', rkey: 'key' }],
  ['list', list, { collection: 'test.collection' }],
  ['meta-image', metaImage, {}],
] as const) {
  test(`${name} rejects malformed/null/non-object JSON with 502`, async () => {
    let body = '';
    upstream(() => new Response(body));
    for (body of ['{bad', 'null', '[]', '"text"', '42']) {
      await expect(request(handler, params)).rejects.toMatchObject({
        status: 502,
      });
    }
  });
}

test('meta-image fetches only the configured publication and shares blob MIME/cache handling', async () => {
  for (const ref of [icon, { cid, mimeType: 'image/png' }]) {
    const mock = upstream((url) => {
      if (url.pathname.endsWith('getRecord')) {
        expect(Object.fromEntries(url.searchParams)).toEqual({
          repo: DID,
          collection: 'site.standard.publication',
          rkey: PUB_RKEY,
        });
        return publication(ref);
      }
      expect(url.pathname).toBe('/xrpc/com.atproto.sync.getBlob');
      expect(Object.fromEntries(url.searchParams)).toEqual({ did: DID, cid });
      return new Response(new Uint8Array([1, 2, 3, 4]));
    });
    const response = await request(metaImage, {
      collection: 'evil',
      rkey: 'evil',
      cid: 'evil',
    });
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
    expect(mock).toHaveBeenCalledTimes(2);
  }
});

test('meta-image retains publication validation and missing-icon 404', async () => {
  let response = Response.json({ value: { name: 123 } });
  const mock = upstream(() => response.clone());
  await expect(request(metaImage)).rejects.toMatchObject({ status: 502 });
  response = Response.json({
    value: {
      $type: 'site.standard.publication',
      name: 'Test',
      url: 'https://jeanmachine.dev',
    },
  });
  await expect(request(metaImage)).rejects.toMatchObject({ status: 404 });
  expect(mock).toHaveBeenCalledTimes(2);
});

test('meta-image blob errors retain HTTP status; network/read errors deliberately become 502', async () => {
  let status = 404;
  upstream((url) => {
    if (url.pathname.endsWith('getRecord')) return publication();
    if (status === 0) throw new TypeError('Network unavailable');
    if (status === 1)
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new Error('Read failed'));
          },
        }),
      );
    return new Response(null, { status });
  });
  for (status of [404, 429, 503]) {
    await expect(request(metaImage)).rejects.toMatchObject({ status });
  }
  for (status of [0, 1]) {
    await expect(request(metaImage)).rejects.toMatchObject({ status: 502 });
  }
});
