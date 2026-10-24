<script lang="ts">
  import type {
    PubLeafletBlocksImage,
    PubLeafletBlocksImageGallery,
  } from '@atcute/leaflet';
  import { imageUrl } from '$lib/blog/urls';
  let {
    value,
    caption,
  }: {
    value: PubLeafletBlocksImage.Main | PubLeafletBlocksImageGallery.Image;
    caption?: string;
  } = $props();
  const src = $derived(imageUrl(value.image));
  const width = $derived(
    value.aspectRatio.width > 0 ? value.aspectRatio.width : undefined,
  );
  const height = $derived(
    value.aspectRatio.height > 0 ? value.aspectRatio.height : undefined,
  );
</script>

<figure
  style:max-width={'width' in value &&
  typeof value.width === 'number' &&
  value.width > 0
    ? `${Math.min(value.width, 4096)}px`
    : undefined}
>
  {#if src}<img
      {src}
      alt={value.alt ?? ''}
      {width}
      {height}
      loading="lazy"
      decoding="async"
    />{:else}<p class="content-notice">
      Image unavailable{value.alt ? `: ${value.alt}` : ''}.
    </p>{/if}
  {#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>
