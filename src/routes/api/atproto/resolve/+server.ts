import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DID, PDS_URL } from '$lib/constants';
import { isDid, isHandle } from '@atcute/lexicons/syntax';

const PLC_DIRECTORY_URL = 'https://plc.directory';

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      redirect: 'error',
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return typeof data === 'object' && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    // A failed candidate must not prevent trying the next resolution source.
    return null;
  }
}

// Candidate handle for a DID, straight from the account's PDS.
async function handleFromPDS(did: string): Promise<string | null> {
  const data = await fetchJson(
    `${PDS_URL}/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(did)}`,
  );
  return isHandle(data?.handle) ? data.handle : null;
}

// Resolve a DID to its handle via the PLC directory's alsoKnownAs entries.
async function handleFromPLC(did: string): Promise<string | null> {
  const data = await fetchJson(
    `${PLC_DIRECTORY_URL}/${encodeURIComponent(did)}`,
  );
  if (!Array.isArray(data?.alsoKnownAs)) return null;
  for (const alias of data.alsoKnownAs) {
    if (typeof alias !== 'string' || !alias.startsWith('at://')) continue;
    const handle = alias.slice('at://'.length);
    if (isHandle(handle)) return handle;
  }
  return null;
}

// Read the handle domain's .well-known file for resolution or DID verification.
async function fetchWellKnown(handle: string): Promise<string | null> {
  if (!isHandle(handle)) return null;
  try {
    // Never follow a handle-controlled redirect to another host or protocol.
    const response = await fetch(`https://${handle}/.well-known/atproto-did`, {
      redirect: 'error',
    });
    if (!response.ok) return null;
    const did = (await response.text()).trim();
    return isDid(did) ? did : null;
  } catch {
    return null;
  }
}

export const GET: RequestHandler = async ({ url, setHeaders }) => {
  const did = url.searchParams.get('did');
  const handle = url.searchParams.get('handle');
  setHeaders({ 'Cache-Control': 'public, max-age=3600' });

  // ?handle=... — reverse resolution: handle → DID via .well-known.
  if (handle) {
    if (!isHandle(handle)) throw error(400, 'Invalid handle');
    const resolvedDid = await fetchWellKnown(handle);
    if (!resolvedDid) {
      throw error(404, 'Could not resolve DID for handle');
    }
    return json({ handle, did: resolvedDid });
  }

  // Default / ?did=... — DID → handle.
  const subject = did ?? DID;
  if (!isDid(subject)) throw error(400, 'Invalid DID');

  // Confirm the PDS candidate against the handle domain before trusting it.
  const pdsHandle = await handleFromPDS(subject);
  if (pdsHandle && (await fetchWellKnown(pdsHandle)) === subject) {
    return json({ did: subject, handle: pdsHandle });
  }

  // Preserve the PLC alias fallback even if the PDS or verification failed.
  const plcHandle = await handleFromPLC(subject);
  if (plcHandle) {
    return json({ did: subject, handle: plcHandle });
  }

  throw error(404, 'Could not resolve handle');
};
