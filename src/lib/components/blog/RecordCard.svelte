<script lang="ts">
  import NativeEmbed from './NativeEmbed.svelte';
  let {
    uri,
    label,
    intent = 'record',
  }: { uri: string; label: string; intent?: 'record' | 'poll' } = $props();
</script>

<NativeEmbed
  {uri}
  {label}
  kind={intent === 'poll' ? 'fallback' : 'record'}
/>
