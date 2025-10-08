<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { PubLeafletDocument, PubLeafletPublication } from '@atcute/leaflet';
  import { is } from '@atcute/lexicons';
  import {
    ChevronFirst,
    ChevronLast,
    ChevronLeft,
    ChevronRight,
  } from '@lucide/svelte';

  let documents = $state<Map<string, PubLeafletDocument.Main>>(new Map());
  let leftKeys = $state<string[]>();
  let rightKeys = $state<string[]>();
  const publicationContext = getContext<{
    value: PubLeafletPublication.Main | null;
  }>('publication');
  let curr_page = $state(0);

  $effect(() => {
    curr_page = parseInt(page.url.searchParams.get('page') ?? '0');
    if (documents && documents.size > 0) {
      const startIndex = curr_page * 10;
      const keyArray = Array.from(documents.keys());

      // Get first 5 items for left column
      leftKeys = keyArray.slice(startIndex, startIndex + 5);

      // Get next 5 items for right column (only if we have more than 5 items)
      rightKeys = keyArray.slice(startIndex + 5, startIndex + 10);
    }
  });

  let cursor = $state('');
  // fetching the next 5 pages of documents when we need to.
  async function fetchDocs() {
    const urlParams = new URLSearchParams();
    urlParams.set('collection', 'app.bsky.feed.post');
    urlParams.set('limit', '50');
    if (cursor) {
      urlParams.set('cursor', cursor);
    }
    const response_map = new Map<string, PubLeafletDocument.Main>();
    // fetching records
    const records = await fetch(
      `/api/atproto/listRecords?${urlParams.toString()}`,
    );
    const response = await records.json();
    // going through the records we retrieved (they should be reverse-chronological)
    for (const record of response.records) {
      const rkey = record.uri.split('/').pop();
      // if (is(PubLeafletDocument.mainSchema, record.value)) {
      response_map.set(rkey, record.value);
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
    const totalPages = Math.ceil(documents.size / 10);

    // Fetch more documents if we're on the 2nd to last page or beyond
    if (pageNum == -1) {
      await fetchRemainingDocs();
      pageNum = Math.floor(documents.size / 10);
    } else if (pageNum >= totalPages - 2 && cursor) {
      await fetchDocs();
    }

    goto(`?page=${pageNum}`, { replaceState: true });
  }

  onMount(async () => {
    await fetchDocs();
  });
</script>

<div class="blog-layout">
  {#if documents.size > 0}
    <div class="blog-header"></div>
    <div class="blog-container">
      <div class="card">
        {#each leftKeys as key}
          <p>{documents.get(key).text}</p>
        {/each}
      </div>
      {#if rightKeys}
        <div class="card">
          {#each rightKeys as key}
            <p>{documents.get(key).text}</p>
          {/each}
        </div>
      {/if}
    </div>
    <div class="paginator card">
      {#if curr_page == 0}
        <ChevronFirst strokeWidth={0.5} color="grey" />
        <ChevronLeft strokeWidth={0.5} color="grey" />
      {:else}
        <button onclick={() => navigateToPage(0)}>
          <ChevronFirst />
        </button>
        <button onclick={() => navigateToPage(curr_page - 1)}>
          <ChevronLeft />
        </button>
      {/if}
      <span>{curr_page + 1}</span>
      {#if curr_page >= Math.floor(documents.size / 10) - 2}
        <ChevronRight strokeWidth={0.5} color="grey" />
        <ChevronLast strokeWidth={0.5} color="grey" />
      {:else}
        <button onclick={() => navigateToPage(curr_page + 1)}>
          <ChevronRight />
        </button>
        <button onclick={() => navigateToPage(-1)}>
          <ChevronLast />
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  @media (min-width: 769px) {
    .blog-layout {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .blog-container {
      display: flex;
      gap: 10px;
      width: 100%;
    }

    .paginator {
      display: flex;
      justify-content: space-evenly;
      max-width: 150px;
    }

    .paginator button {
      all: unset;
      cursor: pointer;
    }

    .paginator button:hover {
      color: var(--accent-background);
    }
  }
</style>
