import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchHomeBluesky } from '$lib/server/bluesky';

export const GET: RequestHandler = async ({ fetch, request }) => {
  const home = await fetchHomeBluesky(fetch, { signal: request.signal });
  if (!home) {
    return json(
      { error: 'Bluesky feed unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return json(home, {
    headers: { 'Cache-Control': dev ? 'no-store' : 'public, max-age=60' },
  });
};
