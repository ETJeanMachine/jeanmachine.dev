import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_LEAFLET_RKEY } from '$env/static/public';
import type { PubLeafletPublication } from '@atcute/leaflet';
import { getBlobCid } from '$lib';

export const GET: RequestHandler = async ({ fetch }) => {
  const collection = 'pub.leaflet.publication';
  const rkey = PUBLIC_LEAFLET_RKEY;

  // Fetch the publication record using our record API
  const recordParams = new URLSearchParams();
  recordParams.append('collection', collection);
  recordParams.append('rkey', rkey);

  const recordResponse = await fetch(`/api/atproto/record?${recordParams.toString()}`);

  if (!recordResponse.ok) {
    throw error(recordResponse.status, 'Failed to fetch publication record');
  }

  const recordData = await recordResponse.json();
  const publication: PubLeafletPublication.Main = recordData.value;

  if (!publication) {
    throw error(500, 'Invalid publication data');
  }

  if (!publication.icon) {
    throw error(404, 'Icon not found in publication');
  }

  // Extract the CID from the icon blob
  const cid = getBlobCid(publication.icon);
  if (!cid) {
    throw error(400, 'Invalid blob reference');
  }

  // Fetch the blob using our blob API
  const blobParams = new URLSearchParams();
  blobParams.append('cid', cid);
  blobParams.append('mimetype', publication.icon.mimeType);

  const blobResponse = await fetch(`/api/atproto/blob?${blobParams.toString()}`);

  if (!blobResponse.ok) {
    throw error(blobResponse.status, 'Failed to fetch icon blob');
  }

  // Return the blob with appropriate headers
  const blob = await blobResponse.blob();
  return new Response(blob, {
    headers: {
      'Content-Type': publication.icon.mimeType,
      'Cache-Control': 'public, max-age=604800', // 7 days - icons rarely change
    },
  });
};
