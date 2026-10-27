// @ts-ignore Bun supplies test/runtime modules without app-wide ambient types.
import { expect, test } from 'bun:test';
import { DID } from './constants';
import {
  isHomeBluesky,
  postFromRecord,
  profileFromRecord,
  selectHomeBluesky,
} from './bluesky';
import { imageUrl } from './blog/urls';

const cid = 'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4';
const uri = `at://${DID}/app.bsky.feed.post/3m4omtcysns2i`;
const quoteUri = 'at://did:plc:another/app.bsky.feed.post/3m4omt5rj5c2i';
const createdAt = '2025-11-02T23:09:58.075Z';
const blob = {
  $type: 'blob',
  ref: { $link: cid },
  mimeType: 'image/png',
  size: 256,
};
const original = imageUrl(blob)!;
const cdn = (kind: string, suffix = '@jpeg') =>
  `https://cdn.bsky.app/img/${kind}/plain/${DID}/${cid}${suffix}`;
const avatar = cdn('avatar');
const thumb = cdn('feed_thumbnail');
const fullsize = cdn('feed_fullsize');
const record = { $type: 'app.bsky.feed.post', text: 'Hello 🙂', createdAt };
const imageRecord = {
  ...record,
  embed: {
    $type: 'app.bsky.embed.images',
    images: [
      {
        alt: 'A cloudy sky',
        image: blob,
        aspectRatio: { width: 4, height: 3 },
      },
    ],
  },
};
const post = {
  uri,
  cid,
  author: {
    did: DID,
    handle: 'eliza.vg',
    displayName: 'Eliza',
    avatar,
    description: 'Not selected',
    viewer: { muted: true },
    status: { record: { private: 'not selected' } },
  },
  record: imageRecord,
  embed: {
    $type: 'app.bsky.embed.images#view',
    images: [
      {
        alt: 'A cloudy sky',
        thumb,
        fullsize,
        aspectRatio: { width: 4, height: 3 },
        viewer: 'not selected',
      },
    ],
  },
  likeCount: 4,
  repostCount: 2,
  replyCount: 1,
  indexedAt: createdAt,
  viewer: { like: 'not selected' },
  labels: [{ val: 'not selected' }],
};
const pin = (value: unknown = post) => ({
  post: value,
  reason: { $type: 'app.bsky.feed.defs#reasonPin' },
});
const latest = {
  post: { ...post, uri: uri.replace('3m4omtcysns2i', '3m4omt5rj5c2i') },
};
const payload = { feed: [latest, pin()], cursor: 'not selected' };

function home() {
  return structuredClone(selectHomeBluesky(payload)!);
}

test('PDS profiles are schema validated and projected to display name and same-origin avatar only', () => {
  expect(
    profileFromRecord({
      $type: 'app.bsky.actor.profile',
      displayName: 'Eliza',
      description: 'Not selected',
      avatar: blob,
      banner: blob,
      createdAt,
      pinnedPost: { uri, cid },
      viewer: { muted: true },
    }),
  ).toEqual({ displayName: 'Eliza', avatar: { src: original } });
  expect(profileFromRecord({ $type: 'app.bsky.actor.profile' })).toEqual({});
  for (const value of [
    null,
    [],
    {},
    { value: { $type: 'app.bsky.actor.profile' } },
    { $type: 'app.bsky.actor.profile', displayName: 2 },
    {
      $type: 'app.bsky.actor.profile',
      avatar: 'https://evil.example/avatar.png',
    },
    { $type: 'app.bsky.actor.profile', displayName: 'x'.repeat(65) },
  ])
    expect(profileFromRecord(value)).toBeNull();
});

