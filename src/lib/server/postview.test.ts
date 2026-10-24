// @ts-ignore Bun supplies test/runtime modules without app-wide ambient types.
import { expect, test } from 'bun:test';
import { useFetchMock } from '../testing';
import { GET } from '../../routes/api/atproto/postview/+server';
import { DID } from '../constants';

const uri = `at://${DID}/app.bsky.feed.post/3m4omtcysns2i`;
const createdAt = '2025-11-02T23:09:58.075Z';
const author = { did: DID, handle: 'eliza.vg', displayName: 'eliza hamilton' };
const post = {
  uri,
  author: { ...author, viewer: { muted: true } },
  record: {
    $type: 'app.bsky.feed.post',
    text: 'idk why i wrote this',
    createdAt,
  },
  likeCount: 4,
  repostCount: 2,
  replyCount: 1,
  viewer: { like: 'private-state' },
};
const fetchMock = useFetchMock();
function upstream(value: unknown, status = 200) {
  return fetchMock(() => Response.json(value, { status }));
}
function request(value = uri, preview = false) {
  const url = new URL('https://jeanmachine.dev/api/atproto/postview');
  url.search = new URLSearchParams({
    uri: value,
    ...(preview ? { preview: '1' } : {}),
  }).toString();
  return GET({ url } as Parameters<typeof GET>[0]);
}

test('ordinary counts response and 60-second cache remain unchanged', async () => {
  const mock = upstream({ posts: [post] });
  const response = await request();
  expect(await response.json()).toEqual({
    likeCount: 4,
    repostCount: 2,
    replyCount: 1,
  });
  expect(response.headers.get('cache-control')).toBe('public, max-age=60');
  expect(mock.mock.calls[0][0]).toBe(
    `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`,
  );
});

test('ordinary remote-author counts keep the old response contract and fixed AppView host', async () => {
  const other = 'did:plc:another';
  const otherUri = uri.replace(DID, other);
  const mock = upstream({
    posts: [
      {
        ...imagePost,
        uri: otherUri,
        author: { did: other, handle: 'other.example' },
      },
    ],
  });
  const response = await request(otherUri);
  expect(await response.json()).toEqual({
    likeCount: 4,
    repostCount: 2,
    replyCount: 1,
  });
  expect(response.headers.get('cache-control')).toBe('public, max-age=60');
  expect(mock.mock.calls[0][0]).toBe(
    `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(otherUri)}`,
  );
});

test('ordinary counts still default to zero without requiring preview metadata', async () => {
  upstream({ posts: [{}] });
  expect(await (await request()).json()).toEqual({
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
  });
});

test('preview adds only selected validated public metadata', async () => {
  upstream({ posts: [post] });
  const response = await request(uri, true);
  expect(await response.json()).toEqual({
    likeCount: 4,
    repostCount: 2,
    replyCount: 1,
    post: { author, text: post.record.text, createdAt },
  });
  expect(response.headers.get('cache-control')).toBe('public, max-age=60');
});

test('preview supports other public authors without changing the fixed AppView host', async () => {
  const other = 'did:plc:another';
  const otherUri = uri.replace(DID, other);
  const mock = upstream({
    posts: [
      {
        ...post,
        uri: otherUri,
        author: { did: other, handle: 'other.example' },
      },
    ],
  });
  expect((await (await request(otherUri, true)).json()).post.author.did).toBe(
    other,
  );
  expect(String(mock.mock.calls[0][0])).toStartWith(
    'https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=',
  );
});

test('missing or deleted posts gracefully return 404 in both modes', async () => {
  upstream({ posts: [] });
  await expect(request()).rejects.toMatchObject({ status: 404 });
  await expect(request(uri, true)).rejects.toMatchObject({ status: 404 });
});

