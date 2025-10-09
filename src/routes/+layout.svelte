<script lang="ts">
  import '../index.css';
  import { loadPublication } from '$lib';
  import { onMount, setContext } from 'svelte';
  import { page } from '$app/state';
  import {
    HouseIcon,
    BriefcaseBusiness,
    NotebookPen,
    Signature,
  } from '@lucide/svelte';
  import type { PubLeafletPublication } from '@atcute/leaflet';
  import { PERSONAL } from '$lib/constants';

  let { children } = $props();

  let publication = $state<PubLeafletPublication.Main | null>(null);
  let currentPath = $state('');
  let contentDiv: HTMLDivElement | null = $state(null);
  let lastScrollTop = $state(0);
  let navHidden = $state(false);
  let isScrollingDown = $state(false);

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
    // Reset scroll to top on navigation
    if (contentDiv) {
      contentDiv.scrollTop = 0;
    }
  });

  function handleScroll(event: Event) {
    const target = event.target as HTMLDivElement;
    const scrollTop = target.scrollTop;

    // Determine scroll direction based on scroll position change
    if (scrollTop > lastScrollTop + 10 && scrollTop > 50) {
      // Scrolling down significantly
      isScrollingDown = true;
      navHidden = true;
    } else if (scrollTop < lastScrollTop - 10) {
      // Scrolling up significantly
      isScrollingDown = false;
      navHidden = false;
    }

    lastScrollTop = scrollTop;
  }

  onMount(async () => {
    publication = await loadPublication();
  });
</script>

<svelte:head>
  <meta name="title" content={PERSONAL.NAME} />
  <meta name="description" content={PERSONAL.TITLE} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://jeanmachine.dev" />
  <meta property="og:title" content={PERSONAL.NAME} />
  <meta property="og:description" content={PERSONAL.TITLE} />
  <meta property="og:image" content="/api/meta-image" />

  <!-- X (Twitter) -->
  <meta property="twitter:card" content="summary" />
  <meta property="twitter:url" content="https://jeanmachine.dev" />
  <meta property="twitter:title" content={PERSONAL.NAME} />
  <meta property="twitter:description" content={PERSONAL.TITLE} />
  <meta property="twitter:image" content="/api/meta-image" />

  <link rel="icon" href="/api/meta-image" />
</svelte:head>

{#if publication}
  <main>
    <div class:nav-hidden={navHidden}>
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
      <div bind:this={contentDiv} onscroll={handleScroll}>
        {@render children()}
      </div>
      <nav class="nav-mobile" class:hidden={navHidden}>
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
  }

  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100dvh;
    min-width: 100dvw;
    font-family: 'CaskaydiaCove Nerd Font', sans-serif;
    color: var(--primary);
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
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      min-height: 100dvh;
      max-height: 100dvh;
    }

    main > div {
      width: 90vw;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      position: relative;
      box-sizing: border-box;
      padding-bottom: 65px;
      transition: padding-bottom 0.3s ease;
    }

    main > div.nav-hidden {
      padding-bottom: 0.5rem;
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
      left: 5vw;
      right: 5vw;
      width: 90vw;
      display: flex;
      flex-direction: row;
      justify-content: space-around;
      align-items: center;
      background-color: var(--page-background);
      border: 1px solid #000;
      border-radius: 10px 10px 0 0;
      padding: 0.25rem 0;
      padding-bottom: calc(0.25rem + env(safe-area-inset-bottom));
      z-index: 100;
      transform: translateY(0);
      transition: transform 0.3s ease;
    }

    .nav-mobile.hidden {
      transform: translateY(100%);
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