test('PDS posts retain only supported public fields and use same-origin originals for card and lightbox', () => {
  expect(
    postFromRecord({ ...imageRecord, viewer: { private: true } }, uri),
  ).toEqual({
    uri,
    text: record.text,
    createdAt,
    images: [
      {
        src: original,
        fullsize: original,
        alt: 'A cloudy sky',
        width: 4,
        height: 3,
      },
    ],
  });
  expect(postFromRecord(record, uri)).toEqual({
    uri,
    text: record.text,
    createdAt,
  });
  for (const invalid of [
    uri.replace(DID, 'did:plc:foreign'),
    uri.replace(DID, 'eliza.vg'),
    uri.replace('app.bsky.feed.post', 'app.bsky.actor.profile'),
    `${uri}?query=1`,
    `${uri}#fragment`,
    `${uri}/extra`,
    `at://${DID}/app.bsky.feed.post/..`,
  ])
    expect(postFromRecord(record, invalid)).toBeNull();
  for (const value of [
    null,
    [],
    {},
    { ...record, text: 2 },
    { ...record, createdAt: 'bad' },
    { ...record, createdAt: '2025-99-99T00:00:00Z' },
    { ...record, text: 'x'.repeat(301) },
  ])
    expect(postFromRecord(value, uri)).toBeNull();
});

test('PDS quote, external and record-with-media embeds project safely without nested quote contents', () => {
  const quote = {
    $type: 'app.bsky.embed.record',
    record: { uri: quoteUri, cid },
  };
  expect(postFromRecord({ ...record, embed: quote }, uri)?.quoteUri).toBe(
    quoteUri,
  );
  expect(
    postFromRecord(
      {
        ...record,
        embed: {
          $type: 'app.bsky.embed.recordWithMedia',
          record: quote,
          media: imageRecord.embed,
        },
      },
      uri,
    ),
  ).toEqual({ ...postFromRecord(imageRecord, uri), quoteUri });
  const external = {
    uri: 'https://example.com/story',
    title: 'Story',
    description: 'Summary',
    thumb: blob,
  };
  expect(
    postFromRecord(
      { ...record, embed: { $type: 'app.bsky.embed.external', external } },
      uri,
    )?.external,
  ).toEqual({
    href: external.uri,
    title: 'Story',
    description: 'Summary',
    thumb: { src: original },
  });
  for (const href of [
    'javascript:alert(1)',
    'https://user:pass@evil.example/story',
  ]) {
    expect(
      postFromRecord(
        {
          ...record,
          embed: {
            $type: 'app.bsky.embed.external',
            external: { ...external, uri: href },
          },
        },
        uri,
      ),
    ).toMatchObject({ uri, text: record.text });
    expect(
      postFromRecord(
        {
          ...record,
          embed: {
            $type: 'app.bsky.embed.external',
            external: { ...external, uri: href },
          },
        },
        uri,
      )?.external,
    ).toBeUndefined();
  }
  const unsupported = {
    ...imageRecord,
    embed: {
      ...imageRecord.embed,
      images: [
        {
          alt: 'Unsafe image type',
          image: { ...blob, mimeType: 'image/svg+xml' },
        },
      ],
    },
  };
  expect(postFromRecord(unsupported, uri)).toEqual({
    uri,
    text: record.text,
    createdAt,
  });
});

