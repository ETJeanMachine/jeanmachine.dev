import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { USER_DID, PDS_URL } from '$lib/constants';

export const GET: RequestHandler = async ({ url }) => {
  const collection = url.searchParams.get('collection');
  const rkey = url.searchParams.get('rkey');

  if (!collection) {
    throw error(400, 'Missing collection or rkey');
  }

  const request_url = `${PDS_URL}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(USER_DID)}&collection=${collection}&rkey=${rkey}`;
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

  // Recursively replace blob objects with API references
  function replaceBlobsWithReferences(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(replaceBlobsWithReferences);
    }

    if (obj.$type === 'blob' && obj.ref) {
      const cid = obj.ref.$link || obj.ref;
      const mimeType = obj.mimeType || '';
      return `/api/atproto/blob?cid=${encodeURIComponent(cid)}&mimetype=${encodeURIComponent(mimeType)}`;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceBlobsWithReferences(value);
    }
    return result;
  }

  data = replaceBlobsWithReferences(data);

  return json(data, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
