import { isBlob, isLegacyBlob } from '@atcute/lexicons/interfaces';

/** No protocol-relative URLs, credentials, control characters, or executable schemes. */
export function safeLink(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    !value ||
    /[\u0000-\u0020\u007f\\]/u.test(value)
  )
    return null;
  if (value.startsWith('#')) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    return ['https:', 'http:', 'mailto:'].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function safeWebUrl(value: unknown): string | null {
  const href = safeLink(value);
  return href && /^https?:\/\//.test(href) ? href : null;
}

/** Deliberately narrow: adding an embed provider requires a code change. */
export function safeFrameUrl(value: unknown): string | null {
  const href = safeWebUrl(value);
  if (!href) return null;
  const url = new URL(href);
  if (url.protocol !== 'https:' || url.port) return null;
  if (
    url.hostname === 'www.youtube-nocookie.com' &&
    /^\/embed\/[\w-]+$/.test(url.pathname)
  )
    return href;
  if (
    url.hostname === 'player.vimeo.com' &&
    /^\/video\/\d+$/.test(url.pathname)
  )
    return href;
  return null;
}

export function imageUrl(value: unknown): string | null {
  if (
    (!isBlob(value) && !isLegacyBlob(value)) ||
    ![
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
    ].includes(value.mimeType)
  )
    return null;
  return `/api/atproto/blob?${new URLSearchParams({ cid: isBlob(value) ? value.ref.$link : value.cid, mimetype: value.mimeType })}`;
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(/%3A/g, ':');
}

export function blueskyProfileUrl(identifier: string): string {
  return `https://bsky.app/profile/${encodePathSegment(identifier)}`;
}

export function blueskyUrl(uri: string): string | null {
  const match = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)$/.exec(uri);
  return match
    ? `${blueskyProfileUrl(match[1])}/post/${encodeURIComponent(match[2])}`
    : null;
}

export function recordUrl(uri: string): string | null {
  return /^at:\/\/[^/]+\/[^/]+\/[^/?#]+$/.test(uri)
    ? `https://pdsls.dev/at/${uri.slice(5).split('/').map(encodePathSegment).join('/')}`
    : null;
}
