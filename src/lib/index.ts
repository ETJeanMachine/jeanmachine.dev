// place files you want to import through the `$lib` alias in this folder.
import { PUBLIC_LEAFLET_RKEY } from '$env/static/public';
import { PubLeafletPublication, PubLeafletThemeColor } from '@atcute/leaflet';
import { type Blob, type LegacyBlob } from '@atcute/lexicons';
import { isBlob, isLegacyBlob } from '@atcute/lexicons/interfaces';

type Colour = PubLeafletThemeColor.Rgb | PubLeafletThemeColor.Rgba;

function colorToCSS(color: Colour | undefined): string {
  if (!color) return '';
  if ('a' in color) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 100})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export async function loadPublication(): Promise<PubLeafletPublication.Main> {
  const params = new URLSearchParams('');
  params.append('collection', 'pub.leaflet.publication');
  params.append('rkey', PUBLIC_LEAFLET_RKEY);
  const response = await fetch(`/api/atproto/record?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const publication: PubLeafletPublication.Main = (await response.json()).value;
  // commenting this out bc the guys over at leaflet have an invalid schema rn
  // if (!is(PubLeafletPublication.mainSchema, publication)) {
  //   console.error('Invalid publication schema');
  // }

  const theme = publication.theme ?? {};

  // Only set CSS variables if we're in the browser (not SSR)
  if (typeof document !== 'undefined') {
    // Set background color
    if (theme.backgroundColor) {
      document.documentElement.style.setProperty(
        '--background-color',
        colorToCSS(theme.backgroundColor),
      );
    }

    // Set background image
    if (theme.backgroundImage?.image) {
      document.documentElement.style.setProperty(
        '--background-image',
        `url(${blobUri(theme.backgroundImage.image)})`,
      );
    }

    // Set CSS variables for theme colors
    if (theme.primary) {
      document.documentElement.style.setProperty(
        '--primary',
        colorToCSS(theme.primary),
      );
    }
    if (theme.pageBackground) {
      document.documentElement.style.setProperty(
        '--page-background',
        colorToCSS(theme.pageBackground),
      );
    }
    if (theme.accentBackground) {
      document.documentElement.style.setProperty(
        '--accent-background',
        colorToCSS(theme.accentBackground),
      );
    }
    if (theme.accentText) {
      document.documentElement.style.setProperty(
        '--accent-text',
        colorToCSS(theme.accentText),
      );
    }
  }
  return publication;
}

export function blobUri(
  blob: Blob<string> | LegacyBlob<string> | undefined,
): string {
  if (isBlob(blob)) {
    return `/api/atproto/blob?cid=${blob.ref.$link}&mimetype=${blob.mimeType}`;
  } else if (isLegacyBlob(blob)) {
    return `/api/atproto/blob?cid=${blob.cid}&mimetype=${blob.mimeType}`;
  } else {
    throw new Error('Invalid blob: blob is undefined or has invalid format');
  }
}

/**
 * Get cache expiration TTL based on NSID (collection type)
 * @param nsid - The NSID/collection identifier
 * @returns TTL in seconds
 */
export function getExpirationTTL(nsid: string): number {
  // Long TTL for static content (1 week)
  if (nsid.startsWith('pub.leaflet.publication')) {
    return 604800; // 7 days
  }
  if (nsid.startsWith('pub.leaflet.document')) {
    return 86400; // 1 day - blog posts may be edited
  }

  // Short TTL for frequently changing content (5 minutes)
  if (nsid.startsWith('app.bsky.feed.post')) {
    return 300; // 5 minutes - posts may be deleted/edited
  }
  if (nsid.startsWith('app.bsky.actor.profile')) {
    return 600; // 10 minutes - profiles change occasionally
  }

  // Default/medium TTL (1 hour)
  return 3600;
}

/**
 * Extract CID from blob reference (supports both new and legacy formats)
 */
export function getBlobCid(blob: any): string | null {
  if (blob?.ref?.$link) return blob.ref.$link; // New format
  if (blob?.cid) return blob.cid; // Legacy format
  return null;
}

/**
 * Recursively find and cache all blobs in a record value
 */
export async function cacheRecordBlobs(
  value: any,
  collection: string,
  rkey: string,
  did: string,
  pdsUrl: string,
  platform: any,
  path: string = ''
) {
  if (!value || typeof value !== 'object') return;

  const EXPIRATION_TTL = getExpirationTTL(collection);

  for (const [key, val] of Object.entries(value)) {
    const currentPath = path ? `${path}.${key}` : key;

    // Check if this is a blob
    if (val && typeof val === 'object' && ((val as any).$type === 'blob' || (val as any).cid)) {
      const cid = getBlobCid(val);
      if (cid) {
        const blobKey = `blob://${did}/${cid}`;
        try {
          // Fetch the blob from PDS
          const blobUrl = `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
          const response = await fetch(blobUrl);
          if (response.ok) {
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            await platform?.env.CACHE.put(blobKey, arrayBuffer, {
              expirationTtl: EXPIRATION_TTL,
            });
            console.log(`[Cache] Cached blob at ${blobKey} (from ${collection}#${currentPath}/${rkey})`);
          }
        } catch (err) {
          console.error(`[Cache] Failed to cache blob ${blobKey}:`, err);
        }
      }
    } else if (typeof val === 'object') {
      // Recursively check nested objects
      await cacheRecordBlobs(val, collection, rkey, did, pdsUrl, platform, currentPath);
    }
  }
}
