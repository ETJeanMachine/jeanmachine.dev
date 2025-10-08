<script lang="ts">
  import type { PubLeafletDocument } from '@atcute/leaflet';
  import { onMount } from 'svelte';
  import { page } from '$app/state';

  let documents = $state<Map<string, PubLeafletDocument.Main>[]>([]);
  let documents_loaded = $state(false);
  let page_count = $state(1);

  $effect(() => {
    const curr_page = parseInt(page.url.searchParams.get('page') || '1');
  });

  // async function getBlogs(page = 0) {
  //   let response = await fetch(
  //     `${PDS_URL}${API_ENDPOINTS.ATPROTO_REPO_LIST_RECORDS}?repo=${HANDLE}&collection=pub.leaflet.document`,
  //   );
  //   let blogs = await response.json();
  //   // reconstructing the array to have only public blog posts.
  //   let blog_entries = blogs.records.map((blog: any) => ({
  //     rkey: blog.uri.split('/').pop(),
  //     title: blog.value.title,
  //     description: blog.value.description,
  //     publishedAt: new Date(blog.value.publishedAt).toLocaleDateString(),
  //   }));
  //   return blog_entries;
  // }

  onMount(async () => {
    const urlParams = new URLSearchParams();
    urlParams.set('collection', 'app.bsky.feed.post');
    urlParams.set('limit', '100');

    let cursor;
    let currentMap = new Map<string, PubLeafletDocument.Main>();

    // fetching records
    do {
      const records = await fetch(
        `/api/atproto/listRecords?${urlParams.toString()}`,
      );
      const response = await records.json();
      for (const record of response.records) {
        const rkey = record.uri.split('/').pop();
        currentMap.set(rkey, record.value);
        // Every 10 records, add the current map to documents and start a new map
        if (currentMap.size === 10) {
          documents.push(currentMap);
          currentMap = new Map<string, PubLeafletDocument.Main>();
        }
      }
      cursor = response.cursor;
      if (cursor) {
        urlParams.set('cursor', cursor);
      }
    } while (cursor);

    // Add any remaining records (if less than 10)
    if (currentMap.size > 0) {
      documents.push(currentMap);
    }

    documents_loaded = true;
  });
</script>

{#if documents_loaded}
  {$inspect(documents)}
{/if}
<!-- <div class="blog-container">
  {#each document_info as blog}
    <article class="card blog">
      <a href="/blog/{blog.rkey}" class="blog-card-link">
        <div class="blog-card-content">
          <header class="blog-card-header">
            <h2 class="blog-card-title">{blog.title}</h2>
            <time class="blog-card-date" datetime={blog.publishedAt}
              >{blog.publishedAt}</time
            >
          </header>
          <p>{blog.description}</p>
        </div>
      </a>
    </article>
  {/each}
</div>

<style>
  .blog-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .blog-card-link {
    display: block;
    text-decoration: none;
    color: inherit;
    height: 100%;
  }

  .blog-card-content {
    padding: 1.5rem;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .blog-card-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .blog-card-title {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.4;
    color: #ffffff;
    margin: 0;
    word-wrap: break-word;
  }

  .blog-card-date {
    font-size: 0.875rem;
    color: #c2c2c2;
    font-weight: 400;
  }

  .blog-card-description {
    margin: 0;
    margin-top: 1rem;
    font-size: 0.9rem;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.8);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .blog-container {
      grid-template-columns: 1fr;
      padding: 1rem;
      gap: 1rem;
    }

    .blog-card-content {
      padding: 1.25rem;
    }
  }
</style> -->
