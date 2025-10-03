import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const pds = url.searchParams.get('pds');
  const did = url.searchParams.get('did');

  if (!did) {
    throw error(400, 'Missing DID parameter');
  }

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

  const collection = 'app.bsky.actor.profile';
  const request_url = `${api_url}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=${collection}&rkey=self`;
  const response = await fetch(request_url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw error(response.status, 'Failed to fetch profile');
  }

  const data = await response.json();
  console.log(data);

  return json(data, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
