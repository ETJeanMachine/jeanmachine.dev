import { AppBskyFeedPost } from '@atcute/bluesky';
import { is } from '@atcute/lexicons';
import {
  isActorIdentifier,
  isDid,
  isHandle,
  isNsid,
  isRecordKey,
  isTid,
} from '@atcute/lexicons/syntax';
import {
  SiteStandardDocument,
  SiteStandardPublication,
} from '@atcute/standard-site';
import { DID, PUB_RKEY } from '../constants';
import { blueskyUrl, imageUrl, recordUrl, safeWebUrl } from './urls';

export type EmbedKind = 'bluesky' | 'record' | 'fallback';
export interface EmbedImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}
export interface EmbedExternal {
  href: string;
  title: string;
  text?: string;
  image?: string;
}
export interface EmbedStats {
  likeCount: number;
  repostCount: number;
  replyCount: number;
}
export interface EmbedPreview {
  title: string;
  text?: string;
  date?: string;
  author?: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  images?: EmbedImage[];
  external?: EmbedExternal;
  stats?: EmbedStats;
  image?: { src: string; alt: string };
  icon?: string;
  href: string;
}
const publicationUri = `at://${DID}/site.standard.publication/${PUB_RKEY}`;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function parseRecord(uri: string) {
  const match = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(uri);
  if (!match) return null;
  const [, repo, collection, rkey] = match;
  return isActorIdentifier(repo) && isNsid(collection) && isRecordKey(rkey)
    ? { repo, collection, rkey }
    : null;
}

export function embedTarget(uri: string, kind: EmbedKind) {
  const record = parseRecord(uri);
  if (!record) return { href: null, request: null };
  const { repo, collection, rkey } = record;
  if (kind === 'bluesky') {
    if (collection !== 'app.bsky.feed.post')
      return { href: null, request: null };
    return {
      href: blueskyUrl(uri),
      request: `/api/atproto/postview?${new URLSearchParams({ uri, preview: '1' })}`,
    };
  }
  const owned = kind === 'record' && repo === DID && isTid(rkey);
  const document = owned && collection === 'site.standard.document';
  const publication = owned && uri === publicationUri;
  return {
    href: document ? `/blog/${rkey}` : publication ? '/blog' : recordUrl(uri),
    request:
      document || publication
        ? `/api/atproto/record?${new URLSearchParams({ collection, rkey })}`
        : null,
  };
}

/** AppView images only: no arbitrary hosts, ports, credentials or URL normalization tricks. */
function blueskyImage(value: unknown, kind: 'avatar' | 'feed'): string | null {
  if (
    typeof value !== 'string' ||
    !value.startsWith('https://cdn.bsky.app/') ||
    /%(?:0[0-9a-f]|1[0-9a-f]|20|5c|7f)/i.test(value) ||
    !safeWebUrl(value)
  )
    return null;
  const url = new URL(value);
  if (url.href !== value || url.search || url.hash) return null;
  const paths =
    kind === 'avatar'
      ? 'avatar|avatar_thumbnail'
      : 'feed_thumbnail|feed_fullsize';
  const match = new RegExp(
    `^/img/(${paths})/plain/([^/]+)/[a-zA-Z0-9]+(?:@(?:jpeg|png|webp))?$`,
  ).exec(url.pathname);
  return match && isDid(match[2]) ? value : null;
}

const dimension = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

function previewImages(value: unknown): EmbedImage[] | undefined {
  if (!Array.isArray(value)) return;
  const images: EmbedImage[] = [];
  for (const item of value.slice(0, 4)) {
    if (!object(item)) continue;
    const src = blueskyImage(item.src, 'feed');
    if (!src || typeof item.alt !== 'string' || item.alt.length > 20_000)
      continue;
    images.push({
      src,
      alt: item.alt,
      ...(dimension(item.width) && dimension(item.height)
        ? { width: item.width, height: item.height }
        : {}),
    });
  }
  return images.length ? images : undefined;
}

function previewExternal(value: unknown): EmbedExternal | undefined {
  if (!object(value)) return;
  const href = safeWebUrl(value.href);
  if (!href || typeof value.title !== 'string' || value.title.length > 10_000)
    return;
  const image = blueskyImage(value.image, 'feed');
  return {
    href,
    title: value.title,
    ...(typeof value.text === 'string' && value.text.length <= 30_000
      ? { text: value.text }
      : {}),
    ...(image ? { image } : {}),
  };
}

