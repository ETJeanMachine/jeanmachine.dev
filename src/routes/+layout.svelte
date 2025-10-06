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

<main>
  <div>
    <nav>
      <a href="/">~</a>
      <a href="/blog">~/blog</a>
      <a href="/work">~/work</a>
      <!-- <a href="/projects">~/projects</a> -->
    </nav>
    <div>
      {@render children()}
    </div>
  </div>
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    background-color: var(--bg);
  }

  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    min-width: 100vw;
    padding: 20px;
    font-family: 'CaskaydiaCove Nerd Font', sans-serif;
  }

  main > div {
    width: 75vw;
    flex-direction: column;
    align-content: center;
    display: flex;
    gap: 5px;
  }

  nav {
    display: flex;
    flex-direction: row;
    margin-right: 10px;
    gap: 5px;
  }

  nav > a {
    color: var(--magenta);
    text-decoration: none;
    background-color: var(--bg_dark);
    border: 2px solid var(--bg_highlight);
    padding: 2px;
    border-radius: 5px;
    transition: color 0.2s ease;
    font-size: 16px;
  }

  nav > a:hover {
    background-color: var(--bg_dark1);
    color: var(--magenta2);
  }
</style>
