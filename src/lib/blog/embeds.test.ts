// @ts-ignore Bun supplies test/runtime modules without app-wide ambient types.
import { expect, test } from 'bun:test';
// @ts-ignore The loader is local to these tests.
import { plugin } from 'bun';
import { render } from 'svelte/server';
import { DID, PUB_RKEY } from '../constants';
import { embedDate, embedTarget, loadEmbed, postPreview } from './embeds';
import { recordUrl } from './urls';
import { svelteSSR } from './testing';
import { documentFixture, publicationFixture } from './fixtures';

plugin(
  svelteSSR(
    /(?:\/components\/|\/icons\/|\/@lucide\/svelte\/).*\.(svelte|css)$/,
  ),
);
const documentUri = `at://${DID}/site.standard.document/3m4omt5rj5c2i`;
const publicationUri = `at://${DID}/site.standard.publication/${PUB_RKEY}`;
const postUri = `at://${DID}/app.bsky.feed.post/3m4omtcysns2i`;
const date = '2025-11-02T23:09:58.075Z';
const document = documentFixture({
  site: publicationUri,
  title: '"Bad Weather"',
  description: 'A weird little ramble on what I value in a climate.',
  publishedAt: date,
});
const cid = 'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4';
const cdn = (kind: string) =>
  `https://cdn.bsky.app/img/${kind}/plain/${DID}/${cid}@jpeg`;
const avatar = cdn('avatar');
const fullsize = cdn('feed_fullsize');
const thumb = cdn('feed_thumbnail');
const appViewPost = {
  uri: postUri,
  author: { did: DID, handle: 'eliza.vg', displayName: 'Eliza', avatar },
  record: { $type: 'app.bsky.feed.post', text: 'Look! 🙂', createdAt: date },
  likeCount: 5,
  repostCount: 2,
  replyCount: 1,
};
const imageView = {
  $type: 'app.bsky.embed.images#view',
  images: [
    {
      thumb,
      fullsize,
      alt: 'A cloudy sky 🙂',
      aspectRatio: { width: 1600, height: 900 },
    },
  ],
};
const signal = () => new AbortController().signal;
function mockFetch(value: unknown) {
  const calls: { url: string; options?: RequestInit }[] = [];
  const fetcher = (async (url: RequestInfo | URL, options?: RequestInit) => {
    calls.push({ url: String(url), options });
    return Response.json(value);
  }) as typeof fetch;
  return { calls, fetcher };
}

test('SSR selects native owned links; foreign, poll and unrelated publication links stay PDSls', async () => {
  expect(embedTarget(documentUri, 'record').href).toBe('/blog/3m4omt5rj5c2i');
  expect(embedTarget(publicationUri, 'record').href).toBe('/blog');
  for (const uri of [
    documentUri.replace(DID, 'did:plc:foreign'),
    publicationUri.replace(PUB_RKEY, '3m4omt5rj5c2i'),
  ]) {
    expect(embedTarget(uri, 'record')).toEqual({
      href: recordUrl(uri),
      request: null,
    });
  }
  expect(embedTarget(postUri, 'fallback')).toEqual({
    href: recordUrl(postUri),
    request: null,
  });
  const { default: NativeEmbed } =
    await import('../components/blog/NativeEmbed.svelte');
  const html = render(NativeEmbed, {
    props: { uri: documentUri, kind: 'record', label: 'Referenced article' },
  }).body;
  expect(html).toContain('href="/blog/3m4omt5rj5c2i"');
  expect(html).not.toContain('Loading preview');
});

