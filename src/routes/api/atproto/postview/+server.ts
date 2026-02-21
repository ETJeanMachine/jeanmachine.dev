import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const APPVIEW_URL = 'https://public.api.bsky.app';

export const GET: RequestHandler = async ({ url }) => {
  const uri = url.searchParams.get('uri');

  if (!uri) {
    throw error(400, 'Missing uri');
  }

  const request_url = `${APPVIEW_URL}/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`;
  const response = await fetch(request_url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw error(response.status, 'Failed to fetch post view');
  }

  const data = await response.json();
  const post = data.posts?.[0];

  if (!post) {
    throw error(404, 'Post not found');
  }

  return json(
    {
      likeCount: post.likeCount ?? 0,
      repostCount: post.repostCount ?? 0,
      replyCount: post.replyCount ?? 0,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    },
  );
};
