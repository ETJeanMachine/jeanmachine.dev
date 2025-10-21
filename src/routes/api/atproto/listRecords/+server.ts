import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_DID, PUBLIC_PDS_URL } from '$env/static/public';

export const GET: RequestHandler = async ({ url, platform }) => {
  const collection = url.searchParams.get('collection');
  const cursor = url.searchParams.get('cursor');
  const limit = url.searchParams.get('limit');
  const EXPIRATION_TTL = 3600;

  if (!collection) {
    throw error(400, 'Missing collection');
  }

  console.log(`[ListRecords API] Fetching list for ${collection}`);

  const urlParams = new URLSearchParams();
  urlParams.append('repo', PUBLIC_DID);
  urlParams.append('collection', collection);
  urlParams.append('cursor', cursor || '');
  urlParams.append('limit', limit || '');

  const request_url = `${PUBLIC_PDS_URL}/xrpc/com.atproto.repo.listRecords?${urlParams.toString()}`;

  try {
    const response = await fetch(request_url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ListRecords API] Failed (${response.status}):`, errorText);
      throw error(response.status, `Failed to fetch records: ${errorText}`);
    }

    let data = await response.json();
    if (data == null) {
      console.error('[ListRecords API] Received null data');
      throw error(500, 'Received null data');
    }

    // Cache each individual record with its AT URI
    if (data.records && Array.isArray(data.records)) {
      for (const record of data.records) {
        if (record.uri) {
          try {
            // Create a getRecord-style response for caching
            const cacheData = {
              uri: record.uri,
              cid: record.cid,
              value: record.value,
            };
            await platform?.env.CACHE.put(record.uri, JSON.stringify(cacheData), {
              expirationTtl: EXPIRATION_TTL,
            });
          } catch (err) {
            console.error(`[ListRecords API] Failed to cache record ${record.uri}:`, err);
          }
        }
      }
      console.log(`[ListRecords API] Cached ${data.records.length} individual records`);
    }

    return json(data, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[ListRecords API] Fetch error:', err);
    throw error(500, 'Failed to fetch records');
  }
};