test('SSR brands only valid Standard Site record collections, including foreign fallbacks', async () => {
  const { default: NativeEmbed } =
    await import('../components/blog/NativeEmbed.svelte');
  for (const uri of [
    documentUri,
    publicationUri,
    documentUri.replace(DID, 'did:plc:foreign'),
  ]) {
    const html = render(NativeEmbed, {
      props: { uri, kind: 'record', label: 'Referenced record' },
    }).body;
    expect(html).toContain('native-embed post-card');
    expect(html).toContain('src="/assets/standard-site-favicon.png"');
    expect(html).toContain('Standard.site');
    expect(html).toContain(`href="${embedTarget(uri, 'record').href}"`);
  }
  for (const [uri, kind] of [
    [postUri, 'bluesky'],
    [`at://${DID}/blue.poll.poll/abc`, 'fallback'],
    [
      documentUri.replace(
        'site.standard.document',
        'site.standard.document.fake',
      ),
      'record',
    ],
    [documentUri + '?unsafe', 'record'],
    [documentUri, 'fallback'],
  ] as const) {
    const html = render(NativeEmbed, {
      props: { uri, kind, label: 'Standard.site is just an authored label' },
    }).body;
    expect(html).not.toContain('standard-site-favicon.png');
    if (kind === 'bluesky') {
      expect(html).toContain('aria-label="Read post on Bluesky ↗"');
      expect(html).toContain(`href="${embedTarget(uri, kind).href}"`);
    }
  }
});

test('SSR website cards retain authored escaped metadata, safe PDS media and exact-host provider branding', async () => {
  const { default: WebsiteCard } =
    await import('../components/blog/WebsiteCard.svelte');
  const value = {
    $type: 'pub.leaflet.blocks.website' as const,
    src: 'https://standard.site/' as const,
    title: '<Standard & friends>',
    description: '<No HTML>',
    previewImage: {
      $type: 'blob' as const,
      ref: { $link: cid },
      mimeType: 'image/png',
      size: 100,
    },
  };
  const html = render(WebsiteCard, { props: { value } }).body;
  expect(html).toContain('website-card post-card');
  expect(html).toContain('&lt;Standard &amp; friends>');
  expect(html).toContain('&lt;No HTML>');
  expect(html).toContain('src="/assets/standard-site-favicon.png"');
  expect(html).toContain('width="20" height="20"');
  const copyPattern =
    /<span class="website-copy">([\s\S]*?<\/small>\s*<\/span>)\s*<\/span>/;
  const copy = html.match(copyPattern)?.[0] ?? '';
  expect(copy).toContain('website-heading');
  expect(copy).toContain('website-details');
  expect(copy).toContain('&lt;Standard &amp; friends>');
  expect(copy).toContain('&lt;No HTML>');
  expect(copy).toContain('<small>standard.site</small>');
  expect(copy.indexOf('website-heading')).toBeLessThan(
    copy.indexOf('website-details'),
  );
  expect(copy).not.toContain('website-media-preview');
  expect(html.indexOf('website-media-preview')).toBeGreaterThan(
    html.indexOf(copy) + copy.length,
  );
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('decoding="async"');
  expect(html).toContain('/api/atproto/blob?cid=');
  expect(html).toContain('referrerpolicy="no-referrer"');
  expect(html).toContain('rel="noopener noreferrer"');
  for (const src of [
    'https://standard.site.evil.example/',
    'https://sub.standard.site/',
    'javascript:alert(1)',
  ] as const) {
    const other = render(WebsiteCard, {
      props: { value: { ...value, src, previewImage: undefined } },
    }).body;
    expect(other).not.toContain('standard-site-favicon.png');
    expect(other).not.toContain('website-media-preview');
    const fallbackCopy = other.match(copyPattern)?.[0] ?? '';
    expect(fallbackCopy).toContain('website-heading');
    expect(fallbackCopy).toContain('website-details');
    expect(fallbackCopy).toContain('&lt;Standard &amp; friends>');
    expect(fallbackCopy).toContain('&lt;No HTML>');
    expect(other).not.toContain('<img');
    if (src.startsWith('javascript:')) {
      expect(other).not.toContain('href=');
      expect(other).toContain('Unsafe or unavailable URL');
    }
  }
});

test('malformed or unsafe references have no fetch or link', async () => {
  const { calls, fetcher } = mockFetch({});
  for (const uri of [
    'javascript:alert(1)',
    '//evil.example',
    `at://${DID}/site.standard.document/../bad`,
    `at://${DID}/site.standard.document/a?b`,
    'at://evil.example@host/site.standard.document/key',
    `at://${DID}/site.standard.document/a\nb`,
  ]) {
    for (const kind of ['record', 'bluesky'] as const) {
      expect(embedTarget(uri, kind)).toEqual({ href: null, request: null });
      expect(await loadEmbed(uri, kind, fetcher, signal())).toBeNull();
    }
  }
  expect(calls).toHaveLength(0);
  expect(embedTarget(documentUri, 'bluesky').request).toBeNull();
});