test('invalid preview URIs are rejected before any upstream fetch', async () => {
  const mock = upstream({ posts: [post] });
  for (const invalid of [
    'https://evil.example/post',
    uri.replace('app.bsky.feed.post', 'site.standard.document'),
    `${uri}?inject=1`,
  ]) {
    await expect(request(invalid, true)).rejects.toMatchObject({ status: 400 });
  }
  expect(mock).not.toHaveBeenCalled();
});

test('preview rejects mismatched URI, invalid record, and invalid or mismatched author', async () => {
  for (const invalid of [
    { ...post, uri: `${uri}wrong` },
    { ...post, record: { ...post.record, text: 123 } },
    { ...post, record: { ...post.record, createdAt: 'bad' } },
    { ...post, author: { ...author, did: 'not-a-did' } },
    { ...post, author: { ...author, did: 'did:plc:different' } },
    { ...post, author: { ...author, handle: '<script>' } },
  ]) {
    upstream({ posts: [invalid] });
    await expect(request(uri, true)).rejects.toMatchObject({ status: 502 });
  }
});

const cid = 'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4';
const avatar = `https://cdn.bsky.app/img/avatar/plain/${DID}/${cid}@jpeg`;
const thumb = `https://cdn.bsky.app/img/feed_thumbnail/plain/${DID}/${cid}@jpeg`;
const fullsize = `https://cdn.bsky.app/img/feed_fullsize/plain/${DID}/${cid}@jpeg`;
const imagePost = {
  ...post,
  author: { ...post.author, avatar, status: { record: 'not selected' } },
  embed: {
    $type: 'app.bsky.embed.images#view',
    images: [
      {
        thumb,
        fullsize,
        alt: 'A sunny day',
        aspectRatio: { width: 4, height: 3 },
        viewer: { private: true },
      },
    ],
  },
};

test('preview API adds only validated avatar and images, leaving counts-only callers exactly unchanged', async () => {
  const mock = upstream({ posts: [imagePost] });
  const preview = await request(uri, true);
  expect(await preview.json()).toEqual({
    likeCount: 4,
    repostCount: 2,
    replyCount: 1,
    post: {
      author: { ...author, avatar },
      text: post.record.text,
      createdAt,
      images: [{ src: fullsize, alt: 'A sunny day', width: 4, height: 3 }],
    },
  });
  expect(preview.headers.get('cache-control')).toBe('public, max-age=60');
  const counts = await request();
  expect(await counts.json()).toEqual({
    likeCount: 4,
    repostCount: 2,
    replyCount: 1,
  });
  expect(counts.headers.get('cache-control')).toBe('public, max-age=60');
  expect(mock).toHaveBeenCalledTimes(2);
});

test('external preview thumbnails are selected from AppView without any remote metadata requests', async () => {
  const mock = upstream({
    posts: [
      {
        ...post,
        embed: {
          $type: 'app.bsky.embed.recordWithMedia#view',
          record: { viewer: 'not selected' },
          media: {
            $type: 'app.bsky.embed.external#view',
            external: {
              uri: 'https://example.com/story',
              title: 'A story',
              description: 'A summary',
              thumb,
              extra: 'not selected',
            },
          },
        },
      },
    ],
  });
  expect(await (await request(uri, true)).json()).toEqual({
    likeCount: 4,
    repostCount: 2,
    replyCount: 1,
    post: {
      author,
      text: post.record.text,
      createdAt,
      external: {
        href: 'https://example.com/story',
        title: 'A story',
        text: 'A summary',
        image: thumb,
      },
    },
  });
  expect(mock).toHaveBeenCalledTimes(1);
});

