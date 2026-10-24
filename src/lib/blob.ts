import type { Blob, LegacyBlob } from '@atcute/lexicons';
import { isBlob } from '@atcute/lexicons/interfaces';

/** Construct the same-origin proxy URL after the caller validates its blob policy. */
export function blobUrl(blob: Blob<string> | LegacyBlob<string>): string {
  const params = new URLSearchParams({
    cid: isBlob(blob) ? blob.ref.$link : blob.cid,
    mimetype: blob.mimeType,
  });
  return `/api/atproto/blob?${params}`;
}
