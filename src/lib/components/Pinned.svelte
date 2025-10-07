<script lang="ts">
  import { onMount } from 'svelte';
  import { Pin } from '@lucide/svelte';
  import BlueskyPost from './BlueskyPost.svelte';
  import { AppBskyActorProfile, AppBskyFeedPost } from '@atcute/bluesky';
  import { error } from '@sveltejs/kit';

  const params = new URLSearchParams();
  let post = $state<AppBskyFeedPost.Main | null>(null);
  let author = $state<AppBskyActorProfile.Main | null>(null);
  let uri: string = $state('');

  onMount(async () => {
    params.append('collection', 'app.bsky.actor.profile');
    params.append('rkey', 'self');
    const profile_response = await fetch(
      `/api/atproto/record?${params.toString()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );
    const profile_data: AppBskyActorProfile.Main = (
      await profile_response.json()
    ).value;
    author = profile_data;
    if (!author.pinnedPost) {
      throw error(500, { message: 'No pinned post.' });
    }
    uri = author.pinnedPost.uri;
    console.log(uri);
    let rkey = uri.split('/').pop();
    if (!rkey) {
      throw error(500, { message: 'Failed to fetch pinned post URI' });
    }
    params.set('collection', 'app.bsky.feed.post');
    params.set('rkey', rkey);
    const response = await fetch(`/api/atproto/record?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    post = (await response.json()).value;
  });
</script>

<h2>
  <Pin size={'1.25rem'} strokeWidth={2.5} /> Pinned Post
</h2>
{#if post && author}
  <div class="post-container">
    <BlueskyPost {post} {author} {uri} />
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
