<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status}</title>
</svelte:head>

<div class="container">
  <div class="card">
    <div class="card-content">
      <h1>{page.status} - {page.error?.message ?? 'An error occurred'}</h1>
      <img src="/error.gif" alt="Um... Eto... Bweh!" />
    </div>
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: row;
    gap: 15px;
    align-items: start;
  }

  .card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