test('owned article/publication metadata is validated and fetched only from the same-origin pinned endpoint', async () => {
  const { calls, fetcher } = mockFetch({ uri: documentUri, value: document });
  const abort = signal();
  expect(await loadEmbed(documentUri, 'record', fetcher, abort)).toEqual({
    href: '/blog/3m4omt5rj5c2i',
    title: document.title,
    text: document.description,
    date,
  });
  expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe(
    '/api/atproto/record?collection=site.standard.document&rkey=3m4omt5rj5c2i',
  );
  expect(calls[0].options).toEqual({
    credentials: 'omit',
    redirect: 'error',
    signal: abort,
  });
  const publication = mockFetch({
    uri: publicationUri,
    value: publicationFixture({
      name: 'Actual publication',
      description: 'Actual description',
      url: 'https://jeanmachine.dev',
    }),
  });
  expect(
    await loadEmbed(publicationUri, 'record', publication.fetcher, signal()),
  ).toEqual({
    href: '/blog',
    title: 'Actual publication',
    text: 'Actual description',
  });
  expect(embedDate(date)).toBe('November 2, 2025');
});

test('unrelated owned documents keep their real metadata but use PDSls, not a false native article link', async () => {
  const { fetcher } = mockFetch({
    uri: documentUri,
    value: {
      ...document,
      site: 'at://did:plc:other/site.standard.publication/3m4omt5rj5c2i',
    },
  });
  expect(
    (await loadEmbed(documentUri, 'record', fetcher, signal()))?.href,
  ).toBe(recordUrl(documentUri));
  for (const value of [
    { uri: 'at://wrong', value: document },
    { uri: documentUri, value: { ...document, publishedAt: 'bad' } },
  ]) {
    await expect(
      loadEmbed(documentUri, 'record', mockFetch(value).fetcher, signal()),
    ).rejects.toThrow('Invalid preview');
  }
});

test('Bluesky metadata stays plain text and failures or aborts cannot supply stale previews', async () => {
  const { fetcher, calls } = mockFetch({
    post: {
      author: { did: DID, handle: 'eliza.vg', displayName: 'eliza hamilton' },
      text: '<script>not HTML</script>\n🙂',
      createdAt: date,
    },
  });
  const preview = await loadEmbed(postUri, 'bluesky', fetcher, signal());
  expect(preview?.text).toBe('<script>not HTML</script>\n🙂');
  expect(preview?.author?.handle).toBe('eliza.vg');
  expect(calls[0].url).toBe(
    `/api/atproto/postview?${new URLSearchParams({ uri: postUri, preview: '1' })}`,
  );
  await expect(
    loadEmbed(
      postUri,
      'bluesky',
      mockFetch({ post: { author: {} } }).fetcher,
      signal(),
    ),
  ).rejects.toThrow('Invalid preview');
  const controller = new AbortController();
  let finish!: (response: Response) => void;
  const waiting = loadEmbed(
    postUri,
    'bluesky',
    (() =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      })) as typeof fetch,
    controller.signal,
  );
  controller.abort();
  finish(Response.json({ post: {} }));
  await expect(waiting).rejects.toThrow();
  await expect(
    loadEmbed(
      postUri,
      'bluesky',
      (async () => new Response(null, { status: 404 })) as typeof fetch,
      signal(),
    ),
  ).rejects.toThrow('Preview unavailable');
});

