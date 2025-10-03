import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { selectApiEndpoint } from '$lib';
import { USER_DID } from '$lib/constants';

export const GET: RequestHandler = async ({ url }) => {
  let api_url = await selectApiEndpoint();

  const collection = 'app.bsky.actor.profile';
  const request_url = `${api_url}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(USER_DID)}&collection=${collection}&rkey=self`;
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
