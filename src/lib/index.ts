// place files you want to import through the `$lib` alias in this folder.

import { BSKY_API, PDS_URL } from './constants';

// helper function for figuring out if the PDS set is actually available
// or if it's firewalled (which mine often is :/)
export async function selectApiEndpoint() {
  try {
    await fetch(`${PDS_URL}/xrpc/_health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    return PDS_URL;
  } catch {
    return BSKY_API;
  }
}
