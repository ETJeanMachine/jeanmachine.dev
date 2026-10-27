<script lang="ts">
  import { Pin } from '@lucide/svelte';
  import Post from './Post.svelte';
  import type { BlueskyProfile } from '$lib/bluesky';
  import type { HomeState } from '$lib/home';

  const {
    author,
    pinned,
    counts,
    handle,
  }: {
    author: BlueskyProfile | null;
    pinned: HomeState['pinned'];
    counts: HomeState['counts'];
    handle: HomeState['handle'];
  } = $props();
</script>

<h2 class="home-heading">
  <Pin size={'1.25rem'} strokeWidth={2.5} /> Pinned Post
</h2>
{#if pinned.error}
  <p>{pinned.error}</p>
{:else if pinned.status === 'loading'}
  <p>Loading…</p>
{:else if pinned.data && author}
  <div class="post-container">
    <Post
      post={pinned.data}
      {author}
      likeCount={counts.data?.likeCount ?? 0}
      repostCount={counts.data?.repostCount ?? 0}
      replyCount={counts.data?.replyCount ?? 0}
      handle={handle.data ?? ''}
    />
  </div>
  {#if counts.error}
    <p>{counts.error}</p>
  {/if}
  {#if handle.error}
    <p>{handle.error}</p>
  {/if}
{:else}
  <p>No pinned post.</p>
{/if}

<style>
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
