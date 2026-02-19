import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DID, PDS_URL } from '$lib/constants';

export const GET: RequestHandler = async ({ url }) => {
  const cid = url.searchParams.get('cid');
  const mimetype = url.searchParams.get('mimetype');

  if (!cid) {
    throw error(400, 'Missing cid');
  }

  const blobUrl = `${PDS_URL}/xrpc/com.atproto.sync.getBlob?did=${DID}&cid=${cid}`;

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
