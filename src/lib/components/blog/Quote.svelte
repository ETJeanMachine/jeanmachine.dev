<script lang="ts">
  import type { PubLeafletBlocksBlockquote } from '@atcute/leaflet';
  import RichText from './RichText.svelte';
  let { value, id }: { value: PubLeafletBlocksBlockquote.Main; id: string } =
    $props();
</script>

<blockquote class="rich-text">
  <RichText text={value.plaintext} facets={value.facets} scope={id} />
</blockquote>