test('AppView public image selection preserves alt text and valid ratios, including recordWithMedia', () => {
  const expected = {
    href: `https://bsky.app/profile/${DID}/post/3m4omtcysns2i`,
    title: 'Bluesky post',
    text: appViewPost.record.text,
    date,
    author: { did: DID, handle: 'eliza.vg', displayName: 'Eliza', avatar },
    images: [
      { src: fullsize, alt: 'A cloudy sky 🙂', width: 1600, height: 900 },
    ],
    stats: { likeCount: 5, repostCount: 2, replyCount: 1 },
  };
  for (const embed of [
    imageView,
    {
      $type: 'app.bsky.embed.recordWithMedia#view',
      record: { secret: 'not selected' },
      media: imageView,
    },
  ]) {
    expect(
      postPreview(
        { ...appViewPost, embed, viewer: { like: 'private' } },
        postUri,
      ),
    ).toEqual(expected);
  }
  const images = Array.from({ length: 6 }, (_, index) => ({
    thumb,
    fullsize,
    alt: `Image ${index}`,
    aspectRatio: { width: index === 0 ? -1 : 1.5, height: 9 },
  }));
  const preview = postPreview(
    { ...appViewPost, embed: { ...imageView, images } },
    postUri,
  );
  expect(preview?.images).toEqual(
    images.slice(0, 4).map((item) => ({ src: fullsize, alt: item.alt })),
  );
  expect(
    postPreview(
      { ...appViewPost, embed: { ...imageView, images: [{ thumb, alt: '' }] } },
      postUri,
    )?.images,
  ).toEqual([{ src: thumb, alt: '' }]);
});

