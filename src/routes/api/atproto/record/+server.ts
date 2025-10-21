import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_DID, PUBLIC_PDS_URL } from '$env/static/public';
import { getExpirationTTL, cacheRecordBlobs } from '$lib';

export const GET: RequestHandler = async ({ url, platform }) => {
  const collection = url.searchParams.get('collection');
  const rkey = url.searchParams.get('rkey');

  if (!collection || !rkey) {
    throw error(400, 'Missing collection or rkey');
  }

  const EXPIRATION_TTL = getExpirationTTL(collection);

  // Use proper AT Protocol URI as cache key
  const atUri = `at://${PUBLIC_DID}/${collection}/${rkey}`;

  // attempting to fetch the cached record
  let cachedData = null;
  try {
    cachedData = await platform?.env.CACHE.get(atUri, { type: 'text' });
  } catch (err) {
    console.error('[Record API] Cache get failed:', err);
  }

  if (cachedData) {
    console.log(`[Record API] Cache hit for ${atUri}`);
    return json(JSON.parse(cachedData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${EXPIRATION_TTL}`,
      },
    });
  }

  // fetching directly from the PDS if not cached already
  console.log(`[Record API] Cache miss for ${atUri} - fetching from PDS`);
  const request_url = `${PUBLIC_PDS_URL}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(PUBLIC_DID)}&collection=${collection}&rkey=${rkey}`;

  try {
    const response = await fetch(request_url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Record API] Failed (${response.status}):`, errorText);
      throw error(response.status, `Failed to fetch record: ${errorText}`);
    }

    let data = await response.json();
    if (data == null) {
      console.error('[Record API] Received null data');
      throw error(500, 'Received null data');
    }

    // try to cache the record, but don't fail if caching doesn't work
    try {
      await platform?.env.CACHE.put(atUri, JSON.stringify(data), {
        expirationTtl: EXPIRATION_TTL,
      });
    } catch (err) {
      console.error('[Record API] Cache put failed:', err);
    }

    // Cache any blobs found in the record
    if (data.value && collection && rkey) {
      await cacheRecordBlobs(data.value, collection, rkey, PUBLIC_DID, PUBLIC_PDS_URL, platform);
    }

    return json(data, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${EXPIRATION_TTL}`,
      },
    });
  } catch (err) {
    console.error('[Record API] Fetch error:', err);
    throw error(500, 'Failed to fetch record');
  }
};
