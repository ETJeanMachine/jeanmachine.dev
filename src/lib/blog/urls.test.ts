// @ts-ignore Bun supplies bun:test at runtime; no global Bun types are needed by the app.
import { describe, expect, test } from 'bun:test';
import { blobUri } from '../index';
import { imageUrl } from './urls';

const cid = `bafkrei${'a'.repeat(52)}`;
const blob = (mimeType: string, legacy = false) =>
  legacy
    ? { cid, mimeType }
    : { $type: 'blob' as const, ref: { $link: cid }, mimeType, size: 100 };

describe('blob URL contracts', () => {
  test('modern and legacy raster images share the same encoded proxy URL', () => {
    for (const mimeType of [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
    ]) {
      for (const legacy of [false, true]) {
        const value = blob(mimeType, legacy);
        const href = imageUrl(value);
        expect(href).toBe(
          `/api/atproto/blob?cid=${cid}&mimetype=${encodeURIComponent(mimeType)}`,
        );
        expect(blobUri(value)).toBe(href);
        const url = new URL(href!, 'https://example.com');
        expect(url.pathname).toBe('/api/atproto/blob');
        expect([...url.searchParams]).toEqual([
          ['cid', cid],
          ['mimetype', mimeType],
        ]);
        expect(url.hash).toBe('');
      }
    }
  });

  test('blobUri retains arbitrary MIME support while imageUrl rejects non-allowlisted MIME types', () => {
    for (const mimeType of [
      'image/svg+xml',
      'image/bmp',
      'image/jpg',
      'IMAGE/PNG',
      'image/png; charset=utf-8',
      'text/html',
      'application/octet-stream',
      'text/plain; charset=utf-8&cid=other#fragment',
    ]) {
      for (const legacy of [false, true]) {
        const value = blob(mimeType, legacy);
        expect(imageUrl(value)).toBeNull();
        const url = new URL(blobUri(value), 'https://example.com');
        expect([...url.searchParams]).toEqual([
          ['cid', cid],
          ['mimetype', mimeType],
        ]);
        expect(url.hash).toBe('');
      }
    }
  });

  test('malformed blobs return null for images but throw the existing blobUri error', () => {
    for (const value of [
      undefined,
      null,
      '',
      {},
      [],
      { $type: 'blob', ref: { $link: cid }, size: 100 },
      { $type: 'blob', ref: { $link: cid }, mimeType: 'image/png' },
      { $type: 'blob', ref: { $link: 42 }, mimeType: 'image/png', size: 100 },
      { $type: 'blob', ref: null, mimeType: 'image/png', size: 100 },
      { cid, mimeType: 42 },
      { mimeType: 'image/png' },
    ]) {
      expect(imageUrl(value)).toBeNull();
      expect(() => blobUri(value as Parameters<typeof blobUri>[0])).toThrow(
        'Invalid blob: blob is undefined or has invalid format',
      );
    }
  });
});
