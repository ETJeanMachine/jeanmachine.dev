<script lang="ts">
  import NativeEmbed from './NativeEmbed.svelte';
  let { uri, label }: { uri: string; label: string } = $props();
</script>

<NativeEmbed
  {uri}
  {label}
  kind={label.startsWith('Poll') ? 'fallback' : 'record'}
/>
