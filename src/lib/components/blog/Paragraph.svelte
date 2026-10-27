<script lang="ts">
  import type { PubLeafletBlocksText } from '@atcute/leaflet';
  import RichText from './RichText.svelte';
  let { value, id }: { value: PubLeafletBlocksText.Main; id: string } =
    $props();
</script>

<p class="rich-text">
  <RichText text={value.plaintext} facets={value.facets} scope={id} />
</p>
