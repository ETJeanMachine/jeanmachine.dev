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
    Menu,
    X,
  } from '@lucide/svelte';

  let publication: Publication | null = $state(null);
  let currentPath = $state('');
  let isMenuOpen = $state(false);

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
    isMenuOpen = false; // Close menu on navigation
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
      <button
        class="hamburger"
        onclick={() => (isMenuOpen = !isMenuOpen)}
        aria-label="Toggle menu"
      >
        {#if isMenuOpen}
          <X size={24} />
        {:else}
          <Menu size={24} />
        {/if}
      </button>

      <nav class:open={isMenuOpen}>
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

  .hamburger {
    display: none;
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    background-color: var(--page-background);
    border: 1px solid var(--accent-background);
    border-radius: 5px;
    padding: 0.5rem;
    color: var(--primary);
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .hamburger:hover {
    background-color: var(--accent-background);
    color: var(--accent-text);
  }

  nav {
    display: flex;
    flex-direction: row;
    gap: 5px;
    padding-top: 10px;
    transition: transform 0.3s ease;
  }

  nav > a {
    color: var(--primary);
    display: flex;
    align-items: center;
    gap: 5px;
    text-decoration: none;
    background-color: var(--page-background);
    padding: 5px 5px;
    border-radius: 5px;
    border: 1px solid #000;
    transition: all 0.2s ease;
    font-size: 16px;
  }

  nav > a:hover {
    border: 1px solid var(--accent-background);
  }

  nav > a.active {
    border: 1px solid var(--accent-background);
  }

  @media (max-width: 768px) {
    .hamburger {
      display: block;
    }

    nav {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: 250px;
      flex-direction: column;
      background-color: var(--page-background);
      border-left: 1px solid var(--accent-background);
      padding: 5rem 1rem 1rem;
      transform: translateX(100%);
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
    }

    nav.open {
      transform: translateX(0);
    }

    nav > a {
      width: 100%;
      padding: 0.75rem;
      font-size: 18px;
    }
  }
</style>
