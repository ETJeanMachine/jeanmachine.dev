<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchRecentCommits } from '$lib/utils/github';
  import { USER_DID, PDS_URL, PERSONAL, SOCIAL_LINKS } from '$lib/constants';

  // svg logos
  import github_logo from '$lib/icons/github.svg';
  import linkedin_logo from '$lib/icons/linkedin.svg';
  import bsky_logo from '$lib/icons/bsky.svg';
  import email_logo from '$lib/icons/email.svg';
  import signal_logo from '$lib/icons/signal.svg';

  let avatar_src = '';
  let avatar_element: HTMLImageElement;

  onMount(async () => {
    avatar_src = `/api/bsky/avatar?pds=${PDS_URL}&did=${encodeURIComponent(USER_DID)}`;
  });
</script>

<div class="container">
  <div class="card">
    <div class="avatar-container" class:loaded={avatar_src}>
      {#if avatar_src}
        <img bind:this={avatar_element} src={avatar_src} alt="Bluesky Avatar" />
      {/if}
    </div>
    <div>
      <h1>{PERSONAL.NAME}</h1>
      <h3>{PERSONAL.TITLE}</h3>
      <div class="social-icons">
        <a href={SOCIAL_LINKS.GITHUB}
          ><img alt="Github Logo" src={github_logo} /></a
        >
        <a href={SOCIAL_LINKS.BLUESKY}
          ><img alt="Bluesky Logo" src={bsky_logo} /></a
        >
        <a href={SOCIAL_LINKS.LINKEDIN}
          ><img alt="LinkedIn Logo" src={linkedin_logo} /></a
        >
        <a href={SOCIAL_LINKS.EMAIL}
          ><img alt="Email Logo" src={email_logo} /></a
        >
        <a href={SOCIAL_LINKS.SIGNAL}
          ><img alt="Signal Logo" src={signal_logo} /></a
        >
      </div>
    </div>
  </div>
  <div class="card">
    <div>
      <h1>About Me</h1>
      <p>
        My name's Eric, but I also go by Jean! I'm a software engineer from the
        Pacific Northwest with a degree in Computer Science. I love building all
        sorts of things, but in particular, the kinds of projects that get me
        going are the things that I know will positively impact people's lives.
      </p>
      <p>
        When I'm not coding, I enjoy biking, hiking, and attending city hall
        meetings, reading municipal planning documents too. I keep informed on
        what's going on in my community at all times - because I believe that
        staying involved is what enables me to make a better impact on the
        world.
      </p>
    </div>
  </div>
</div>

<style>
  /* Ensure all cards don't overflow */
  .container {
    display: flex;
    flex-direction: row;
    gap: 15px;
  }

  .card {
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
    background-color: var(--fg_dark);
    border-radius: 20px;
    border: 5px solid var(--fg_gutter);
  }

  .avatar-container {
    background-color: var(--fg);
    display: flex;
    padding: 4px;
    border-radius: 8px;
    opacity: 0;
    transition: opacity 0.3s ease;
    aspect-ratio: 1 / 1;
    max-height: 150px;
  }

  .avatar-container.loaded {
    opacity: 1;
  }

  .avatar-container > img {
    height: 100%;
    width: 100%;
    border-radius: 4px;
    object-fit: cover;
  }

  .social-icons {
    display: flex;
    gap: 1rem;
  }

  .social-icons img {
    width: 24px;
    height: 24px;
    filter: brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(7482%)
      hue-rotate(199deg) brightness(108%) contrast(107%);
  }

  .social-icons img:hover {
    filter: brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(7482%)
      hue-rotate(199deg) brightness(108%) contrast(107%) invert(10%);
  }
</style>