test('generic authored AT-record references remain plain URI text for PDS and record-with-media posts', () => {
  const recordUris = [
    `at://${DID}/app.bsky.feed.generator/whats-hot`,
    'at://did:plc:another/app.bsky.graph.list/3m4omt5rj5c2i',
    `at://${DID}/app.bsky.graph.starterpack/3m4omt5rj5c2i`,
    'at://feeds.example/app.bsky.feed.generator/whats-hot',
    `at://${DID}/site.standard.document/3m4omt5rj5c2i`,
  ];
  const valid = home();
  for (const referenceUri of recordUris) {
    const quote = {
      $type: 'app.bsky.embed.record',
      record: { uri: referenceUri, cid },
    };
    const expanded = {
      $type: 'app.bsky.embed.record#view',
      record: {
        uri: referenceUri,
        displayName: 'expanded-quote-metadata',
        description: 'expanded-quote-metadata',
        viewer: { private: true },
      },
    };
    for (const withMedia of [false, true]) {
      const authored = {
        ...record,
        embed: withMedia
          ? {
              $type: 'app.bsky.embed.recordWithMedia',
              record: quote,
              media: imageRecord.embed,
            }
          : quote,
      };
      const expected = {
        uri,
        text: record.text,
        createdAt,
        quoteUri: referenceUri,
        ...(withMedia
          ? { images: postFromRecord(imageRecord, uri)!.images }
          : {}),
      };
      expect(postFromRecord(authored, uri)).toEqual(expected);
      expect(isHomeBluesky({ ...valid, pinned: expected })).toBe(true);
      const selected = selectHomeBluesky({
        feed: [
          pin({
            ...post,
            record: authored,
            embed: withMedia
              ? {
                  $type: 'app.bsky.embed.recordWithMedia#view',
                  record: expanded,
                  media: post.embed,
                }
              : expanded,
          }),
        ],
      });
      expect(selected?.pinned).toEqual({
        ...expected,
        ...(withMedia ? { images: valid.pinned.images } : {}),
      });
      expect(isHomeBluesky(selected)).toBe(true);
      expect(JSON.stringify(selected)).not.toContain('expanded-quote-metadata');
      expect(postFromRecord(authored, referenceUri)).toBeNull();
      expect(
        isHomeBluesky({ ...valid, pinned: { ...expected, uri: referenceUri } }),
      ).toBe(false);
      expect(
        selectHomeBluesky({
          feed: [pin({ ...post, record: authored, uri: referenceUri })],
        }),
      ).toBeNull();
    }
  }
});

test('generic quoted references still require a complete valid AT-record URI', () => {
  const valid = home();
  for (const invalid of [
    '',
    'javascript:alert(1)',
    'https://example.com/app.bsky.graph.list/key',
    'at://not-an-actor/app.bsky.graph.list/key',
    `at://${DID}/not-an-nsid/key`,
    `at://${DID}`,
    `at://${DID}/app.bsky.graph.list`,
    `at://${DID}/app.bsky.graph.list/..`,
    `at://${DID}/app.bsky.graph.list/key/extra`,
    `at://${DID}/app.bsky.graph.list/key?query=1`,
    `at://${DID}/app.bsky.graph.list/key#fragment`,
    `at://${DID}/app.bsky.graph.list/key\n`,
  ]) {
    expect(
      postFromRecord(
        {
          ...record,
          embed: {
            $type: 'app.bsky.embed.record',
            record: { uri: invalid, cid },
          },
        },
        uri,
      )?.quoteUri,
    ).toBeUndefined();
    expect(
      isHomeBluesky({
        ...valid,
        pinned: { ...valid.pinned, quoteUri: invalid },
      }),
    ).toBe(false);
  }
});

test('two-item author feed selects the exact pin marker, not the newest post, and never leaks private fields', () => {
  const selected = selectHomeBluesky(payload);
  expect(selected).toEqual({
    profile: {
      displayName: 'Eliza',
      avatar: { src: avatar, fallback: `/api/atproto/blob?cid=${cid}` },
    },
    pinned: {
      uri,
      text: record.text,
      createdAt,
      images: [
        {
          src: thumb,
          fullsize,
          fallback: original,
          alt: 'A cloudy sky',
          width: 4,
          height: 3,
        },
      ],
    },
    counts: { likeCount: 4, repostCount: 2, replyCount: 1 },
    handle: 'eliza.vg',
  });
  expect(isHomeBluesky(selected)).toBe(true);
  expect(selectHomeBluesky({ feed: [pin(), latest] })).toEqual(selected);
  for (const field of [
    'viewer',
    'status',
    'indexedAt',
    'labels',
    'cursor',
    'record',
    'not selected',
  ])
    expect(JSON.stringify(selected)).not.toContain(field);
});

