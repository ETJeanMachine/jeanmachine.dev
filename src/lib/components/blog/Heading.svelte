<script lang="ts">
  import type { PubLeafletBlocksHeader } from '@atcute/leaflet';
  import RichText from './RichText.svelte';
  let { value, id }: { value: PubLeafletBlocksHeader.Main; id: string } =
    $props();
  const tag = $derived(`h${Math.max(2, Math.min(6, value.level ?? 2))}`);
</script>

<svelte:element this={tag} {id} class="article-heading"
  ><RichText text={value.plaintext} facets={value.facets} scope={id} />
  <a
    class="heading-anchor"
    href={`#${id}`}
    aria-label={`Link to ${value.plaintext}`}>#</a
  ></svelte:element
>
