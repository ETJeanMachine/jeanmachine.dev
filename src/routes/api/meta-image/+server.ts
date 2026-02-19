import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DID, PDS_URL, LEAFLET_PUB_RKEY } from '$lib/constants';
import type { PubLeafletPublication } from '@atcute/leaflet';
import { isBlob, isLegacyBlob } from '@atcute/lexicons/interfaces';

export const GET: RequestHandler = async ({ url }) => {
  const collection = 'pub.leaflet.publication';
  const rkey = LEAFLET_PUB_RKEY;

  if (!collection) {
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

  let data: PubLeafletPublication.Main = (await response.json()).value;
  if (data == null) {
    throw error(response.status, '');
  }

  if (!data.icon) {
    throw error(404, 'Icon not found');
  }

  const mimeType = data.icon.mimeType;
  let cid: string;
  if (isBlob(data.icon)) {
    cid = data.icon.ref.$link;
  } else if (isLegacyBlob(data.icon)) {
    cid = data.icon.cid;
  } else {
    throw error(400, 'Blob error');
  }

  const blobUrl = `${PDS_URL}/xrpc/com.atproto.sync.getBlob?did=${DID}&cid=${cid}`;

  try {
    const response = await fetch(blobUrl);

    if (!response.ok) {
      throw error(response.status, 'Failed to fetch blob');
    }

    const blob = await response.blob();

    return new Response(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || `${mimeType}`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    throw error(500, 'Failed to proxy blob');
  }
};
