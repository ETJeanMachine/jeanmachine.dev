<script lang="ts">
  import { getContext, onMount, setContext } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { PubLeafletDocument, PubLeafletPublication } from '@atcute/leaflet';
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
    urlParams.set('collection', 'pub.leaflet.document');
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
    <div class="card">
      {#each keys as key, i}
        {@const doc = documents.get(key)}
        {#if doc && doc?.publishedAt}
          <a href="https://blog.jean.moe/{key}">
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
        {/if}
        {#if i < keys.length - 1}
          <hr />
        {/if}
      {/each}
    </div>
  {/snippet}

  {#if documents.size > 0}
    <div class="blog-header"></div>
    <div class="blog-container">
      {#if leftKeys}
        {@render documentList(leftKeys)}
      {/if}
      {#if rightKeys && rightKeys.length > 0}
        {@render documentList(rightKeys)}
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
      <input
        type="number"
        value={curr_page + 1}
        min={1}
        max={99}
        onchange={(e) => navigateToPage(parseInt(e.currentTarget.value) - 1)}
      />
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
  /* Mobile view - center paginator */
  .blog-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .blog-layout a {
    all: unset;
    cursor: pointer;
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
    color: var(--accent-text);
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
    color: var(--accent-background);
  }

  .paginator input {
    all: unset;
    width: 3ch;
    text-align: center;
    background-color: var(--accent-background);
    padding: 3px;
    border: 1px solid #000;
    border-radius: 4px;
    color: var(--accent-text);
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
    .paginator {
      border: 1px solid #000;
      background-color: var(--page-background);
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
  }
</style>
