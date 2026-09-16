import { json } from '@sveltejs/kit';
import { getContributionCalendar } from '$lib/server/github';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ setHeaders }) => {
  try {
    const calendar = await getContributionCalendar();
    setHeaders({
      'cache-control': import.meta.env.DEV ? 'no-store' : 'max-age=1800',
    });
    return json(calendar);
  } catch (err) {
    return json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to fetch contributions',
      },
      { status: 500 },
    );
  }
};
