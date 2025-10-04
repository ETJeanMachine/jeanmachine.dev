import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { selectApiEndpoint } from '$lib';
import { USER_DID } from '$lib/constants';

export const GET: RequestHandler = async ({ url }) => {
  const api_url = await selectApiEndpoint();
  const collection = url.searchParams.get('collection');
  const rkey = url.searchParams.get('rkey');

  const request_url = `${api_url}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(USER_DID)}&collection=${collection}&rkey=${rkey}`;
  console.log(request_url);
  const response = await fetch(request_url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw error(response.status, 'Failed to fetch record');
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
