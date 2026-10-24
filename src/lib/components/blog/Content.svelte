<script lang="ts">
  import type { Snippet } from 'svelte';
  import { normalizeContent } from '$lib/blog/normalize';
  import BlockRenderer from './BlockRenderer.svelte';
  import './content.css';
  let {
    content,
    textContent,
    before,
    after,
  }: {
    content: unknown;
    textContent?: string;
    before?: Snippet;
    after?: Snippet;
  } = $props();
  const normalized = $derived(normalizeContent(content, textContent));
</script>

<div class="blog-content">
  {#if !normalized.fallback && normalized.pages.length}
    {#each normalized.pages as page, index (page.id)}
      <section
        class="card article-page"
        id={page.id}
        aria-label={normalized.pages.length > 1
          ? `Article page ${index + 1}`
          : 'Article body'}
      >
        {#if index === 0}{@render before?.()}{/if}
        {#if page.canvas}<p class="content-notice">
            Canvas content is presented in document order for accessible
            reading; spatial positioning is omitted.
          </p>{/if}
        {#each page.blocks as block}<BlockRenderer
            {block}
            pageLinks={normalized.pageLinks}
          />{/each}
        {#if index === normalized.pages.length - 1}{@render after?.()}{/if}
      </section>
    {/each}
  {:else}
    <div class="card article-page">
      {@render before?.()}
      {#if normalized.fallback}
        <p class="content-notice">
          Showing the plain-text version of this article.
        </p>
        <div class="text-fallback">{normalized.fallback}</div>
      {:else}<p class="content-notice">
          No readable article content is available.
        </p>{/if}
      {@render after?.()}
    </div>
  {/if}
  {#if normalized.truncated}<p class="content-notice">
      Some content could not be displayed because it exceeded the native
      reader's size or nesting limits.
    </p>{/if}
</div>
