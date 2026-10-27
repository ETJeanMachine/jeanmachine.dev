import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DID } from '$lib/constants';
import { pdsJson } from '$lib/server/pds';

export const GET: RequestHandler = async ({ url }) => {
  const collection = url.searchParams.get('collection');
  const cursor = url.searchParams.get('cursor');
  const limit = url.searchParams.get('limit');

  if (!collection) {
    throw error(400, 'Missing collection');
  }

  const data = await pdsJson(
    'com.atproto.repo.listRecords',
    { repo: DID, collection, cursor: cursor || '', limit: limit || '' },
    'Failed to fetch records',
  );

  return json(data, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
