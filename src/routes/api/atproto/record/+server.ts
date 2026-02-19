import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DID, PDS_URL } from '$lib/constants';

export const GET: RequestHandler = async ({ url }) => {
  const collection = url.searchParams.get('collection');
  const rkey = url.searchParams.get('rkey');

  if (!collection || !rkey) {
    throw error(400, 'Missing collection or rkey');
  }

  const request_url = `${PDS_URL}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(DID)}&collection=${collection}&rkey=${rkey}`;
  const response = await fetch(request_url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw error(response.status, 'Failed to fetch record');
  }

  let data = await response.json();
  if (data == null) {
    throw error(response.status, '');
  }

  return json(data, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
