<script lang="ts">
  import '../index.css';

  import { page } from '$app/state';
  import {
    HouseIcon,
    BriefcaseBusiness,
    NotebookPen,
    Signature,
  } from '@lucide/svelte';

  import { NAME, TITLE } from '$lib/constants';

  let { children } = $props();

  const isReading = $derived(page.route.id === '/blog/[rkey]');

  const currentPath = $derived(page.url.pathname);
  let contentDiv: HTMLDivElement | null = $state(null);
  let lastScrollTop = $state(0);
  let navHidden = $state(false);

  const navItems = [
    { name: 'Home', href: '/', icon: HouseIcon, exact: true },
    { name: 'Blog', href: '/blog', icon: NotebookPen, exact: false },
    { name: 'Work', href: '/work', icon: BriefcaseBusiness, exact: false },
    { name: 'Credits', href: '/attributions', icon: Signature, exact: false },
  ];

  $effect(() => {
    // Track pathname changes to reset scroll to top on navigation.
    currentPath;
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
      navHidden = true;
    } else if (scrollTop < lastScrollTop - 10) {
      // Scrolling up significantly
      navHidden = false;
    }

    lastScrollTop = scrollTop;
  }
</script>

<svelte:head>
  {#if !isReading}
    <title>{NAME}</title>
    <meta name="title" content={NAME} />
    <meta name="description" content={TITLE} />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://jeanmachine.dev" />
    <meta property="og:title" content={NAME} />
    <meta property="og:description" content={TITLE} />
    <meta property="og:image" content="/api/meta-image" />

    <!-- X (Twitter) -->
    <meta property="twitter:card" content="summary" />
    <meta property="twitter:url" content="https://jeanmachine.dev" />
    <meta property="twitter:title" content={NAME} />
    <meta property="twitter:description" content={TITLE} />
    <meta property="twitter:image" content="/api/meta-image" />
  {/if}

  <!-- Favicon -->
  <link rel="icon" href="/favicon.ico" />
</svelte:head>

<div class="site-background" class:reading={isReading} aria-hidden="true"></div>

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
    font-family: var(--font-site);
    color: var(--text);
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
    color: var(--subtext);
    display: flex;
    align-items: center;
    gap: 5px;
    text-decoration: none;
    background-color: color-mix(in srgb, var(--mantle) 80%, transparent);
    padding: 5px 5px;
    border-radius: 5px;
    border: 1px solid var(--overlay);
    transition: all 0.2s ease;
    font-size: 16px;
  }

  .nav-desktop > a:hover {
    border: 1px solid var(--sapphire);
    color: var(--text);
  }

  .nav-desktop > a.active {
    color: var(--text);
    border: 1px solid var(--sapphire);
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
      background-color: color-mix(in srgb, var(--base) 80%, transparent);
      border: 1px solid var(--overlay);
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
      background-color: color-mix(in srgb, var(--mantle) 80%, transparent);
      border: 1px solid var(--overlay);
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
      color: var(--text);
      text-decoration: none;
      border-radius: 5px;
      transition: all 0.2s ease;
      font-size: 12px;
      aspect-ratio: 1/1;
    }

    .nav-mobile > a:hover,
    .nav-mobile > a.active {
      color: var(--sapphire);
    }
  }
</style>
