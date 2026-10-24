import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DID, PDS_URL } from '$lib/constants';

const PLC_DIRECTORY_URL = 'https://plc.directory';

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

// Candidate handle for a DID, straight from the account's PDS.
async function handleFromPDS(did: string): Promise<string | null> {
  const data = (await fetchJson(
    `${PDS_URL}/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(did)}`,
  )) as { handle?: string } | null;
  return data?.handle ?? null;
}

// Resolve a DID to its handle via the PLC directory's alsoKnownAs entries.
async function handleFromPLC(did: string): Promise<string | null> {
  const data = (await fetchJson(
    `${PLC_DIRECTORY_URL}/${encodeURIComponent(did)}`,
  )) as { alsoKnownAs?: string[] } | null;
  const entry = data?.alsoKnownAs?.find((alias) => alias.startsWith('at://'));
  return entry ? entry.slice('at://'.length) : null;
}

// Read the handle domain's .well-known file for resolution or DID verification.
async function fetchWellKnown(handle: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://${encodeURIComponent(handle)}/.well-known/atproto-did`,
    );
    if (!response.ok) {
      return null;
    }
    return (await response.text()).trim();
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
    const resolvedDid = await fetchWellKnown(handle);
    if (!resolvedDid?.startsWith('did:')) {
      throw error(404, 'Could not resolve DID for handle');
    }
    return json({ handle, did: resolvedDid });
  }

  // Default / ?did=... — DID → handle.
  const subject = did ?? DID;

  // 1. The PDS knows the account's current handle...
  const pdsHandle = await handleFromPDS(subject);
  // 2. ...confirm it against the handle domain's .well-known/atproto-did.
  if (pdsHandle && (await fetchWellKnown(pdsHandle)) === subject) {
    return json({ did: subject, handle: pdsHandle });
  }

  // 3. Fall back to the PLC directory, the source of truth for DIDs.
  const plcHandle = await handleFromPLC(subject);
  if (plcHandle) {
    return json({ did: subject, handle: plcHandle });
  }

  throw error(404, 'Could not resolve handle');
};
