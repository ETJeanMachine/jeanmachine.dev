import { json } from '@sveltejs/kit';
import { getLanguageStats } from '$lib/server/github';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ setHeaders }) => {
  try {
    const stats = await getLanguageStats();
    setHeaders({
      'cache-control': import.meta.env.DEV ? 'no-store' : 'max-age=1800',
    });
    return json(stats);
  } catch (err) {
    return json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to fetch language stats',
      },
      { status: 500 },
    );
  }
};
