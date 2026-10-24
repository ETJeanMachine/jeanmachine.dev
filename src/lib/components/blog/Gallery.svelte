<script lang="ts">
  import type { PubLeafletBlocksImageGallery } from '@atcute/leaflet';
  import Image from './Image.svelte';
  let { value }: { value: PubLeafletBlocksImageGallery.Main } = $props();
</script>

<div class="image-gallery" aria-label="Image gallery">
  {#each value.images as image}<Image value={image} />{/each}
</div>
