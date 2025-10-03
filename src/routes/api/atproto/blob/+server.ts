import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { selectApiEndpoint } from '$lib';
import { USER_DID } from '$lib/constants';

export const GET: RequestHandler = async ({ url }) => {
  const cid = url.searchParams.get('cid');
  const mimetype = url.searchParams.get('mimetype');

  const api_url = await selectApiEndpoint();

  const blobUrl = `${api_url}/xrpc/com.atproto.sync.getBlob?did=${USER_DID}&cid=${cid}`;

  try {
    const response = await fetch(blobUrl);

    if (!response.ok) {
      throw error(response.status, 'Failed to fetch blob');
    }

    const blob = await response.blob();

    return new Response(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || `${mimetype}`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    throw error(500, 'Failed to proxy blob');
  }
};
