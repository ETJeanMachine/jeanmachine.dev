<script lang="ts">
  import { onMount } from 'svelte';
  import { HANDLE, USER_DID } from '$lib/constants';
  import { Pin } from '@lucide/svelte';

  const params = new URLSearchParams();
  let post_data: any = $state(null);
  let rkey: string | null = $state(null);

  onMount(async () => {
    params.append('collection', 'app.bsky.actor.profile');
    params.append('rkey', 'self');
    const profile_response = await fetch(
      `/api/atproto/record?${params.toString()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );
    const profile_data = (await profile_response.json()).value;
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

<h2 style="display: flex; flex-direction: row; gap: 10px;">
  <Pin size={18} strokeWidth={2.5} /> Pinned Post
</h2>
{#if post_data}
  <div class="post">
    <blockquote
      class="bluesky-embed"
      data-bluesky-uri={post_data.uri}
      data-bluesky-cid={post_data.cid}
      data-bluesky-embed-color-mode="system"
    >
      <p lang="en">
        bridge.<br /><br /><a
          href={`https://bsky.app/profile/${HANDLE}/post/${rkey}?ref_src=embed`}
          >[image or embed]</a
        >
      </p>
      &mdash; jean (<a href={`https://bsky.app/profile/${HANDLE}?ref_src=embed`}
        >@jeanmachine.dev</a
      >)
      <a
        href={`https://bsky.app/profile/${USER_DID}/post/${rkey}?ref_src=embed`}
        >August 24, 2025 at 6:28 PM</a
      >
    </blockquote>
    <script
      async
      src="https://embed.bsky.app/static/embed.js"
      charset="utf-8"
    ></script>
  </div>
{/if}

<style>
  .post {
    width: 100%;
    max-width: 100%;
  }

  .post :global(blockquote.bluesky-embed) {
    max-width: 100% !important;
    width: 100% !important;
  }
</style>
