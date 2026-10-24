// @ts-ignore Bun supplies test/runtime modules without app-wide ambient types.
import { expect, test } from 'bun:test';
import { useFetchMock } from '../testing';
import { GET } from '../../routes/api/atproto/resolve/+server';
import { DID, PDS_URL } from '../constants';

const upstream = useFetchMock();
function request(params: Record<string, string> = {}) {
  const url = new URL('https://jeanmachine.dev/api/atproto/resolve');
  url.search = new URLSearchParams(params).toString();
  const headers: Record<string, string> = {};
  return {
    headers,
    response: GET({
      url,
      setHeaders: (value: Record<string, string>) => {
        Object.assign(headers, value);
      },
    } as Parameters<typeof GET>[0]),
  };
}
const plc = `https://plc.directory/${encodeURIComponent(DID)}`;
const fallback = () =>
  Response.json({ alsoKnownAs: ['at://fallback.example'] });

test('default DID uses PDS candidate only after well-known verification and keeps cache policy', async () => {
  const mock = upstream((url, init) => {
    expect(init?.redirect).toBe('error');
    if (url.startsWith(PDS_URL)) {
      const target = new URL(url);
      expect(target.pathname).toBe('/xrpc/com.atproto.repo.describeRepo');
      expect([...target.searchParams]).toEqual([['repo', DID]]);
      expect(init?.headers).toEqual({ Accept: 'application/json' });
      return Response.json({ handle: 'current.example' });
    }
    expect(url).toBe('https://current.example/.well-known/atproto-did');
    return new Response(` ${DID}\n`);
  });
  const { response, headers } = request();
  expect(await (await response).json()).toEqual({
    did: DID,
    handle: 'current.example',
  });
  expect(headers).toEqual({ 'Cache-Control': 'public, max-age=3600' });
  expect(mock).toHaveBeenCalledTimes(2);
});

test('explicit DID is encoded and verified, never used as a fetch origin', async () => {
  const subject = 'did:web:other.example%3A8443:user';
  const mock = upstream((url) => {
    if (url.startsWith(PDS_URL)) {
      expect([...new URL(url).searchParams]).toEqual([['repo', subject]]);
      return Response.json({ handle: 'other.example' });
    }
    expect(url).toBe('https://other.example/.well-known/atproto-did');
    return new Response(subject);
  });
  expect(await (await request({ did: subject }).response).json()).toEqual({
    did: subject,
    handle: 'other.example',
  });
  expect(mock).toHaveBeenCalledTimes(2);
});

for (const failure of [
  'network',
  'json',
  'http',
  'null',
  'shape',
  'invalid handle',
] as const) {
  test(`PDS ${failure} failure permits PLC fallback without fetching invalid candidates`, async () => {
    const mock = upstream((url) => {
      if (url === plc) return fallback();
      expect(url.startsWith(PDS_URL)).toBe(true);
      if (failure === 'network') throw new TypeError('Network unavailable');
      if (failure === 'json') return new Response('{bad');
      if (failure === 'http') return new Response(null, { status: 503 });
      if (failure === 'null') return Response.json(null);
      if (failure === 'shape')
        return Response.json({ handle: { hostname: 'bad.example' } });
      return Response.json({ handle: 'user@127.0.0.1:8080/path' });
    });
    expect(await (await request().response).json()).toEqual({
      did: DID,
      handle: 'fallback.example',
    });
    expect(mock).toHaveBeenCalledTimes(2);
  });
}

