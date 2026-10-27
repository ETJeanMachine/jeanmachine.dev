<script lang="ts">
  import type { PubLeafletBlocksBskyPost } from '@atcute/leaflet';
  import NativeEmbed from './NativeEmbed.svelte';
  let { value }: { value: PubLeafletBlocksBskyPost.Main } = $props();
</script>

<NativeEmbed uri={value.postRef.uri} kind="bluesky" label="Bluesky post" />
