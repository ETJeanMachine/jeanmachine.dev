<script lang="ts">
  let { children } = $props();
  import '../styles/index.css';
  import { loadPublication } from '$lib';
  import { onMount, setContext } from 'svelte';
  import { page } from '$app/state';
  import type { Publication } from '$lib/types/publication';

  import {
    HouseIcon,
    BriefcaseBusiness,
    NotebookPen,
    Signature,
  } from '@lucide/svelte';

  let publication: Publication | null = $state(null);
  let currentPath = $state('');

  const navItems = [
    { name: 'Home', href: '/', icon: HouseIcon, exact: true },
    { name: 'Blog', href: '/blog', icon: NotebookPen, exact: false },
    { name: 'Work', href: '/work', icon: BriefcaseBusiness, exact: false },
    { name: 'Credits', href: '/attributions', icon: Signature, exact: false },
  ];

  setContext('publication', {
    get value() {
      return publication;
    },
  });

  $effect(() => {
    currentPath = page.url.pathname;
  });

  onMount(async () => {
    publication = await loadPublication();
  });
</script>

<svelte:head>
  {#if publication}
    <link rel="icon" href={publication.icon} />
  {/if}
</svelte:head>

{#if publication}
  <main>
    <div>
      <nav>
        {#each navItems as item}
          {@const NavIcon = item.icon}
          {@const isActive = item.exact
            ? currentPath === item.href
            : currentPath.startsWith(item.href)}
          <a href={item.href} class:active={isActive}>
            <NavIcon size={16} />
            {item.name}
          </a>
        {/each}
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
    gap: 5px;
    padding-top: 10px;
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
    padding: 5px 5px;
  }

  nav > a:hover {
    border: 1px solid var(--accent-background);
  }

  nav > a.active {
    border: 1px solid var(--accent-background);
  }
</style>
