import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DID } from '$lib/constants';
import { pdsJson } from '$lib/server/pds';

export const GET: RequestHandler = async ({ url }) => {
  const collection = url.searchParams.get('collection');
  const rkey = url.searchParams.get('rkey');

  if (!collection || !rkey) {
    throw error(400, 'Missing collection or rkey');
  }

  const data = await pdsJson(
    'com.atproto.repo.getRecord',
    { repo: DID, collection, rkey },
    'Failed to fetch record',
  );

  return json(data, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
