// place files you want to import through the `$lib` alias in this folder.
import { LEAFLET_PUB_RKEY } from '$lib/constants';
import { PubLeafletPublication } from '@atcute/leaflet';
import { type Blob, type LegacyBlob } from '@atcute/lexicons';
import { isBlob, isLegacyBlob } from '@atcute/lexicons/interfaces';

export async function loadPublication(): Promise<PubLeafletPublication.Main> {
  const params = new URLSearchParams('');
  params.append('collection', 'pub.leaflet.publication');
  params.append('rkey', LEAFLET_PUB_RKEY);
  const response = await fetch(`/api/atproto/record?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const publication: PubLeafletPublication.Main = (await response.json()).value;
  return publication;
}

export function blobUri(
  blob: Blob<string> | LegacyBlob<string> | undefined,
): string {
  if (isBlob(blob)) {
    return `/api/atproto/blob?cid=${blob.ref.$link}&mimetype=${blob.mimeType}`;
  } else if (isLegacyBlob(blob)) {
    return `/api/atproto/blob?cid=${blob.cid}&mimetype=${blob.mimeType}`;
  } else {
    throw new Error('Invalid blob: blob is undefined or has invalid format');
  }
}
