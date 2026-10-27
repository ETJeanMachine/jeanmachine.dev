import { AppBskyActorProfile, AppBskyFeedPost } from '@atcute/bluesky';
import { is } from '@atcute/lexicons';
import { isBlob, isLegacyBlob } from '@atcute/lexicons/interfaces';
import {
  isActorIdentifier,
  isCid,
  isDatetime,
  isDid,
  isHandle,
  isNsid,
  isRecordKey,
} from '@atcute/lexicons/syntax';
import { DID } from './constants';
import { blueskyImage } from './blog/embeds';
import { imageUrl, safeWebUrl } from './blog/urls';

export interface BlueskyMedia {
  src: string;
  fallback?: string;
}
export interface BlueskyImage extends BlueskyMedia {
  fullsize: string;
  alt: string;
  width?: number;
  height?: number;
}
export interface BlueskyProfile {
  displayName?: string;
  avatar?: BlueskyMedia;
}
export interface BlueskyPost {
  uri: string;
  text: string;
  createdAt: string;
  images?: BlueskyImage[];
  quoteUri?: string;
  external?: {
    href: string;
    title: string;
    description: string;
    thumb?: BlueskyMedia;
  };
}
export interface PostCounts {
  likeCount: number;
  repostCount: number;
  replyCount: number;
}
export interface HomeBluesky {
  profile: BlueskyProfile;
  pinned: BlueskyPost;
  counts: PostCounts;
  handle: string;
}

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const dimension = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const count = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const date = (value: unknown): value is string =>
  isDatetime(value) && Number.isFinite(Date.parse(value));
const text = (value: unknown, limit: number): value is string =>
  typeof value === 'string' && value.length <= limit;
const keys = (value: Record<string, unknown>, allowed: string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));

function postUri(value: unknown, owned = false): value is string {
  if (typeof value !== 'string') return false;
  const match = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/.exec(value);
  return (
    !!match &&
    (owned ? match[1] === DID : isDid(match[1])) &&
    isRecordKey(match[2])
  );
}

/** Authored references stay opaque text and may name any AT record collection. */
function recordUri(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(value);
  return (
    !!match &&
    isActorIdentifier(match[1]) &&
    isNsid(match[2]) &&
    isRecordKey(match[3])
  );
}

function pdsImage(value: unknown): value is string {
  const prefix = '/api/atproto/blob?';
  if (typeof value !== 'string' || !value.startsWith(prefix)) return false;
  const params = new URLSearchParams(value.slice(prefix.length));
  const cid = params.get('cid');
  if (!isCid(cid)) return false;
  if (value === `${prefix}${new URLSearchParams({ cid })}`) return true;
  return (
    imageUrl({
      $type: 'blob',
      ref: { $link: cid },
      mimeType: params.get('mimetype'),
      size: 0,
    }) === value
  );
}

function blobImage(value: unknown): string | null {
  if (!isBlob(value) && !isLegacyBlob(value)) return null;
  const cid = isBlob(value) ? value.ref.$link : value.cid;
  const src = isCid(cid) ? imageUrl(value) : null;
  return src && pdsImage(src) ? src : null;
}

function cdnImage(value: unknown, kind: 'avatar' | 'feed'): string | null {
  const src = blueskyImage(value, kind);
  if (!src) return null;
  const parts = new URL(src).pathname.split('/');
  const cid = parts[5].split('@')[0];
  return parts[4] === DID && isCid(cid) ? src : null;
}

function thumbnail(value: unknown): string | null {
  const src = cdnImage(value, 'feed');
  return src?.startsWith('https://cdn.bsky.app/img/feed_thumbnail/plain/')
    ? src
    : null;
}

function avatarFromView(value: unknown): BlueskyMedia | undefined {
  const src = cdnImage(value, 'avatar');
  if (!src) return;
  const cid = new URL(src).pathname.split('/')[5].split('@')[0];
  // CDN suffixes describe transcoding, not the original blob's MIME type.
  return { src, fallback: `/api/atproto/blob?${new URLSearchParams({ cid })}` };
}

function dimensions(value: unknown) {
  return object(value) && dimension(value.width) && dimension(value.height)
    ? { width: value.width, height: value.height }
    : {};
}

function mediaEmbed(
  value: unknown,
  view = false,
): Record<string, unknown> | null {
  if (!object(value)) return null;
  const embed =
    value.$type === `app.bsky.embed.recordWithMedia${view ? '#view' : ''}`
      ? value.media
      : value;
  return object(embed) ? embed : null;
}

