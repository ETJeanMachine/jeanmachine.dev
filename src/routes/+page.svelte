<script lang="ts">
  async function get_profile() {
    const response = await fetch("/api/profile");
    const data = await response.json();
    return data;
  }
</script>

<h1>Welcome to SvelteKit</h1>
<p>
  Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the
  documentation
</p>
