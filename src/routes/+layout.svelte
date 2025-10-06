<script lang="ts">
  let { children } = $props();
  import '../styles/index.css';
  import colors from '$lib/colors.json';
  import { onMount } from 'svelte';
  import { PUBLICATION } from '$lib/constants';

  let publication: any = $state(null);
  let background_image = $state('');
  let background_color = $state('');

  function colorToCSS(color: any): string {
    if (!color) return '';
    if (color.a !== undefined) {
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 100})`;
    }
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  onMount(async () => {
    const params = new URLSearchParams('');
    params.append('collection', 'pub.leaflet.publication');
    params.append('rkey', PUBLICATION);
    const response = await fetch(`/api/atproto/record?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    publication = (await response.json()).value;
    const theme = publication.theme;

    // Set background color
    if (theme.backgroundColor) {
      background_color = colorToCSS(theme.backgroundColor);
      document.documentElement.style.setProperty(
        '--background-color',
        background_color,
      );
    }

    // Set background image
    if (theme.backgroundImage?.image) {
      background_image = theme.backgroundImage.image;
    }

    // Set CSS variables for theme colors
    if (theme.primary) {
      document.documentElement.style.setProperty(
        '--primary',
        colorToCSS(theme.primary),
      );
    }
    if (theme.pageBackground) {
      document.documentElement.style.setProperty(
        '--page-background',
        colorToCSS(theme.pageBackground),
      );
    }
    if (theme.accentBackground) {
      document.documentElement.style.setProperty(
        '--accent-background',
        colorToCSS(theme.accentBackground),
      );
    }
    if (theme.accentText) {
      document.documentElement.style.setProperty(
        '--accent-text',
        colorToCSS(theme.accentText),
      );
    }

    // Keep existing color scheme
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
  });
</script>

{#if publication}
  <main
    style="background-image: url({background_image}); background-size: cover; background-position: center;"
  >
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
    text-decoration: none;
    background-color: var(--page-background);
    padding: 2px;
    border-radius: 5px;
    transition: color 0.2s ease;
    font-size: 16px;
  }

  nav > a:hover {
    background-color: var(--accent-background);
    color: var(--accent-text);
  }
</style>
