<script lang="ts">
  import { dev } from '$app/environment';
  import {
    isBlob,
    type LegacyBlob,
    type Blob,
    isLegacyBlob,
  } from '@atcute/lexicons/interfaces';
  import { error } from '@sveltejs/kit';

  let {
    blob,
    alt,
    style,
  }: { blob?: Blob<string> | LegacyBlob<string>; alt: string; style?: string } =
    $props();
  let src = $state('');
  let lowQualitySrc = $state('');
  let loaded = $state(false);

  if (isBlob(blob)) {
    src = `/api/atproto/blob?cid=${blob.ref.$link}&mimetype=${blob.mimeType}`;
  } else if (isLegacyBlob(blob)) {
    src = `/api/atproto/blob?cid=${blob.cid}&mimetype=${blob.mimeType}`;
  } else {
    throw error(500);
  }

  function handleLoad() {
    loaded = true;
  }
</script>

<div class="image-container" class:has-placeholder={!dev}>
  {#if !dev}
    <!-- Low-quality blurred placeholder (only in production) -->
    <img
      src={`/cdn-cgi/image/anim=false,quality=low${src}`}
      {alt}
      {style}
      class="blur-placeholder"
      class:hidden={loaded}
      aria-hidden="true"
    />
  {/if}
  <!-- High-quality image -->
  <img
    {src}
    {alt}
    {style}
    onload={handleLoad}
    class="main-image"
    class:loaded
  />
</div>

<style>
  .image-container {
    position: relative;
    display: inline-block;
  }

  .blur-placeholder {
    display: block;
    filter: blur(10px);
    opacity: 1;
    transition: opacity 0.3s ease;
  }

  .blur-placeholder.hidden {
    opacity: 0;
    pointer-events: none;
  }

  .main-image {
    transition: opacity 0.3s ease;
  }

  /* In dev mode, show the image normally */
  .main-image:not(.loaded) {
    opacity: 0;
  }

  .main-image.loaded {
    opacity: 1;
  }

  /* In production with placeholder, position the image absolutely */
  .has-placeholder .main-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style>