for (const failure of [
  'network',
  'mismatch',
  'redirect',
  'invalid DID',
] as const) {
  test(`well-known ${failure} permits PLC fallback; redirects are never followed`, async () => {
    const mock = upstream((url, init) => {
      expect(init?.redirect).toBe('error');
      if (url.startsWith(PDS_URL))
        return Response.json({ handle: 'current.example' });
      if (url === plc) return fallback();
      expect(url).toBe('https://current.example/.well-known/atproto-did');
      if (failure === 'network') throw new TypeError('Network unavailable');
      if (failure === 'redirect')
        return new Response(null, {
          status: 302,
          headers: { Location: 'http://localhost/private' },
        });
      return new Response(
        failure === 'mismatch' ? 'did:plc:someoneelse' : 'did:',
      );
    });
    expect(await (await request().response).json()).toEqual({
      did: DID,
      handle: 'fallback.example',
    });
    expect(mock).toHaveBeenCalledTimes(3);
  });
}

test('PLC aliases require runtime array/string/handle checks and skip unusable entries', async () => {
  upstream((url) =>
    url === plc
      ? Response.json({
          alsoKnownAs: [
            null,
            123,
            {},
            'https://wrong.example',
            'at://bad.example/path',
            'at://127.0.0.1',
            'at://fallback.example',
          ],
        })
      : Response.json({ handle: false }),
  );
  expect(await (await request().response).json()).toEqual({
    did: DID,
    handle: 'fallback.example',
  });
});

test('unusable PLC responses and failed candidates end in deliberate 404', async () => {
  let body = '';
  upstream((url) => {
    if (url !== plc) throw new TypeError('PDS unavailable');
    if (body === 'network') throw new TypeError('PLC unavailable');
    return new Response(body);
  });
  for (body of [
    'network',
    '{bad',
    'null',
    '[]',
    '{}',
    '{"alsoKnownAs":"at://bad.example"}',
    '{"alsoKnownAs":[null,2,"at://bad/path"]}',
  ]) {
    await expect(request().response).rejects.toMatchObject({ status: 404 });
  }
});

test('reverse resolution accepts only a valid DID body and keeps cache policy', async () => {
  let body = ` ${DID}\n`;
  const mock = upstream((url, init) => {
    expect(url).toBe('https://reverse.example/.well-known/atproto-did');
    expect(init).toEqual({ redirect: 'error' });
    return new Response(body);
  });
  const { response, headers } = request({ handle: 'reverse.example' });
  expect(await (await response).json()).toEqual({
    handle: 'reverse.example',
    did: DID,
  });
  expect(headers).toEqual({ 'Cache-Control': 'public, max-age=3600' });
  for (body of ['did:', 'did:plc:', 'not a DID', `${DID}\nextra`]) {
    await expect(
      request({ handle: 'reverse.example' }).response,
    ).rejects.toMatchObject({ status: 404 });
  }
  expect(mock).toHaveBeenCalledTimes(5);
});

test('invalid handle/DID inputs fail before any fetch, including URL syntax and numeric IPs', async () => {
  const mock = upstream(() => {
    throw new Error('Unexpected fetch');
  });
  for (const handle of [
    'https://evil.example',
    'evil.example/path',
    'user@evil.example',
    'evil.example:443',
    '127.0.0.1',
    '[::1]',
    'localhost',
    'evil.example?query',
    'evil.example#fragment',
    'bad\n.example',
  ]) {
    await expect(request({ handle }).response).rejects.toMatchObject({
      status: 400,
    });
  }
  for (const did of ['not-a-did', 'did:', 'did:plc:']) {
    await expect(request({ did }).response).rejects.toMatchObject({
      status: 400,
    });
  }
  expect(mock).not.toHaveBeenCalled();
});

test('reverse resolution network/HTTP/redirect failures remain 404 without follow-up requests', async () => {
  let status = 0;
  const mock = upstream((_url, init) => {
    expect(init?.redirect).toBe('error');
    if (status === 0) throw new TypeError('Network unavailable');
    return new Response(null, {
      status,
      headers: { Location: 'http://localhost/private' },
    });
  });
  for (status of [0, 404, 503, 302]) {
    await expect(
      request({ handle: 'reverse.example' }).response,
    ).rejects.toMatchObject({ status: 404 });
  }
  expect(mock).toHaveBeenCalledTimes(4);
});
