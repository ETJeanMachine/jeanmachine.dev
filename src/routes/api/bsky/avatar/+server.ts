import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  let api_url = url.searchParams.get('pds');
  const did = url.searchParams.get('did');

  if (!did) {
    throw error(400, 'Missing DID parameter');
  }

  if (!api_url) {
    api_url = 'https://public.api.bsky.app';
  }

  const collection = 'app.bsky.actor.profile';
  const request_url = `${api_url}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=${collection}&rkey=self`;
  const response = await fetch(request_url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  const cid = data.value.avatar.ref.$link;
  const imageUrl = `${api_url}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw error(response.status, 'Failed to fetch image');
    }

    const blob = await response.blob();

    return new Response(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    throw error(500, 'Failed to proxy image');
  }
};
