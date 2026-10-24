<script lang="ts">
  import type { ListBlock } from '$lib/blog/normalize';
  import BlockRenderer from './BlockRenderer.svelte';
  import List from './List.svelte';
  let {
    block,
    pageLinks = {},
  }: { block: ListBlock; pageLinks?: Record<string, string> } = $props();
</script>

<svelte:element
  this={block.ordered ? 'ol' : 'ul'}
  start={block.ordered ? block.start : undefined}
>
  {#each block.items as item}
    <li>
      {#if item.checked !== undefined}<span
          role="img"
          aria-label={item.checked ? 'Checked' : 'Unchecked'}
          >{item.checked ? '☑' : '☐'}</span
        >{/if}
      <BlockRenderer block={item.block} {pageLinks} />
      {#if item.nested}<List block={item.nested} {pageLinks} />{/if}
    </li>
  {/each}
</svelte:element>
