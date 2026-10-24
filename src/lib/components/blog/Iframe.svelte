<script lang="ts">
  import type { PubLeafletBlocksIframe } from '@atcute/leaflet';
  import { Play } from '@lucide/svelte';
  import { safeFrameUrl, safeWebUrl } from '$lib/blog/urls';
  import '../post-card.css';

  let { value }: { value: PubLeafletBlocksIframe.Main } = $props();
  const src = $derived(value.html ? null : safeFrameUrl(value.url));
  const youtube = $derived(
    src ? new URL(src).hostname === 'www.youtube-nocookie.com' : false,
  );
  const provider = $derived(src ? (youtube ? 'YouTube' : 'Vimeo') : null);
  const href = $derived.by(() => {
    if (value.html) return null;
    if (!src) return safeWebUrl(value.url);
    const url = new URL(src);
    const id = url.pathname.split('/').pop();
    return youtube
      ? `https://www.youtube.com/watch?v=${id}`
      : `https://vimeo.com/${id}${url.search}`;
  });
  const height = $derived(
    typeof value.height === 'number' &&
      Number.isFinite(value.height) &&
      value.height > 0
      ? value.height
      : 360,
  );
  let loadedUrl = $state<string | null>(null);
  $effect.pre(() => {
    // Consent belongs to this source, not a previously visited URL (A → B → A).
    src;
    loadedUrl = null;
  });
</script>

<aside class="post-card native-embed video-embed">
  <header class="embed-header">
    <span class="embed-provider">
      <Play size={20} aria-hidden="true" />
      {provider ? `${provider} video` : 'External media'}
    </span>
  </header>
  {#if src && loadedUrl === src}
    <!-- Only exact external providers pass safeFrameUrl; never same-origin HTML. -->
    <iframe
      class="video-player"
      class:youtube
      {src}
      title={`${provider} video player`}
      sandbox="allow-scripts allow-same-origin allow-presentation"
      referrerpolicy="strict-origin-when-cross-origin"
      {height}
      style:--video-height={`${height}px`}
      allow="encrypted-media; fullscreen; picture-in-picture"
      allowfullscreen
    ></iframe>
  {:else}
    <p class="content-notice">
      {value.html
        ? 'Inline HTML embeds are not displayed in the native reader.'
        : 'External media is not loaded automatically.'}
    </p>
    {#if src}<button type="button" onclick={() => (loadedUrl = src)}
        >Load media from {new URL(src).hostname}</button
      >{/if}
  {/if}
  {#if src}
    <p class="content-notice">
      Loading contacts {provider} and shares your IP address and this site's origin,
      not the article path or query. Playback may use provider storage. If the player
      is unavailable, use the watch link below.
    </p>
  {/if}
  {#if href}
    <div class="embed-footer">
      <a {href} rel="noopener noreferrer"
        >{provider ? `Watch on ${provider}` : 'Open external media'} ↗</a
      >
    </div>
  {/if}
</aside>
