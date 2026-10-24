<script lang="ts">
  let {
    label = 'This content is not available in the native reader.',
  }: { label?: string } = $props();
</script>

<p class="content-notice">{label}</p>
