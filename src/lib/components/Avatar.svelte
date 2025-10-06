<script lang="ts">
  import { onMount } from 'svelte';

  import { LoaderCircle } from '@lucide/svelte';
  const { size } = $props();

  let avatar_src = $state('');

  onMount(async () => {
    const params = new URLSearchParams();
    params.append('collection', 'app.bsky.actor.profile');
    params.append('rkey', 'self');
    const profile_response = await fetch(`/api/atproto/record?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const profile_data = await profile_response.json();
    avatar_src = `/api/atproto/blob?&cid=${profile_data.value.avatar.ref.$link}`;
  });
</script>

<div class="avatar-container" style="height: {size}px; width: {size}px;">
  {#if avatar_src}
    <img src={avatar_src} alt="Bluesky Avatar" />
  {:else}
    <div class="avatar-placeholder">
      <div>
        <LoaderCircle size={48} />
      </div>
    </div>
  {/if}
</div>

<style>
  .avatar-container {
    background-color: var(--fg);
    display: flex;
    padding: 4px;
    border-radius: 8px;
    transition: opacity 0.3s ease;
    aspect-ratio: 1 / 1;
    flex-shrink: 0;
  }

  .avatar-container > img {
    height: 100%;
    width: 100%;
    border-radius: 4px;
    object-fit: cover;
  }

  .avatar-placeholder {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .avatar-placeholder > div {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
