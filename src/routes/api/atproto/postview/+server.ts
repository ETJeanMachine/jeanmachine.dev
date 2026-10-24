import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { embedTarget, postPreview } from '$lib/blog/embeds';

const APPVIEW_URL = 'https://public.api.bsky.app';

export const GET: RequestHandler = async ({ url }) => {
  const uri = url.searchParams.get('uri');

  if (!uri) {
    throw error(400, 'Missing uri');
  }

  const preview = url.searchParams.get('preview') === '1';
  if (preview && !embedTarget(uri, 'bluesky').request) {
    throw error(400, 'Invalid post uri');
  }

  const request_url = `${APPVIEW_URL}/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`;
  let response: Response;
  try {
    response = await fetch(request_url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    throw error(502, 'Failed to fetch post view');
  }

  if (!response.ok) {
    throw error(response.status, 'Failed to fetch post view');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw error(502, 'Invalid upstream post view');
  }
  if (typeof data !== 'object' || data === null || !Array.isArray(data.posts)) {
    throw error(502, 'Invalid upstream post view');
  }
  if (data.posts.length === 0) {
    throw error(404, 'Post not found');
  }
  const post = data.posts[0];
  if (typeof post !== 'object' || post === null || Array.isArray(post)) {
    throw error(502, 'Invalid upstream post view');
  }

  const metadata = preview ? postPreview(post, uri) : null;
  if (preview && !metadata) {
    throw error(502, 'Invalid upstream post preview');
  }

  return json(
    {
      ...(preview
        ? (metadata?.stats ?? { likeCount: 0, repostCount: 0, replyCount: 0 })
        : {
            likeCount: post.likeCount ?? 0,
            repostCount: post.repostCount ?? 0,
            replyCount: post.replyCount ?? 0,
          }),
      ...(metadata
        ? {
            post: {
              author: metadata.author,
              text: metadata.text,
              createdAt: metadata.date,
              ...(metadata.images ? { images: metadata.images } : {}),
              ...(metadata.external ? { external: metadata.external } : {}),
            },
          }
        : {}),
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
};
