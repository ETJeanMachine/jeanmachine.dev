<script lang="ts">
  import { onMount } from 'svelte';
  import { HANDLE, USER_DID } from '$lib/constants';
  import { Pin } from '@lucide/svelte';
  import BlueskyPost from './BlueskyPost.svelte';

  const params = new URLSearchParams();
  let post_data: any = $state(null);
  let author_data: any = $state(null);
  let rkey: string | null = $state(null);

  onMount(async () => {
    params.append('collection', 'app.bsky.actor.profile');
    params.append('rkey', 'self');
    const profile_response = await fetch(
      `/api/atproto/record?${params.toString()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );
    const profile_data = (await profile_response.json()).value;
    author_data = profile_data;
    let rkey = profile_data.pinnedPost.uri.split('/').pop();
    params.set('collection', 'app.bsky.feed.post');
    params.set('rkey', rkey);
    const response = await fetch(`/api/atproto/record?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    post_data = await response.json();
  });
</script>

<h2>
  <Pin size={'1.25rem'} strokeWidth={2.5} /> Pinned Post
</h2>
{#if post_data && author_data}
  <div class="post-container">
    <BlueskyPost post={post_data} author={author_data} />
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