test('external AppView cards select authored public metadata, never fetching the linked website', async () => {
  const external = {
    uri: 'https://example.com/story',
    title: '<b>Story</b>',
    description: 'An authored summary',
    thumb,
  };
  for (const embed of [
    { $type: 'app.bsky.embed.external#view', external },
    {
      $type: 'app.bsky.embed.recordWithMedia#view',
      media: { $type: 'app.bsky.embed.external#view', external },
    },
  ]) {
    const preview = postPreview({ ...appViewPost, embed }, postUri);
    expect(preview?.external).toEqual({
      href: external.uri,
      title: external.title,
      text: external.description,
      image: thumb,
    });
    const { fetcher, calls } = mockFetch({
      post: {
        author: preview?.author,
        text: preview?.text,
        createdAt: preview?.date,
        external: preview?.external,
      },
      likeCount: 5,
      repostCount: 2,
      replyCount: 1,
    });
    expect(await loadEmbed(postUri, 'bluesky', fetcher, signal())).toEqual(
      preview,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toStartWith('/api/atproto/postview?');
  }
  for (const uri of [
    'javascript:alert(1)',
    '//evil.example',
    'https://user:pass@example.com/',
    'https://example.com/\nunsafe',
  ]) {
    expect(
      postPreview(
        {
          ...appViewPost,
          embed: {
            $type: 'app.bsky.embed.external#view',
            external: { ...external, uri },
          },
        },
        postUri,
      )?.external,
    ).toBeUndefined();
  }
});

test('client revalidation retains real suffixless CDN URLs and all known format suffixes', async () => {
  const liveAvatar = `https://cdn.bsky.app/img/avatar/plain/${DID}/bafkreihqilujdrnt4d6i6ige7gr5zr3gnbni2b5psnhm3mem6a66cqts5m`;
  const liveThumb = `https://cdn.bsky.app/img/feed_thumbnail/plain/${DID}/bafkreicqnjvms3wunx3onuzzztmnkglgqryg4c5ffahdmuflqd64imygcy`;
  for (const suffix of ['', '@jpeg', '@png', '@webp']) {
    const author = { ...appViewPost.author, avatar: `${liveAvatar}${suffix}` };
    const images = [
      {
        src: `${fullsize.replace('@jpeg', '')}${suffix}`,
        alt: 'A cloudy sky',
        width: 4,
        height: 3,
      },
    ];
    const external = {
      href: 'https://example.com/story',
      title: 'A story',
      text: 'A summary',
      image: `${liveThumb}${suffix}`,
    };
    const { fetcher, calls } = mockFetch({
      likeCount: 5,
      repostCount: 2,
      replyCount: 1,
      post: {
        author,
        text: appViewPost.record.text,
        createdAt: date,
        images,
        external,
      },
    });
    expect(await loadEmbed(postUri, 'bluesky', fetcher, signal())).toEqual({
      href: `https://bsky.app/profile/${DID}/post/3m4omtcysns2i`,
      title: 'Bluesky post',
      text: appViewPost.record.text,
      date,
      author,
      images,
      external,
      stats: { likeCount: 5, repostCount: 2, replyCount: 1 },
    });
    expect(calls).toHaveLength(1);
  }
});

test('unsafe image URLs are omitted on both AppView and selected client payloads without dropping text', async () => {
  for (const unsafe of [
    thumb.replace('https:', 'http:'),
    thumb.replace('cdn.bsky.app', 'evil.example'),
    thumb.replace('cdn.bsky.app', 'cdn.bsky.app.evil.example'),
    thumb.replace('cdn.bsky.app', 'cdn.bsky.app:443'),
    thumb.replace('cdn.bsky.app', 'cdn.bsky.app:8443'),
    thumb.replace('cdn.bsky.app', 'user:pass@cdn.bsky.app'),
    thumb.replace('/img/', '/bad/../img/'),
    `${thumb}\n`,
    `${thumb}?redirect=https://evil.example`,
    `${thumb}#fragment`,
    thumb.replace('/img/', '/img/\t'),
    thumb.replace(cid, '%0A'),
    ...[
      '@gif',
      '@svg',
      '@jpeg/extra',
      '@jpeg@png',
      '@',
      '.png',
      '/extra',
      '?format=jpeg',
      '#jpeg',
    ].map((suffix) => thumb.replace('@jpeg', suffix)),
    ...[
      thumb.replace('https:', 'http:'),
      thumb.replace('cdn.bsky.app', 'evil.example'),
      thumb.replace('cdn.bsky.app', 'cdn.bsky.app:443'),
      thumb.replace('cdn.bsky.app', 'user:pass@cdn.bsky.app'),
      thumb.replace('/img/', '/bad/../img/'),
      thumb.replace(DID, 'not-a-did'),
    ].map((url) => url.replace('@jpeg', '')),
    thumb.replace(DID, 'did:web:example.com%0a'),
    thumb.replace(DID, 'did:web:example.com%20'),
    thumb.replace(DID, 'did:web:example.com%5c'),
    'https://cdn.bsky.app/arbitrary/image.jpeg',
    'data:image/png;base64,AAAA',
    '//cdn.bsky.app/img/feed_thumbnail/plain/image.jpeg',
  ]) {
    const preview = postPreview(
      {
        ...appViewPost,
        author: { ...appViewPost.author, avatar: unsafe },
        embed: {
          ...imageView,
          images: [{ thumb: unsafe, fullsize: unsafe, alt: 'unsafe' }],
        },
      },
      postUri,
    );
    expect(preview?.text).toBe(appViewPost.record.text);
    expect(preview?.author?.avatar).toBeUndefined();
    expect(preview?.images).toBeUndefined();
    const { fetcher } = mockFetch({
      post: {
        author: { ...appViewPost.author, avatar: unsafe },
        text: appViewPost.record.text,
        createdAt: date,
        images: [{ src: unsafe, alt: 'unsafe' }],
        external: {
          href: 'https://example.com/',
          title: 'Safe link',
          image: unsafe,
        },
      },
    });
    const loaded = await loadEmbed(postUri, 'bluesky', fetcher, signal());
    expect(loaded?.author?.avatar).toBeUndefined();
    expect(loaded?.images).toBeUndefined();
    expect(loaded?.external).toEqual({
      href: 'https://example.com/',
      title: 'Safe link',
    });
    expect(loaded?.text).toBe(appViewPost.record.text);
  }
  expect(
    postPreview(
      { ...appViewPost, author: { ...appViewPost.author, avatar: thumb } },
      postUri,
    )?.author?.avatar,
  ).toBeUndefined();
  expect(
    postPreview(
      {
        ...appViewPost,
        author: { ...appViewPost.author, avatar: cdn('avatar_thumbnail') },
      },
      postUri,
    )?.author?.avatar,
  ).toBe(cdn('avatar_thumbnail'));
});

test('client revalidation selects only public image fields, bounded images, paired dimensions and normalized counts', async () => {
  const { fetcher } = mockFetch({
    likeCount: -1,
    repostCount: 2.5,
    replyCount: '3',
    post: {
      author: { ...appViewPost.author, viewer: { muted: true } },
      text: appViewPost.record.text,
      createdAt: date,
      images: Array.from({ length: 6 }, () => ({
        src: fullsize,
        alt: 'Native alt 🙂',
        width: 3,
        height: 2,
        secret: true,
      })),
    },
  });
  const preview = await loadEmbed(postUri, 'bluesky', fetcher, signal());
  expect(preview?.images).toEqual(
    Array.from({ length: 4 }, () => ({
      src: fullsize,
      alt: 'Native alt 🙂',
      width: 3,
      height: 2,
    })),
  );
  expect(preview?.stats).toEqual({
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
  });
  expect(preview?.author).toEqual(appViewPost.author);
  for (const invalid of [-1, 1.5, Infinity, NaN, '5', null]) {
    expect(
      postPreview({ ...appViewPost, likeCount: invalid }, postUri)?.stats
        ?.likeCount,
    ).toBe(0);
  }
});

test('missing, unsupported or malformed optional media stays a text preview', async () => {
  for (const embed of [
    undefined,
    null,
    {},
    { $type: 'app.bsky.embed.video#view' },
    { $type: 'app.bsky.embed.recordWithMedia#view' },
    { ...imageView, images: [{ fullsize, alt: 5 }] },
  ]) {
    const preview = postPreview({ ...appViewPost, embed }, postUri);
    expect(preview?.text).toBe(appViewPost.record.text);
    expect(preview?.images).toBeUndefined();
    expect(preview?.external).toBeUndefined();
  }
  const { fetcher } = mockFetch({
    post: {
      author: { did: DID, handle: 'eliza.vg' },
      text: 'Text only',
      createdAt: date,
    },
  });
  expect(await loadEmbed(postUri, 'bluesky', fetcher, signal())).toEqual({
    href: `https://bsky.app/profile/${DID}/post/3m4omtcysns2i`,
    title: 'Bluesky post',
    text: 'Text only',
    date,
    author: { did: DID, handle: 'eliza.vg' },
  });
});

test('owned document covers and publication icons use only the existing PDS image proxy for modern and legacy blobs', async () => {
  for (const blob of [
    { $type: 'blob', ref: { $link: cid }, mimeType: 'image/webp', size: 7030 },
    { cid, mimeType: 'image/webp' },
  ]) {
    const src = `/api/atproto/blob?${new URLSearchParams({ cid, mimetype: 'image/webp' })}`;
    const cover = mockFetch({
      uri: documentUri,
      value: { ...document, coverImage: blob },
    });
    const preview = await loadEmbed(
      documentUri,
      'record',
      cover.fetcher,
      signal(),
    );
    expect(preview?.image).toEqual({ src, alt: document.title });
    expect(preview?.href).toBe('/blog/3m4omt5rj5c2i');
    expect(cover.calls).toHaveLength(1);
    const publication = mockFetch({
      uri: publicationUri,
      value: publicationFixture({ url: 'https://jeanmachine.dev', icon: blob }),
    });
    expect(
      await loadEmbed(publicationUri, 'record', publication.fetcher, signal()),
    ).toEqual({ href: '/blog', title: 'Blog', text: undefined, icon: src });
  }
  for (const blob of [
    undefined,
    null,
    'https://evil.example/cover.png',
    {},
    { cid, mimeType: 'image/svg+xml' },
  ]) {
    const { fetcher } = mockFetch({
      uri: documentUri,
      value: { ...document, coverImage: blob },
    });
    const preview = await loadEmbed(documentUri, 'record', fetcher, signal());
    expect(preview?.title).toBe(document.title);
    expect(preview?.image).toBeUndefined();
    const publication = mockFetch({
      uri: publicationUri,
      value: publicationFixture({ url: 'https://jeanmachine.dev', icon: blob }),
    });
    expect(
      (await loadEmbed(publicationUri, 'record', publication.fetcher, signal()))
        ?.icon,
    ).toBeUndefined();
  }
});