test('missing pins, foreign/malformed pins and invalid author metadata never select an unrelated latest item', () => {
  for (const value of [
    null,
    [],
    {},
    { feed: null },
    { feed: [] },
    { feed: [latest] },
    {
      feed: [
        latest,
        { ...pin(), reason: { $type: 'app.bsky.feed.defs#reasonRepost' } },
      ],
    },
    {
      feed: [
        latest,
        { ...pin(), reason: { $type: 'app.bsky.feed.defs#reasonPinExtra' } },
      ],
    },
    { feed: [latest, latest, pin()] },
  ])
    expect(selectHomeBluesky(value)).toBeNull();
  for (const invalid of [
    null,
    [],
    { ...post, uri: uri.replace(DID, 'did:plc:foreign') },
    { ...post, uri: `${uri}?injected` },
    { ...post, author: { ...post.author, did: 'did:plc:foreign' } },
    { ...post, author: { ...post.author, handle: 'https://evil.example' } },
    { ...post, author: { ...post.author, displayName: 2 } },
    { ...post, record: { ...record, createdAt: 'invalid' } },
  ])
    expect(selectHomeBluesky({ feed: [latest, pin(invalid)] })).toBeNull();
});

test('missing or mislabeled thumbnails never promote CDN fullsize photos into card previews', () => {
  for (const preview of [undefined, fullsize, 'https://evil.example/image']) {
    const view = {
      ...post.embed,
      images: [{ ...post.embed.images[0], thumb: preview }],
    };
    const selected = selectHomeBluesky({
      feed: [pin({ ...post, embed: view })],
    });
    expect(selected?.pinned.images?.[0].src).toBe(original);
    expect(selected?.pinned.images?.[0].fullsize).toBe(fullsize);
    expect(isHomeBluesky(selected)).toBe(true);
    const noOriginal = selectHomeBluesky({
      feed: [pin({ ...post, record, embed: view })],
    });
    expect(noOriginal?.pinned.images).toBeUndefined();
    expect(noOriginal?.pinned.text).toBe(record.text);
    expect(isHomeBluesky(noOriginal)).toBe(true);
  }
  const external = {
    uri: 'https://example.com/article',
    title: 'Article',
    description: 'Authored description',
  };
  const selected = selectHomeBluesky({
    feed: [
      pin({
        ...post,
        record: {
          ...record,
          embed: {
            $type: 'app.bsky.embed.external',
            external: { ...external, thumb: blob },
          },
        },
        embed: {
          $type: 'app.bsky.embed.external#view',
          external: { ...external, thumb: fullsize },
        },
      }),
    ],
  });
  expect(selected?.pinned.external?.thumb?.src).toBe(original);
});

test('client payload validation rejects fullsize CDN URLs in card preview slots', () => {
  const image = home();
  image.pinned.images![0].src = fullsize;
  expect(isHomeBluesky(image)).toBe(false);
  const external = home();
  external.pinned.external = {
    href: 'https://example.com/article',
    title: 'Article',
    description: 'Authored description',
    thumb: { src: fullsize },
  };
  expect(isHomeBluesky(external)).toBe(false);
});

test('suffixless and jpeg/png/webp CDN images are retained, with separate thumbnail and fullsize URLs', () => {
  for (const suffix of ['', '@jpeg', '@png', '@webp']) {
    const selected = selectHomeBluesky({
      feed: [
        pin({
          ...post,
          author: { ...post.author, avatar: cdn('avatar_thumbnail', suffix) },
          embed: {
            ...post.embed,
            images: [
              {
                alt: '',
                thumb: cdn('feed_thumbnail', suffix),
                fullsize: cdn('feed_fullsize', suffix),
              },
            ],
          },
        }),
      ],
    })!;
    expect(selected.profile.avatar?.src).toBe(cdn('avatar_thumbnail', suffix));
    expect(selected.pinned.images?.[0]).toEqual({
      src: cdn('feed_thumbnail', suffix),
      fullsize: cdn('feed_fullsize', suffix),
      fallback: original,
      alt: '',
      width: 4,
      height: 3,
    });
    expect(isHomeBluesky(selected)).toBe(true);
  }
});