function postMedia(value: unknown) {
  const embed =
    object(value) && value.$type === 'app.bsky.embed.recordWithMedia#view'
      ? value.media
      : value;
  if (!object(embed)) return {};
  if (
    embed.$type === 'app.bsky.embed.images#view' &&
    Array.isArray(embed.images)
  ) {
    const images = previewImages(
      embed.images.slice(0, 4).map((item: unknown) => {
        if (!object(item)) return null;
        const ratio = object(item.aspectRatio) ? item.aspectRatio : {};
        return {
          src:
            blueskyImage(item.fullsize, 'feed') ??
            blueskyImage(item.thumb, 'feed'),
          alt: item.alt,
          width: ratio.width,
          height: ratio.height,
        };
      }),
    );
    return images ? { images } : {};
  }
  if (
    embed.$type === 'app.bsky.embed.external#view' &&
    object(embed.external)
  ) {
    const external = previewExternal({
      href: embed.external.uri,
      title: embed.external.title,
      text: embed.external.description,
      image: embed.external.thumb,
    });
    return external ? { external } : {};
  }
  return {};
}

function previewStats(value: Record<string, unknown>): EmbedStats | undefined {
  const count = (value: unknown) =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
      ? value
      : 0;
  if (
    value.likeCount === undefined &&
    value.repostCount === undefined &&
    value.replyCount === undefined
  )
    return;
  return {
    likeCount: count(value.likeCount),
    repostCount: count(value.repostCount),
    replyCount: count(value.replyCount),
  };
}

/** Select public fields only, and never accept a different post from AppView. */
export function postPreview(value: unknown, uri: string): EmbedPreview | null {
  const record = parseRecord(uri);
  if (
    !record ||
    record.collection !== 'app.bsky.feed.post' ||
    !object(value) ||
    value.uri !== uri ||
    !is(AppBskyFeedPost.mainSchema, value.record) ||
    !object(value.author) ||
    !isDid(value.author.did) ||
    !isHandle(value.author.handle) ||
    (isDid(record.repo) && value.author.did !== record.repo) ||
    (isHandle(record.repo) && value.author.handle !== record.repo) ||
    (value.author.displayName !== undefined &&
      (typeof value.author.displayName !== 'string' ||
        value.author.displayName.length > 640))
  )
    return null;
  const avatar = blueskyImage(value.author.avatar, 'avatar');
  const stats = previewStats(value);
  return {
    href: blueskyUrl(uri)!,
    title: 'Bluesky post',
    text: value.record.text,
    date: value.record.createdAt,
    author: {
      did: value.author.did,
      handle: value.author.handle,
      ...(typeof value.author.displayName === 'string'
        ? { displayName: value.author.displayName }
        : {}),
      ...(avatar ? { avatar } : {}),
    },
    ...postMedia(value.embed),
    ...(stats ? { stats } : {}),
  };
}

export async function loadEmbed(
  uri: string,
  kind: EmbedKind,
  fetcher: typeof fetch,
  signal: AbortSignal,
): Promise<EmbedPreview | null> {
  const target = embedTarget(uri, kind);
  if (!target.request) return null;
  const response = await fetcher(target.request, {
    credentials: 'omit',
    redirect: 'error',
    signal,
  });
  if (!response.ok) throw new Error('Preview unavailable');
  const data: unknown = await response.json();
  signal.throwIfAborted();
  if (!object(data)) throw new Error('Invalid preview');
  if (kind === 'bluesky') {
    const post = data.post;
    // Revalidate the selected API payload before rendering it on the client.
    if (object(post) && object(post.author)) {
      const preview = postPreview(
        {
          uri,
          author: post.author,
          likeCount: data.likeCount,
          repostCount: data.repostCount,
          replyCount: data.replyCount,
          record: {
            $type: 'app.bsky.feed.post',
            text: post.text,
            createdAt: post.createdAt,
          },
        },
        uri,
      );
      if (preview) {
        const images = previewImages(post.images);
        const external = previewExternal(post.external);
        return {
          ...preview,
          ...(images ? { images } : {}),
          ...(external ? { external } : {}),
        };
      }
    }
  } else if (data.uri === uri && object(data.value)) {
    // Optional media must not invalidate otherwise readable record metadata.
    const document = { ...data.value, coverImage: undefined };
    if (
      parseRecord(uri)?.collection === 'site.standard.document' &&
      is(SiteStandardDocument.mainSchema, document)
    ) {
      const src = imageUrl(data.value.coverImage);
      return {
        href: document.site === publicationUri ? target.href! : recordUrl(uri)!,
        title: document.title,
        text: document.description,
        date: document.publishedAt,
        ...(src ? { image: { src, alt: document.title } } : {}),
      };
    }
    const publication = { ...data.value, icon: undefined };
    if (
      uri === publicationUri &&
      is(SiteStandardPublication.mainSchema, publication)
    ) {
      const icon = imageUrl(data.value.icon);
      return {
        href: '/blog',
        title: publication.name,
        text: publication.description,
        ...(icon ? { icon } : {}),
      };
    }
  }
  throw new Error('Invalid preview');
}

export function embedDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
