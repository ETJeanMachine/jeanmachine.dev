<script lang="ts">
  import type { PubLeafletBlocksButton } from '@atcute/leaflet';
  import { safeLink } from '$lib/blog/urls';
  let { value }: { value: PubLeafletBlocksButton.Main } = $props();
  const href = $derived(safeLink(value.url));
</script>

<p>
  {#if href}<a class="button-link" {href} rel="noopener noreferrer"
      >{value.text}</a
    >{:else}<span>{value.text}</span>{/if}
</p>
