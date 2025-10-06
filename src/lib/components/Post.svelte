<script lang="ts">
  import { onMount } from 'svelte';
  import Page from '../../routes/blog/[slug]/+page.svelte';

  let { rkey = 'self', pinned = false } = $props();
  const params = new URLSearchParams();
  params.append('rkey', rkey);
  let post_data: any = $state();

  onMount(async () => {
    // fetching the pinned post if that's what we're looking for.
    if (pinned) {
      params.append('collection', 'app.bsky.actor.profile');
      const response = await fetch(`/api/atproto/record?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const profile_data = await response.json();
      rkey = profile_data.value.pinnedPost.uri.split('/').pop();
      params.set('rkey', rkey);
    }
    params.set('collection', 'app.bsky.feed.post');
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