test('unsafe optional media fall back to authored PDS originals or are omitted without losing text', () => {
  for (const unsafe of [
    'https://evil.example/image.png',
    `${thumb}\n`,
    `${thumb}?query=1`,
    `${thumb}#fragment`,
    thumb.replace('cdn.bsky.app', 'cdn.bsky.app:443'),
    thumb.replace('cdn.bsky.app', 'cdn.bsky.app.evil.example'),
    thumb.replace('cdn.bsky.app', 'user@cdn.bsky.app'),
    thumb.replace('/plain/', '/plain/%20'),
    thumb.replace(DID, 'did:plc:foreign'),
    thumb.replace(cid, 'not-a-cid'),
    '/api/atproto/blob?cid=bad&mimetype=image%2Fpng',
  ]) {
    const value = {
      ...post,
      author: { ...post.author, avatar: unsafe },
      embed: {
        ...post.embed,
        images: [{ alt: 'Unsafe URLs', thumb: unsafe, fullsize: unsafe }],
      },
    };
    const selected = selectHomeBluesky({ feed: [pin(value)] })!;
    expect(selected.profile.avatar).toBeUndefined();
    expect(selected.pinned.images?.[0]).toEqual({
      src: original,
      fullsize: original,
      alt: 'Unsafe URLs',
      width: 4,
      height: 3,
    });
    expect(selected.pinned.text).toBe(record.text);
    expect(isHomeBluesky(selected)).toBe(true);
    expect(
      selectHomeBluesky({ feed: [pin({ ...value, record })] })?.pinned.images,
    ).toBeUndefined();
  }
  const selected = selectHomeBluesky({
    feed: [
      pin({
        ...post,
        embed: {
          ...post.embed,
          images: [
            {
              thumb,
              fullsize: 'javascript:bad',
              alt: '',
              aspectRatio: { width: -1, height: 2 },
            },
          ],
        },
      }),
    ],
  })!;
  expect(selected.pinned.images?.[0]).toEqual({
    src: thumb,
    fullsize: original,
    fallback: original,
    alt: '',
  });
});

test('omitted record images never shift later PDS fallbacks, and view arrays remain bounded', () => {
  const selected = selectHomeBluesky({
    feed: [
      pin({
        ...post,
        record: {
          ...record,
          embed: {
            $type: 'app.bsky.embed.images',
            images: [
              {
                alt: 'Unsupported original',
                image: { ...blob, mimeType: 'image/svg+xml' },
              },
              imageRecord.embed.images[0],
            ],
          },
        },
        embed: {
          ...post.embed,
          images: [
            { alt: 'First', thumb, fullsize },
            { alt: 'Second', thumb, fullsize },
          ],
        },
      }),
    ],
  })!;
  expect(selected.pinned.images?.[0]).toEqual({
    src: thumb,
    fullsize,
    alt: 'First',
  });
  expect(selected.pinned.images?.[1]).toEqual({
    src: thumb,
    fullsize,
    alt: 'Second',
    fallback: original,
    width: 4,
    height: 3,
  });
  expect(isHomeBluesky(selected)).toBe(true);
  const bounded = selectHomeBluesky({
    feed: [
      pin({
        ...post,
        record,
        embed: {
          ...post.embed,
          images: Array.from({ length: 6 }, () => ({
            alt: '',
            thumb,
            fullsize,
          })),
        },
      }),
    ],
  })!;
  expect(bounded.pinned.images).toHaveLength(4);
  expect(
    bounded.pinned.images?.every((image) => image.fallback === undefined),
  ).toBe(true);
  expect(isHomeBluesky(bounded)).toBe(true);
});

