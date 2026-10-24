import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { loadBlogArticle } from '$lib/server/blog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params, setHeaders }) => {
  if (params.rkey === 'example') {
    if (dev) {
      const { exampleArticle } = await import('$lib/server/blog-example');
      setHeaders({ 'Cache-Control': 'no-store' });
      return exampleArticle;
    }
    error(404, 'Document not found');
  }

  const article = await loadBlogArticle(fetch, params.rkey);
  setHeaders({
    'Cache-Control': dev ? 'no-store' : 'public, max-age=60, s-maxage=300',
  });
  return article;
};
