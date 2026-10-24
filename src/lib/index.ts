import type { Blob, LegacyBlob } from '@atcute/lexicons';
import { isBlob, isLegacyBlob } from '@atcute/lexicons/interfaces';
import { blobUrl } from './blob';

export function blobUri(
  blob: Blob<string> | LegacyBlob<string> | undefined,
): string {
  if (!isBlob(blob) && !isLegacyBlob(blob)) {
    throw new Error('Invalid blob: blob is undefined or has invalid format');
  }
  return blobUrl(blob);
}