test('preview retains real suffixless avatar and external thumbnail URLs alongside known suffixes', async () => {
  const liveAvatar = `https://cdn.bsky.app/img/avatar/plain/${DID}/bafkreihqilujdrnt4d6i6ige7gr5zr3gnbni2b5psnhm3mem6a66cqts5m`;
  const liveThumb = `https://cdn.bsky.app/img/feed_thumbnail/plain/${DID}/bafkreicqnjvms3wunx3onuzzztmnkglgqryg4c5ffahdmuflqd64imygcy`;
  for (const suffix of ['', '@jpeg', '@png', '@webp']) {
    const mock = upstream({
      posts: [
        {
          ...post,
          author: { ...post.author, avatar: `${liveAvatar}${suffix}` },
          embed: {
            $type: 'app.bsky.embed.external#view',
            external: {
              uri: 'https://example.com/story',
              title: 'A story',
              description: 'A summary',
              thumb: `${liveThumb}${suffix}`,
            },
          },
        },
      ],
    });
    const response = await request(uri, true);
    expect(await response.json()).toEqual({
      likeCount: 4,
      repostCount: 2,
      replyCount: 1,
      post: {
        author: { ...author, avatar: `${liveAvatar}${suffix}` },
        text: post.record.text,
        createdAt,
        external: {
          href: 'https://example.com/story',
          title: 'A story',
          text: 'A summary',
          image: `${liveThumb}${suffix}`,
        },
      },
    });
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(mock).toHaveBeenCalledTimes(1);
  }
});

test('invalid optional media does not turn a valid preview into an upstream error', async () => {
  upstream({
    posts: [
      {
        ...imagePost,
        author: { ...author, avatar: 'https://evil.example/avatar.png' },
        embed: {
          ...imagePost.embed,
          images: [
            {
              thumb: `${thumb}\n`,
              fullsize: fullsize.replace('cdn.bsky.app', 'cdn.bsky.app:443'),
              alt: 'Unsafe URLs',
            },
          ],
        },
      },
    ],
  });
  expect(await (await request(uri, true)).json()).toEqual({
    likeCount: 4,
    repostCount: 2,
    replyCount: 1,
    post: { author, text: post.record.text, createdAt },
  });
});

test('preview normalizes invalid counts without changing ordinary counts behavior', async () => {
  upstream({
    posts: [{ ...post, likeCount: -1, repostCount: '2', replyCount: 1.5 }],
  });
  expect(await (await request()).json()).toEqual({
    likeCount: -1,
    repostCount: '2',
    replyCount: 1.5,
  });
  expect(await (await request(uri, true)).json()).toEqual({
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
    post: { author, text: post.record.text, createdAt },
  });
});

test('malformed/null envelopes and malformed post entries deliberately return 502 in both modes', async () => {
  for (const body of [
    'not json',
    'null',
    '[]',
    '{}',
    '{"posts":null}',
    '{"posts":{}}',
    '{"posts":[null]}',
    '{"posts":[42]}',
    '{"posts":[[]]}',
  ]) {
    fetchMock(() => new Response(body));
    await expect(request()).rejects.toMatchObject({ status: 502 });
    await expect(request(uri, true)).rejects.toMatchObject({ status: 502 });
  }
});

test('network failures deliberately return 502 in both modes', async () => {
  fetchMock(() => {
    throw new TypeError('Network unavailable');
  });
  await expect(request()).rejects.toMatchObject({ status: 502 });
  await expect(request(uri, true)).rejects.toMatchObject({ status: 502 });
});

test('counts-only URI handling stays permissive while query encoding prevents injection', async () => {
  const mock = upstream({ posts: [{}] });
  const value = 'opaque +?uri=other&extra=1#fragment';
  expect(await (await request(value)).json()).toEqual({
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
  });
  const target = new URL(String(mock.mock.calls[0][0]));
  expect([...target.searchParams]).toEqual([['uris', value]]);
});

test('missing URI and upstream failures retain their existing API errors', async () => {
  const mock = upstream({ message: 'Unavailable' }, 503);
  await expect(
    GET({
      url: new URL('https://jeanmachine.dev/api/atproto/postview'),
    } as Parameters<typeof GET>[0]),
  ).rejects.toMatchObject({ status: 400 });
  expect(mock).not.toHaveBeenCalled();
  await expect(request()).rejects.toMatchObject({ status: 503 });
  await expect(request(uri, true)).rejects.toMatchObject({ status: 503 });
});
