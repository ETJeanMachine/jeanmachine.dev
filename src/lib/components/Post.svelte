<script lang="ts">
  import { onMount } from 'svelte';
  import { HANDLE, USER_DID } from '$lib/constants';

  let { rkey = null } = $props();
  const params = new URLSearchParams();
  let post_data: any = $state(null);

  onMount(async () => {
    // if no rkey is supplied, we just assume it to be the pinned post.
    if (!rkey) {
      params.append('collection', 'app.bsky.actor.profile');
      params.append('rkey', 'self');
      const response = await fetch(`/api/atproto/record?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const profile_data = (await response.json()).value;
      rkey = profile_data.pinnedPost.uri.split('/').pop();
    }
    params.set('collection', 'app.bsky.feed.post');
    params.set('rkey', rkey);
    const response = await fetch(`/api/atproto/record?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    post_data = await response.json();
  });
</script>

{#if post_data}
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
    <a href={`https://bsky.app/profile/${USER_DID}/post/${rkey}?ref_src=embed`}
      >August 24, 2025 at 6:28 PM</a
    >
  </blockquote>
  <script
    async
    src="https://embed.bsky.app/static/embed.js"
    charset="utf-8"
  ></script>
{/if}
