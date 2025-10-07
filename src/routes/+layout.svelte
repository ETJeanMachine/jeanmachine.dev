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
      <nav class="nav-desktop">
        {#each navItems as item}
          {@const NavIcon = item.icon}
          {@const isActive = item.exact
            ? currentPath === item.href
            : currentPath.startsWith(item.href)}
          <a href={item.href} class:active={isActive}>
            <NavIcon size={'1rem'} />
            {item.name}
          </a>
        {/each}
      </nav>
      <br />
      <div>
        {@render children()}
      </div>
      <nav class="nav-mobile">
        {#each navItems as item}
          {@const NavIcon = item.icon}
          {@const isActive = item.exact
            ? currentPath === item.href
            : currentPath.startsWith(item.href)}
          <a href={item.href} class:active={isActive}>
            <NavIcon size={20} />
            <span>{item.name}</span>
          </a>
        {/each}
      </nav>
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

  .nav-desktop {
    display: flex;
    flex-direction: row;
    gap: 5px;
    padding-top: 10px;
    transition: transform 0.3s ease;
  }

  .nav-desktop > a {
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

  .nav-desktop > a:hover {
    border: 1px solid var(--accent-background);
  }

  .nav-desktop > a.active {
    border: 1px solid var(--accent-background);
  }

  @media (min-width: 768px) {
    .nav-mobile {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .nav-desktop {
      display: none;
    }

    main {
      overflow: hidden;
    }

    main > div {
      width: 90vw;
      height: 90vh;
      display: flex;
      flex-direction: column;
      position: relative;
      padding-bottom: 70px;
    }

    main > div > div {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      background-color: var(--page-background);
      border: 1px solid #000;
      border-radius: 10px;
      padding: 1rem;
      margin-top: 0.5rem;
      position: relative;
    }

    .nav-mobile {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      flex-direction: row;
      justify-content: space-around;
      align-items: center;
      background-color: var(--page-background);
      border-top: 1px solid #000;
      padding: 0.25rem 0;
      z-index: 100;
    }

    .nav-mobile > a {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      color: var(--primary);
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 5px;
      transition: all 0.2s ease;
      font-size: 12px;
      aspect-ratio: 1/1;
    }

    .nav-mobile > a:hover,
    .nav-mobile > a.active {
      background-color: var(--accent-background);
      color: var(--accent-text);
    }
  }
</style>