export function profileFromRecord(value: unknown): BlueskyProfile | null {
  if (!is(AppBskyActorProfile.mainSchema, value)) return null;
  const src = blobImage(value.avatar);
  return {
    ...(value.displayName !== undefined
      ? { displayName: value.displayName }
      : {}),
    ...(src ? { avatar: { src } } : {}),
  };
}

function imagesFromRecord(embed: Record<string, unknown> | null) {
  if (embed?.$type !== 'app.bsky.embed.images' || !Array.isArray(embed.images))
    return;
  // Keep slots until view pairing so omitted blobs cannot shift later fallbacks.
  return embed.images
    .slice(0, 4)
    .map((item: unknown): BlueskyImage | undefined => {
      if (!object(item) || !text(item.alt, 20_000)) return;
      const src = blobImage(item.image);
      if (src)
        return {
          src,
          fullsize: src,
          alt: item.alt,
          ...dimensions(item.aspectRatio),
        };
    });
}

export function postFromRecord(
  value: unknown,
  uri: string,
): BlueskyPost | null {
  if (
    !postUri(uri, true) ||
    !is(AppBskyFeedPost.mainSchema, value) ||
    !date(value.createdAt)
  )
    return null;
  const result: BlueskyPost = {
    uri,
    text: value.text,
    createdAt: value.createdAt,
  };
  const embed = mediaEmbed(value.embed);
  const images = imagesFromRecord(embed)?.filter(
    (image) => image !== undefined,
  );
  if (images?.length) result.images = images;
  if (embed?.$type === 'app.bsky.embed.external') {
    result.external = externalFromView(embed.external);
  }
  const quote =
    object(value.embed) &&
    value.embed.$type === 'app.bsky.embed.recordWithMedia'
      ? value.embed.record
      : value.embed;
  if (
    object(quote) &&
    quote.$type === 'app.bsky.embed.record' &&
    object(quote.record) &&
    recordUri(quote.record.uri)
  )
    result.quoteUri = quote.record.uri;
  return result;
}

function externalFromView(
  value: unknown,
  original?: BlueskyPost['external'],
): BlueskyPost['external'] {
  if (!object(value)) return original;
  const href = safeWebUrl(value.uri);
  if (
    !href ||
    !text(href, 16_384) ||
    !text(value.title, 10_000) ||
    !text(value.description, 30_000)
  )
    return original;
  const fallback = original?.href === href ? original.thumb?.src : undefined;
  const src = thumbnail(value.thumb) ?? blobImage(value.thumb) ?? fallback;
  return {
    href,
    title: value.title,
    description: value.description,
    ...(src
      ? {
          thumb: { src, ...(fallback && fallback !== src ? { fallback } : {}) },
        }
      : {}),
  };
}

function imagesFromView(
  value: unknown,
  originals?: (BlueskyImage | undefined)[],
): BlueskyImage[] | undefined {
  if (!Array.isArray(value))
    return originals?.filter((image) => image !== undefined);
  const images: BlueskyImage[] = [];
  for (
    let i = 0;
    i < Math.min(4, Math.max(value.length, originals?.length ?? 0));
    i++
  ) {
    const item: unknown = value[i];
    const original = originals?.[i];
    if (!object(item)) {
      if (original) images.push(original);
      continue;
    }
    const thumb = thumbnail(item.thumb);
    const full = cdnImage(item.fullsize, 'feed');
    const fullsize = full ?? original?.fullsize ?? thumb;
    // Missing thumbnails must not promote fullsize CDN photos into eager previews.
    const src = thumb ?? original?.src;
    const alt = text(item.alt, 20_000) ? item.alt : original?.alt;
    if (!src || !fullsize || alt === undefined) continue;
    images.push({
      src,
      fullsize,
      alt,
      ...(original && (src !== original.src || fullsize !== original.fullsize)
        ? { fallback: original.src }
        : {}),
      ...dimensions(item.aspectRatio ?? original),
    });
  }
  return images.length ? images : undefined;
}