test('external view cards retain safe public metadata and PDS fallback, including record-with-media', () => {
  const external = {
    uri: 'https://example.com/story',
    title: 'Story',
    description: 'Summary',
    thumb: blob,
  };
  const value = {
    ...post,
    record: {
      ...record,
      embed: { $type: 'app.bsky.embed.external', external },
    },
    embed: {
      $type: 'app.bsky.embed.recordWithMedia#view',
      record: {
        record: {
          value: 'Huge nested quote not selected',
          viewer: 'not selected',
        },
      },
      media: {
        $type: 'app.bsky.embed.external#view',
        external: { ...external, thumb, viewer: 'not selected' },
      },
    },
  };
  expect(selectHomeBluesky({ feed: [pin(value)] })?.pinned.external).toEqual({
    href: external.uri,
    title: 'Story',
    description: 'Summary',
    thumb: { src: thumb, fallback: original },
  });
  expect(
    selectHomeBluesky({
      feed: [
        pin({
          ...value,
          embed: {
            $type: 'app.bsky.embed.external#view',
            external: { ...external, thumb: 'https://evil.example/image.png' },
          },
        }),
      ],
    })?.pinned.external?.thumb,
  ).toEqual({ src: original });
});

test('count selection produces finite nonnegative integers and defaults unavailable counts to zero', () => {
  for (const invalid of [
    undefined,
    null,
    -1,
    NaN,
    Infinity,
    1.5,
    '2',
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    expect(
      selectHomeBluesky({
        feed: [
          pin({
            ...post,
            likeCount: invalid,
            repostCount: invalid,
            replyCount: invalid,
          }),
        ],
      })?.counts,
    ).toEqual({ likeCount: 0, repostCount: 0, replyCount: 0 });
  }
});

test('client DTO validation checks owner, schema/date, counts, all media and the exact public shape', () => {
  const valid = home();
  expect(isHomeBluesky(valid)).toBe(true);
  for (const value of [
    null,
    [],
    {},
    { ...valid, handle: '<script>' },
    { ...valid, viewer: {} },
    { ...valid, profile: { ...valid.profile, status: {} } },
    { ...valid, counts: { ...valid.counts, viewer: {} } },
    {
      ...valid,
      pinned: { ...valid.pinned, uri: uri.replace(DID, 'did:plc:foreign') },
    },
    { ...valid, pinned: { ...valid.pinned, createdAt: 'bad' } },
    { ...valid, pinned: { ...valid.pinned, text: 2 } },
    { ...valid, pinned: { ...valid.pinned, quoteUri: 'javascript:bad' } },
    {
      ...valid,
      pinned: {
        ...valid.pinned,
        images: Array(5).fill(valid.pinned.images![0]),
      },
    },
  ])
    expect(isHomeBluesky(value)).toBe(false);
  for (const invalid of [-1, NaN, Infinity, 1.5, '2', null])
    expect(
      isHomeBluesky({
        ...valid,
        counts: { ...valid.counts, likeCount: invalid },
      }),
    ).toBe(false);
  for (const field of ['src', 'fullsize', 'fallback']) {
    for (const unsafe of [
      'https://evil.example/image.png',
      '//cdn.bsky.app/image',
      `${original}&url=https://evil.example`,
      `${original}#fragment`,
      original.replace('image%2Fpng', 'image%2Fsvg%2Bxml'),
      original.replace(cid, 'bad'),
    ]) {
      const value = home();
      Object.assign(value.pinned.images![0], { [field]: unsafe });
      expect(isHomeBluesky(value)).toBe(false);
    }
  }
  for (const image of [
    { ...valid.pinned.images![0], width: 0 },
    { ...valid.pinned.images![0], height: undefined },
    { ...valid.pinned.images![0], alt: 2 },
    { ...valid.pinned.images![0], viewer: {} },
  ])
    expect(
      isHomeBluesky({ ...valid, pinned: { ...valid.pinned, images: [image] } }),
    ).toBe(false);
  expect(isHomeBluesky({ ...valid, profile: { avatar: { src: thumb } } })).toBe(
    false,
  );
  expect(
    isHomeBluesky({
      ...valid,
      profile: { avatar: { src: avatar, fallback: thumb } },
    }),
  ).toBe(false);
  expect(
    isHomeBluesky({
      ...valid,
      pinned: {
        ...valid.pinned,
        external: { href: 'javascript:bad', title: '', description: '' },
      },
    }),
  ).toBe(false);
});
