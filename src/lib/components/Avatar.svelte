<script lang="ts">
  import { onMount } from 'svelte';

  import { LoaderCircle } from '@lucide/svelte';
  const { circle = false } = $props();

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

{#if avatar_src}
  {#if circle}
    <img
      src={avatar_src}
      alt="Bluesky Avatar"
      class="avatar"
      style="border-radius: 50%;"
    />
  {:else}
    <img src={avatar_src} alt="Bluesky Avatar" class="avatar" />
  {/if}
{:else}
  <div class="avatar-placeholder">
    <div>
      <LoaderCircle size={24} />
    </div>
  </div>
{/if}

<style>
  .avatar {
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
    object-fit: contain;
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
