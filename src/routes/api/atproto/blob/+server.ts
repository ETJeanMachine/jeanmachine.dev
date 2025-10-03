import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const pds = url.searchParams.get('pds');
  const did = url.searchParams.get('did');
  const cid = url.searchParams.get('cid');
  const mimetype = url.searchParams.get('cid');

  let api_url = 'https://public.api.bsky.app';

  if (pds) {
    try {
      await fetch(`${pds}/xrpc/_health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      api_url = pds;
    } catch {
      console.log('Failed to reach PDS.');
    }
  }

  const blobUrl = `${api_url}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;

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