/** The pin may accompany the latest item even when the requested feed limit is one. */
export function selectHomeBluesky(payload: unknown): HomeBluesky | null {
  if (
    !object(payload) ||
    !Array.isArray(payload.feed) ||
    payload.feed.length > 2
  )
    return null;
  const item: unknown = payload.feed.find(
    (item: unknown) =>
      object(item) &&
      object(item.reason) &&
      item.reason.$type === 'app.bsky.feed.defs#reasonPin',
  );
  if (!object(item) || !object(item.post)) return null;
  const post = item.post;
  if (
    !postUri(post.uri, true) ||
    !object(post.author) ||
    post.author.did !== DID ||
    !isHandle(post.author.handle)
  )
    return null;
  const pinned = postFromRecord(post.record, post.uri);
  const profile = profileFromRecord({
    $type: 'app.bsky.actor.profile',
    ...(post.author.displayName !== undefined
      ? { displayName: post.author.displayName }
      : {}),
  });
  if (!pinned || !profile) return null;
  const avatar = avatarFromView(post.author.avatar);
  if (avatar) profile.avatar = avatar;
  const embed = mediaEmbed(post.embed, true);
  if (embed?.$type === 'app.bsky.embed.images#view') {
    const original = object(post.record) ? mediaEmbed(post.record.embed) : null;
    pinned.images = imagesFromView(embed.images, imagesFromRecord(original));
  }
  if (embed?.$type === 'app.bsky.embed.external#view')
    pinned.external = externalFromView(embed.external, pinned.external);
  return {
    profile,
    pinned,
    counts: {
      likeCount: count(post.likeCount) ? post.likeCount : 0,
      repostCount: count(post.repostCount) ? post.repostCount : 0,
      replyCount: count(post.replyCount) ? post.replyCount : 0,
    },
    handle: post.author.handle,
  };
}

function validMedia(
  value: unknown,
  kind: 'avatar' | 'feed',
  image = false,
): value is BlueskyMedia {
  return (
    object(value) &&
    keys(
      value,
      image
        ? ['src', 'fallback', 'fullsize', 'alt', 'width', 'height']
        : ['src', 'fallback'],
    ) &&
    !!(
      (kind === 'feed' ? thumbnail(value.src) : cdnImage(value.src, kind)) ||
      pdsImage(value.src)
    ) &&
    (value.fallback === undefined || pdsImage(value.fallback))
  );
}

function validImage(value: unknown): value is BlueskyImage {
  return (
    object(value) &&
    validMedia(value, 'feed', true) &&
    !!(cdnImage(value.fullsize, 'feed') || pdsImage(value.fullsize)) &&
    text(value.alt, 20_000) &&
    ((value.width === undefined && value.height === undefined) ||
      (dimension(value.width) && dimension(value.height)))
  );
}

function validProfile(value: unknown): value is BlueskyProfile {
  return (
    object(value) &&
    keys(value, ['displayName', 'avatar']) &&
    is(AppBskyActorProfile.mainSchema, {
      $type: 'app.bsky.actor.profile',
      displayName: value.displayName,
    }) &&
    (value.avatar === undefined || validMedia(value.avatar, 'avatar'))
  );
}

function validExternal(value: unknown): boolean {
  return (
    object(value) &&
    keys(value, ['href', 'title', 'description', 'thumb']) &&
    safeWebUrl(value.href) === value.href &&
    text(value.href, 16_384) &&
    text(value.title, 10_000) &&
    text(value.description, 30_000) &&
    (value.thumb === undefined || validMedia(value.thumb, 'feed'))
  );
}

export function isHomeBluesky(value: unknown): value is HomeBluesky {
  if (
    !object(value) ||
    !keys(value, ['profile', 'pinned', 'counts', 'handle']) ||
    !validProfile(value.profile) ||
    !isHandle(value.handle) ||
    !object(value.counts) ||
    !keys(value.counts, ['likeCount', 'repostCount', 'replyCount']) ||
    !count(value.counts.likeCount) ||
    !count(value.counts.repostCount) ||
    !count(value.counts.replyCount) ||
    !object(value.pinned)
  )
    return false;
  const post = value.pinned;
  return (
    keys(post, [
      'uri',
      'text',
      'createdAt',
      'images',
      'quoteUri',
      'external',
    ]) &&
    postUri(post.uri, true) &&
    date(post.createdAt) &&
    is(AppBskyFeedPost.mainSchema, {
      $type: 'app.bsky.feed.post',
      text: post.text,
      createdAt: post.createdAt,
    }) &&
    (post.images === undefined ||
      (Array.isArray(post.images) &&
        post.images.length <= 4 &&
        post.images.every(validImage))) &&
    (post.quoteUri === undefined || recordUri(post.quoteUri)) &&
    (post.external === undefined || validExternal(post.external))
  );
}
