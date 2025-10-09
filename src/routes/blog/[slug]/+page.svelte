<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import type { PubLeafletDocument } from '@atcute/leaflet';

  const rkey = page.params.slug;
  let document = $state<PubLeafletDocument.Main>();

  onMount(async () => {
    const urlParams = new URLSearchParams();
    urlParams.append('collection', 'pub.leaflet.document');
    if (rkey) {
      urlParams.append('rkey', rkey);
    }
    const response = await fetch(`/api/atproto/record?${urlParams}`);
    if (!response.ok) {
      goto('/404', { replaceState: true });
      return;
    }
    document = (await response.json()).value;
  });
</script>

{#if document}
  <div class="card">
    <h1>{document.title}</h1>
    <h3>{document.description}</h3>
  </div>
{/if}
