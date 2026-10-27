// @ts-ignore Bun supplies test/runtime modules without app-wide ambient types.
import { expect, test } from 'bun:test';
// @ts-ignore This loader is test-only; production compilation uses SvelteKit.
import { plugin } from 'bun';
import { render } from 'svelte/server';
import { svelteSSR } from './blog/testing';
import { DID } from './constants';
import {
  postFromRecord,
  profileFromRecord,
  type BlueskyPost,
  type BlueskyProfile,
} from './bluesky';

plugin(
  svelteSSR(
    /(?:\/components\/|\/icons\/|\/@lucide\/svelte\/).*\.(svelte|css)$/,
  ),
);

const cid = 'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4';
const avatar = `https://cdn.bsky.app/img/avatar/plain/${DID}/${cid}`;
const thumb = `https://cdn.bsky.app/img/feed_thumbnail/plain/${DID}/${cid}`;
const fullsize = `https://cdn.bsky.app/img/feed_fullsize/plain/${DID}/${cid}`;
const original = `/api/atproto/blob?cid=${cid}`;
const profile: BlueskyProfile = {
  displayName: 'Eliza',
  avatar: { src: avatar, fallback: original },
};
const post: BlueskyPost = {
  uri: `at://${DID}/app.bsky.feed.post/pinned`,
  text: 'A mountain photo 🦋',
  createdAt: '2026-01-01T00:00:00.000Z',
  images: [
    {
      src: thumb,
      fullsize,
      fallback: original,
      alt: 'Reading on a mountain',
      width: 3011,
      height: 4000,
    },
  ],
};

test('post card renders CDN thumbnails and dimensions without requesting lightbox/original media', async () => {
  const Post = (await import('./components/Post.svelte')).default;
  const html = render(Post, {
    props: { post, author: profile, handle: 'eliza.vg' },
  }).body;
  expect(html).toContain(`src="${thumb}"`);
  expect(html).toContain(`src="${avatar}"`);
  expect(html).not.toContain(fullsize);
  expect(html).not.toContain(original);
  expect(html).toContain('width="3011"');
  expect(html).toContain('height="4000"');
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('decoding="async"');
  expect(html).toContain('referrerpolicy="no-referrer"');
  expect(html).toContain('aria-label="Reading on a mountain"');
  expect(html).toContain('A mountain photo 🦋');
  expect(html).toContain(`https://bsky.app/profile/${DID}/post/pinned`);
});

test('profile renders the projected CDN avatar rather than its PDS fallback', async () => {
  const Profile = (await import('./components/Profile.svelte')).default;
  const html = render(Profile, { props: { profile, mobile: true } }).body;
  expect(html).toContain(`src="${avatar}"`);
  expect(html).not.toContain(original);
  expect(html).toContain('referrerpolicy="no-referrer"');
  expect(html).toContain('width="175"');
  expect(html).toContain('height="175"');
});

test('PDS-normalized profile and post still render original same-origin media', async () => {
  const blob = {
    $type: 'blob',
    ref: { $link: cid },
    mimeType: 'image/jpeg',
    size: 123,
  };
  const author = profileFromRecord({
    $type: 'app.bsky.actor.profile',
    displayName: 'Eliza',
    avatar: blob,
  });
  const pinned = postFromRecord(
    {
      $type: 'app.bsky.feed.post',
      text: post.text,
      createdAt: post.createdAt,
      embed: {
        $type: 'app.bsky.embed.images',
        images: [{ image: blob, alt: 'Reading on a mountain' }],
      },
    },
    post.uri,
  );
  if (!author || !pinned) throw new Error('Invalid PDS fixture');
  const Post = (await import('./components/Post.svelte')).default;
  const html = render(Post, { props: { post: pinned, author } }).body;
  expect(html).toContain(original);
  expect(html).not.toContain('https://cdn.bsky.app/');
  expect(html).toContain('Reading on a mountain');
});

test('generic quoted records remain plain text and authored text is escaped', async () => {
  const Post = (await import('./components/Post.svelte')).default;
  const quoteUri = `at://${DID}/app.bsky.feed.generator/custom-feed`;
  const html = render(Post, {
    props: {
      post: {
        ...post,
        text: '<script>unsafe</script>',
        images: undefined,
        quoteUri,
      },
      author: profile,
    },
  }).body;
  expect(html).toContain(quoteUri);
  expect(html).toContain('Quoted post');
  expect(html).toContain('&lt;script');
  expect(html).not.toContain('<script>unsafe</script>');
  expect(html).not.toContain('<iframe');
});

test('external cards use projected thumbnail/metadata and retain the external link', async () => {
  const Post = (await import('./components/Post.svelte')).default;
  const html = render(Post, {
    props: {
      post: {
        ...post,
        images: undefined,
        external: {
          href: 'https://example.com/article',
          title: 'A linked article',
          description: 'Authored description',
          thumb: { src: thumb, fallback: original },
        },
      },
      author: profile,
    },
  }).body;
  expect(html).toContain('href="https://example.com/article"');
  expect(html).toContain('A linked article');
  expect(html).toContain('Authored description');
  expect(html).toContain(`src="${thumb}"`);
  expect(html).not.toContain(original);
});

test('missing avatar/name leaves named identity links instead of an empty avatar tab stop', async () => {
  const Post = (await import('./components/Post.svelte')).default;
  const html = render(Post, {
    props: {
      post: { ...post, images: undefined },
      author: {},
      handle: 'eliza.vg',
    },
  }).body;
  const header = html.split('<div class="post-content')[0];
  expect(header).not.toContain('<img');
  expect(header).toContain('eliza.vg');
  expect(header).not.toMatch(/<a\b[^>]*>(?:\s|<!--.*?-->)*<\/a>/);
});
