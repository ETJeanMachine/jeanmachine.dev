<script lang="ts">
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { SiteStandardDocument } from '@atcute/standard-site';
  import { is } from '@atcute/lexicons';
  import {
    ChevronFirst,
    ChevronLast,
    ChevronLeft,
    ChevronRight,
  } from '@lucide/svelte';

  let documents = $state<Map<string, SiteStandardDocument.Main>>(new Map());
  const curr_page = $derived(
    parseInt(page.url.searchParams.get('page') ?? '0'),
  );
  const keys = $derived(Array.from(documents.keys()));
  const startIndex = $derived(curr_page * 10);
  const leftKeys = $derived(keys.slice(startIndex, startIndex + 5));
  const rightKeys = $derived(keys.slice(startIndex + 5, startIndex + 10));

  let cursor = $state('');
  // fetching the next 5 pages of documents when we need to.
  async function fetchDocs() {
    const urlParams = new URLSearchParams();
    urlParams.set('collection', 'site.standard.document');
    urlParams.set('limit', '50');
    if (cursor) {
      urlParams.set('cursor', cursor);
    }
    const response_map = new Map<string, SiteStandardDocument.Main>();
    // fetching records
    const records = await fetch(
      `/api/atproto/listRecords?${urlParams.toString()}`,
    );
    const response = await records.json();
    // going through the records we retrieved (they should be reverse-chronological)
    for (const record of response.records) {
      const rkey = record.uri.split('/').pop();
      if (rkey && is(SiteStandardDocument.mainSchema, record.value)) {
        response_map.set(rkey, record.value);
      }
    }
    cursor = response.cursor;
    documents = new Map([...documents, ...response_map]);
  }

  async function fetchRemainingDocs() {
    do {
      await fetchDocs();
    } while (cursor);
  }

  async function navigateToPage(pageNum: number) {
    // Fetch more documents if we're going to the last page
    if (pageNum == -1) {
      await fetchRemainingDocs();
      pageNum = Math.ceil(documents.size / 10) - 1;
    } else {
      // Calculate how many pages we currently have
      let totalPages = Math.ceil(documents.size / 10);

      // Only fetch if we're moving forward and near the end
      if (pageNum > curr_page && pageNum >= totalPages - 2 && cursor) {
        // Calculate how many additional pages we need to have a buffer
        const pagesNeeded = Math.max(1, pageNum - totalPages + 3);

        // Fetch documents until we have enough pages
        for (let i = 0; i < pagesNeeded && cursor; i++) {
          await fetchDocs();
        }
      }
    }

    goto(`?page=${pageNum}`, { replaceState: true });
  }

  onMount(async () => {
    await fetchDocs();
  });
</script>

<div class="blog-layout">
  {#snippet documentList(keys: string[])}
    <div class="blog-column">
      {#each keys as key (key)}
        {@const doc = documents.get(key)}
        {#if doc && doc.publishedAt}
          <article class="card blog-post">
            <a href="/blog/{key}">
              <div>
                <h2>{doc.title}</h2>
                <p class="date">
                  {new Date(doc.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <p>{doc.description}</p>
            </a>
          </article>
        {/if}
      {/each}
    </div>
  {/snippet}

  {#if dev && curr_page === 0}
    <article class="card blog-post">
      <a href="/blog/example">
        <div><h2>Example post — development only</h2></div>
        <p>Local Leaflet component rendering examples. Not a published post.</p>
      </a>
    </article>
  {/if}

  {#if documents.size > 0}
    <div class="blog-container">
      {@render documentList(leftKeys)}
      {#if rightKeys.length > 0}
        {@render documentList(rightKeys)}
      {/if}
    </div>
    <div class="paginator card">
      {#snippet pageControls(backwards: boolean)}
        {@const disabled = backwards
          ? curr_page === 0
          : curr_page >= Math.floor(documents.size / 10) - 2}
        {@const targets = backwards ? [0, curr_page - 1] : [curr_page + 1, -1]}
        {#each backwards ? [ChevronFirst, ChevronLeft] : [ChevronRight, ChevronLast] as Icon, i}
          {#if disabled}
            <Icon strokeWidth={0.5} color="grey" />
          {:else}
            <button onclick={() => navigateToPage(targets[i])}><Icon /></button>
          {/if}
        {/each}
      {/snippet}
      {@render pageControls(true)}
      <input
        type="number"
        value={curr_page + 1}
        min={1}
        max={99}
        onchange={(e) => navigateToPage(parseInt(e.currentTarget.value) - 1)}
      />
      {@render pageControls(false)}
    </div>
  {/if}
</div>

<style>
  /* Mobile view - center paginator */
  .blog-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .blog-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .blog-column {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 10px;
  }

  .blog-post {
    box-sizing: border-box;
    width: 100%;
  }

  .blog-layout a {
    all: unset;
    display: block;
    cursor: pointer;
  }

  .blog-layout a:focus-visible {
    outline: 2px solid var(--sapphire);
    outline-offset: 4px;
  }

  .blog-layout a:hover {
    filter: brightness(0.8);
    h2,
    .date {
      text-decoration: underline;
    }
  }

  .blog-layout a div {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    * {
      margin-bottom: 0px;
    }
  }

  .date {
    color: var(--subtext);
    font-style: italic;
  }

  .paginator {
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    max-width: 150px;
  }

  .paginator button {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .paginator button:hover {
    color: var(--sapphire);
  }

  .paginator input {
    all: unset;
    width: 3ch;
    text-align: center;
    background-color: var(--sapphire);
    padding: 3px;
    border: 1px solid #000;
    border-radius: 4px;
    color: var(--base);
    text-decoration: underline;
  }

  .paginator input::-webkit-outer-spin-button,
  .paginator input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .paginator input[type='number'] {
    appearance: textfield;
    -moz-appearance: textfield;
  }

  @media (max-width: 768px) {
    .blog-layout > .blog-post {
      margin-bottom: 10px;
    }

    .blog-post {
      border: 1px solid var(--overlay);
      border-radius: 20px;
      padding: 10px;
    }

    .paginator {
      border: 1px solid #000;
      background-color: color-mix(in srgb, var(--mantle) 80%, transparent);
      padding: 4px;
      border-radius: 4px;
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
    }

    .blog-layout {
      padding-bottom: 40px;
    }
  }

  @media (min-width: 769px) {
    .blog-layout {
      gap: 10px;
    }

    .blog-container {
      flex-direction: row;
    }
  }
</style>
