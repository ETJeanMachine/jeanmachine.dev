import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_DID, PUBLIC_PDS_URL } from '$env/static/public';

export const GET: RequestHandler = async ({ url, platform }) => {
  const cid = url.searchParams.get('cid');
  const EXPIRATION_TTL = 3600;
  let mimetype = url.searchParams.get('mimetype');
  const cacheKey = `blob://${PUBLIC_DID}/${cid}`;

  if (!cid) {
    throw error(400, 'Missing cid');
  }

  const blobUrl = `${PUBLIC_PDS_URL}/xrpc/com.atproto.sync.getBlob?did=${PUBLIC_DID}&cid=${cid}`;

  // attempting to fetch the cache'd blob
  let blob = null;
  try {
    blob = await platform?.env.CACHE.get(cacheKey, { type: `${mimetype}` });
  } catch (err) {
    console.error('Cache get failed:', err);
  }

  // fetching directly from the PDS if not cached already
  if (!blob) {
    try {
      const response = await fetch(blobUrl);

      if (!response.ok) {
        throw error(response.status, 'Failed to fetch blob');
      }

      blob = await response.blob();
      if (!mimetype && response.headers.get('Content-Type')) {
        mimetype = response.headers.get('Content-Type');
      }

      // try to cache it, but don't fail if caching doesn't work
      try {
        const arrayBuffer = await blob.arrayBuffer();
        await platform?.env.CACHE.put(cacheKey, arrayBuffer, {
          type: `${mimetype}`,
          expirationTtl: EXPIRATION_TTL,
        });
        console.log('Blob cached successfully');
      } catch (err) {
        console.error('Cache put failed:', err);
      }
    } catch (err) {
      console.error('Blob fetch error:', err);
      throw error(500, 'Failed to fetch blob');
    }
  }

  return new Response(blob, {
    headers: {
      'Content-Type': `${mimetype}`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
