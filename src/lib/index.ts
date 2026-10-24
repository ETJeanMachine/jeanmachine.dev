// place files you want to import through the `$lib` alias in this folder.
import type { AppBskyActorProfile } from '@atcute/bluesky';
import type { Blob, LegacyBlob } from '@atcute/lexicons';
import { isBlob, isLegacyBlob } from '@atcute/lexicons/interfaces';

export async function loadProfile(): Promise<AppBskyActorProfile.Main> {
  const params = new URLSearchParams({
    collection: 'app.bsky.actor.profile',
    rkey: 'self',
  });
  const response = await fetch(`/api/atproto/record?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return (await response.json()).value;
}

export function blobUri(
  blob: Blob<string> | LegacyBlob<string> | undefined,
): string {
  if (!isBlob(blob) && !isLegacyBlob(blob)) {
    throw new Error('Invalid blob: blob is undefined or has invalid format');
  }
  const params = new URLSearchParams({
    cid: isBlob(blob) ? blob.ref.$link : blob.cid,
    mimetype: blob.mimeType,
  });
  return `/api/atproto/blob?${params}`;
}
