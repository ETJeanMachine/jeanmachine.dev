<script lang="ts">
  import { onMount } from 'svelte';

  const { rkey } = $props();
  console.log(rkey);
  let post_data: any;

  onMount(async () => {
    const params = new URLSearchParams();
    params.append('collection', 'app.bsky.feed.post');
    params.append('rkey', rkey);
    const response = await fetch(`/api/atproto/record?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    post_data = await response.json();
    console.log(post_data);
  });
</script>
