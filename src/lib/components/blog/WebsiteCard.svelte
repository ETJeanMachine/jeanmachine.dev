<script lang="ts">
  import type { PubLeafletBlocksWebsite } from '@atcute/leaflet';
  import { imageUrl, safeWebUrl } from '$lib/blog/urls';
  import '../post-card.css';
  let { value }: { value: PubLeafletBlocksWebsite.Main } = $props();
  const href = $derived(safeWebUrl(value.src));
  const image = $derived(imageUrl(value.previewImage));
  const standard = $derived(
    !!href && new URL(href).hostname === 'standard.site',
  );
  let failedImage = $state<string | null>(null);
  $effect(() => {
    value.src;
    value.previewImage;
    failedImage = null;
  });
</script>

{#snippet card()}
  <span class="website-copy">
    <span class="website-heading">
      {#if standard}<img
          class="embed-provider-icon"
          src="/assets/standard-site-favicon.png"
          alt="Standard.site"
          width="20"
          height="20"
        />{/if}
      <strong>{value.title || 'Website'}</strong>
    </span>
    <span class="website-details">
      {#if value.description}<span>{value.description}</span>{/if}
      <small
        >{href ? new URL(href).hostname : 'Unsafe or unavailable URL'}</small
      >
    </span>
  </span>
  {#if image && failedImage !== image}
    <img
      class="website-media-preview"
      src={image}
      alt=""
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      onerror={() => (failedImage = image)}
    />
  {/if}
{/snippet}
{#if href}
  <a class="website-card post-card" {href} rel="noopener noreferrer"
    >{@render card()}</a
  >
{:else}
  <div class="website-card post-card">{@render card()}</div>
{/if}
