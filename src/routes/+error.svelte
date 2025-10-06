<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="container">
  <div class="card">
    <div class="card-content">
      <h1>{$page.status} - {$page.error?.message ?? 'An error occurred'}</h1>
      <div class="error-gif">
        <a href="/"
          >Go home
          <img src="/error.gif" alt="Um... Eto... Bweh!" />
        </a>
      </div>
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
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .error-gif {
    background-color: var(--fg);
    border-radius: 8px;
    border: 5px solid var(--dark3);
    transition: background-color 0.3s ease;
  }

  .error-gif:hover {
    background-color: var(--purple);
  }

  .error-gif > a {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: var(--magenta2);
    font-style: italic;
    transition: color 0.3s ease;
  }

  .error-gif > a:hover {
    color: var(--magenta);
  }
</style>
