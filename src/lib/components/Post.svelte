<script lang="ts">
  import { onMount } from 'svelte';

  let { rkey = 'self', pinned = false } = $props();
  let post_data: any = $state();

  onMount(async () => {
    const params = new URLSearchParams();
    params.append('collection', 'app.bsky.feed.post');
    params.append('rkey', rkey);
    const response = await fetch(`/api/atproto/record?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    post_data = await response.json();
  });
</script>

<div class="post-container">
  {$inspect(post_data)}
  <p>{post_data?.value?.text}</p>
</div>

<style>
  .post-container {
    border: 2px solid var(--blue0);
    background-color: var(--blue);
    padding: 1rem;
    border-radius: 4px;
  }
</style>
