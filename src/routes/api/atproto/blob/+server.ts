import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pdsBlob } from '$lib/server/pds';

export const GET: RequestHandler = async ({ url }) => {
  const cid = url.searchParams.get('cid');
  const mimetype = url.searchParams.get('mimetype');

  if (!cid) {
    throw error(400, 'Missing cid');
  }

  return pdsBlob(cid, mimetype);
};
