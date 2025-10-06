<script lang="ts">
  let { children } = $props();
  import '../styles/index.css';
  import colors from '$lib/colors.json';
  import { loadPublication } from '$lib';
  import { onMount } from 'svelte';
  import { page } from '$app/state';

  import { HouseIcon, BriefcaseBusiness, NotebookPen } from '@lucide/svelte';

  let publication: any = $state(null);
  let currentPath = $state('');

  $effect(() => {
    currentPath = page.url.pathname;
  });

  onMount(async () => {
    publication = await loadPublication();
    // Keep existing color scheme
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
  });
</script>

{#if publication}
  <main>
    <div>
      <nav>
        <a href="/" class:active={currentPath === '/'}><HouseIcon /> Home</a>
        <a href="/blog" class:active={currentPath.startsWith('/blog')}
          ><NotebookPen /> Blog</a
        >
        <a href="/work" class:active={currentPath.startsWith('/work')}
          ><BriefcaseBusiness /> Work</a
        >
        <!-- <a href="/projects">~/projects</a> -->
      </nav>
      <div>
        {@render children()}
      </div>
    </div>
  </main>
{/if}

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    background-color: var(--background-color);
  }

  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    min-width: 100vw;
    font-family: 'CaskaydiaCove Nerd Font', sans-serif;
    background-image: var(--background-image);
    background-size: cover;
    background-position: center;
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
    color: var(--primary);
    display: flex;
    align-items: center;
    gap: 5px;
    text-decoration: none;
    background-color: var(--page-background);
    padding: 2px;
    border-radius: 5px;
    border: 1px solid #000;
    transition: color 0.2s ease;
    font-size: 16px;
  }

  nav > a:hover {
    border: 1px solid var(--accent-background);
  }

  nav > a.active {
    border: 1px solid var(--accent-background);
  }
</style>
