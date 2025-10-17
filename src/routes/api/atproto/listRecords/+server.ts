import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_DID, PUBLIC_PDS_URL } from '$env/static/public';

export const GET: RequestHandler = async ({ url }) => {
  const collection = url.searchParams.get('collection');
  const cursor = url.searchParams.get('cursor');
  const limit = url.searchParams.get('limit');

  if (!collection) {
    throw error(400, 'Missing collection');
  }

  const urlParams = new URLSearchParams();
  urlParams.append('repo', PUBLIC_DID);
  urlParams.append('collection', collection);
  urlParams.append('cursor', cursor || '');
  urlParams.append('limit', limit || '');

  const request_url = `${PUBLIC_PDS_URL}/xrpc/com.atproto.repo.listRecords?${urlParams.toString()}`;

  const response = await fetch(request_url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw error(response.status, 'Failed to fetch records');
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
