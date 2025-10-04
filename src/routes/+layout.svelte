<script lang="ts">
  let { children } = $props();
  import '../styles/index.css';
  import colors from '$lib/colors.json';
  import { onMount } from 'svelte';

  onMount(() => {
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
  });
</script>

<div class="global_wrapper">
  <nav class="global_nav">
    <a href="/">~</a>
    <a href="/blog">~/blog</a>
    <a href="/projects">~/projects</a>
  </nav>
  <div>
    {@render children()}
  </div>
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    background-color: var(--bg);
  }

  .global_wrapper {
    min-height: 100vh;
    min-width: 100vh;
    display: flex;
    padding: 20px;
    font-family: 'CaskaydiaCove Nerd Font', sans-serif;
    flex-direction: row;
    align-content: center;
  }

  .global_nav {
    display: flex;
    flex-direction: column;
    margin-right: 10px;
    gap: 5px;
  }

  .global_nav a {
    color: var(--magenta);
    text-decoration: none;
    background-color: var(--bg_dark);
    border: 2px solid var(--bg_highlight);
    padding: 2px;
    border-radius: 5px;
    transition: color 0.2s ease;
  }

  .global_nav a:hover {
    background-color: var(--bg_dark1);
    color: var(--magenta2);
  }
</style>
