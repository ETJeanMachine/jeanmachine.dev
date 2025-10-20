<script lang="ts">
  import type {
    PubLeafletBlocksText,
    PubLeafletDocument,
  } from '@atcute/leaflet';
  import { Block } from '$lib/components/leaflet';
  let { document }: { document: PubLeafletDocument.Main } = $props();
</script>

<!-- Text Block Snippet -->
{#snippet textBlock(block: PubLeafletBlocksText.Main)}
  <p>{block.plaintext}</p>
{/snippet}

<h1>{document.title}</h1>
{#if document.publishedAt}
  <p class="date">
    {new Date(document.publishedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}
  </p>
{/if}
<h3>{document.description}</h3>
{#each document.pages as page}
  {#each page.blocks as item}
    {@const block = item.block}
    {#if block.$type == 'pub.leaflet.blocks.text'}
      {$inspect(block)}
      {@render textBlock(block)}
    {/if}
  {/each}
{/each}

<style>
  .date {
    font-size: 0.8rem;
    font-style: italic;
    color: var(--accent-text);
  }
</style>
