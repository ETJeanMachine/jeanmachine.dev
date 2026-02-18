<script lang="ts">
  import { onMount } from 'svelte';
  import { Pin } from '@lucide/svelte';
  import { AppBskyActorProfile } from '@atcute/bluesky';
  import BlueskyPost from './BlueskyPost.svelte';
  import { fetchPost, type PostData } from 'bluesky-post-embed/core';

  let data = $state<PostData | null>(null);

  onMount(async () => {
    const params = new URLSearchParams({
      collection: 'app.bsky.actor.profile',
      rkey: 'self',
    });
    const profile_response = await fetch(`/api/atproto/record?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const profile_data: AppBskyActorProfile.Main = (
      await profile_response.json()
    ).value;
    if (!profile_data.pinnedPost) return;
    data = await fetchPost({ uri: profile_data.pinnedPost.uri });
  });
</script>

<h2>
  <Pin size={'1.25rem'} strokeWidth={2.5} /> Pinned Post
</h2>
{#if data}
  <div class="post-container">
    <BlueskyPost {data} />
  </div>
{/if}

<style>
  h2 {
    display: flex;
    flex-direction: row;
    gap: 10px;
    align-items: center;
  }

  .post-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }
</style>
