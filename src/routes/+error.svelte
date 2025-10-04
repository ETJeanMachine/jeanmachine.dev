<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="container">
  <div class="card">
    <div class="card-content">
      <div class=""></div>
      <h1>{$page.status}</h1>
      <p>{$page.error?.message ?? 'An error occurred'}</p>
      <div class="error-gif">
        <img src="/error.gif" alt="Um... Eto... Bweh!" />
      </div>
      <a href="/">Go home</a>
    </div>
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: center;
  }

  .card-content {
    justify-content: center;
    text-align: center;
  }

  .error-gif {
    background-color: var(--fg);
    aspect-ratio: 4 / 1;
    border-radius: 8px;
    border: 5px solid var(--dark3);
  }
</style>
