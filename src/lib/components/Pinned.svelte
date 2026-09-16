<script lang="ts">
  import { onMount } from 'svelte';
  import { Pin } from '@lucide/svelte';
  import Post from './Post.svelte';
  import { AppBskyFeedPost } from '@atcute/bluesky';
  import type { AppBskyActorProfile } from '@atcute/bluesky';
  import type { Main as StrongRef } from '@atcute/atproto/types/repo/strongRef';
  import { loadProfile } from '$lib';
  import { error } from '@sveltejs/kit';

  let post = $state<AppBskyFeedPost.Main | null>(null);
  let author = $state<AppBskyActorProfile.Main | null>(null);
  let uri: string = $state('');
  let likeCount = $state(0);
  let repostCount = $state(0);
  let replyCount = $state(0);

  onMount(async () => {
    author = await loadProfile();
    if (!author.pinnedPost) {
      throw error(500, { message: 'No pinned post.' });
    }
    uri = (author.pinnedPost as StrongRef).uri;
    let rkey = uri.split('/').pop();
    if (!rkey) {
      throw error(500, { message: 'Failed to fetch pinned post URI' });
    }
    const params = new URLSearchParams();
    params.append('collection', 'app.bsky.feed.post');
    params.append('rkey', rkey);
    const response = await fetch(`/api/atproto/record?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    post = (await response.json()).value;

    const counts_response = await fetch(
      `/api/atproto/postview?uri=${encodeURIComponent(uri)}`,
    );
    if (counts_response.ok) {
      const counts = await counts_response.json();
      likeCount = counts.likeCount;
      repostCount = counts.repostCount;
      replyCount = counts.replyCount;
    }
  });
</script>

<h2>
  <Pin size={'1.25rem'} strokeWidth={2.5} /> Pinned Post
</h2>
{#if post && author}
  <div class="post-container">
    <Post {post} {author} {uri} {likeCount} {repostCount} {replyCount} />
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
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  /* Stretch the post to fill the card's width, overriding Post.svelte's
     fit-content sizing and 30rem cap. */
  .post-container :global(.post) {
    max-width: 100%;
  }
</style>
