<script lang="ts">
  import '../styles/index.css';
  import { loadPublication, blobUri } from '$lib';
  import { onMount, setContext } from 'svelte';
  import { page } from '$app/state';
  import { PERSONAL, HANDLE } from '$lib/constants';

  import {
    HouseIcon,
    BriefcaseBusiness,
    NotebookPen,
    Signature,
    Menu,
    X,
  } from '@lucide/svelte';
  import { PubLeafletPublication } from '@atcute/leaflet';

  let { children } = $props();

  let publication = $state<PubLeafletPublication.Main | null>(null);
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
  <title>{PERSONAL.NAME} - {PERSONAL.TITLE}</title>
  <meta name="description" content={PERSONAL.TITLE} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://{HANDLE}/" />
  <meta property="og:title" content={PERSONAL.NAME} />
  <meta property="og:description" content={PERSONAL.TITLE} />
  {#if publication}
    <meta
      property="og:image"
      content="https://{HANDLE}{blobUri(publication.icon)}"
    />
    <link rel="icon" href={blobUri(publication.icon)} />
  {/if}

  <!-- Twitter -->
  <meta property="twitter:card" content="summary" />
  <meta property="twitter:url" content="https://{HANDLE}/" />
  <meta property="twitter:title" content={PERSONAL.NAME} />
  <meta property="twitter:description" content={PERSONAL.TITLE} />
  {#if publication}
    <meta
      property="twitter:image"
      content="https://{HANDLE}{blobUri(publication.icon)}"
    />
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
{:else}
  <div class="loading-screen">
    <div class="spinner"></div>
    <p>Loading...</p>
  </div>
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
    color: var(--primary);
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
      position: relative;
    }

    main > div {
      width: 90vw;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      position: relative;
      padding-bottom: 65px;
      box-sizing: border-box;
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
      min-height: 0;
    }

    .nav-mobile {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      display: flex;
      flex-direction: row;
      justify-content: space-around;
      align-items: center;
      background-color: var(--page-background);
      border-top: 1px solid #000;
      padding: 0.25rem 0;
      padding-bottom: calc(0.25rem + env(safe-area-inset-bottom));
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
      border-radius: 5px;
      transition: all 0.2s ease;
      font-size: 12px;
      aspect-ratio: 1/1;
    }

    .nav-mobile > a:hover,
    .nav-mobile > a.active {
      color: var(--accent-background);
    }
  }

  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    min-width: 100vw;
    font-family: 'CaskaydiaCove Nerd Font', sans-serif;
    background-color: #1a1a1a;
    color: #ffffff;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-screen p {
    font-size: 1.25rem;
    margin: 0;
  }
</style>
