import { error } from '@sveltejs/kit';
import { DID, PDS_URL } from '$lib/constants';

function pdsUrl(method: string, params: Record<string, string>): string {
  return `${PDS_URL}/xrpc/${method}?${new URLSearchParams(params)}`;
}

async function request(
  url: string,
  message: string,
  init?: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw error(502, message);
  }
  // Keep HTTP errors outside the network catch so their statuses survive.
  if (!response.ok) throw error(response.status, message);
  return response;
}

// Thin proxy transport only: the blog loader owns its stricter validation/limits.
export async function pdsJson(
  method: string,
  params: Record<string, string>,
  message: string,
): Promise<Record<string, unknown>> {
  const response = await request(pdsUrl(method, params), message, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw error(502, 'Invalid upstream JSON');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw error(502, 'Invalid upstream JSON');
  }
  return data as Record<string, unknown>;
}

export async function pdsBlob(
  cid: string,
  mimeType?: string | null,
): Promise<Response> {
  const response = await request(
    pdsUrl('com.atproto.sync.getBlob', { did: DID, cid }),
    'Failed to fetch blob',
  );
  let blob: Blob;
  try {
    blob = await response.blob();
  } catch {
    throw error(502, 'Failed to read upstream blob');
  }
  return new Response(blob, {
    headers: {
      'Content-Type':
        response.headers.get('Content-Type') ||
        mimeType?.trim() ||
        'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
