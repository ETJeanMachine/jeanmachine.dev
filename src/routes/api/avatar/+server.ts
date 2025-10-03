import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    throw error(400, 'Missing url parameter');
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw error(response.status, 'Failed to fetch image');
    }

    const blob = await response.blob();

    return new Response(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    throw error(500, 'Failed to proxy image');
  }
};
