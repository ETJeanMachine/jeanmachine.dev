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

  let avatar_src = $state('');
  let profile_data: any;

  onMount(async () => {
    const response = await fetch(`/api/bsky/profile`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    profile_data = await response.json();
    avatar_src = `/api/atproto/blob?&cid=${profile_data.value.avatar.ref.$link}`;
  });
</script>

<div class="container">
  <div style="display: flex; flex-direction: column; gap: 15px">
    <div class="card">
      <div class="card-content profile">
        <div class="avatar-container" class:loaded={avatar_src}>
          {#if avatar_src}
            <img src={avatar_src} alt="Bluesky Avatar" />
          {/if}
        </div>
        <div class="info">
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
    </div>
    <div class="card">
      <div class="card-content"><h2>&#xf435; Pinned Post</h2></div>
    </div>
  </div>
  <div class="card">
    <div class="card-content">
      <h2>About Me</h2>
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
    flex-direction: column;
    gap: 15px;
  }

  @media (min-width: 1028px) {
    .container {
      display: flex;
      flex-direction: row;
      gap: 15px;
      align-items: flex-start;
    }
  }

  .profile {
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  .avatar-container {
    background-color: var(--fg);
    display: flex;
    padding: 4px;
    border-radius: 8px;
    opacity: 0;
    transition: opacity 0.3s ease;
    aspect-ratio: 1 / 1;
    flex-shrink: 0;
    max-height: 175px;
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

  .info {
    display: flex;
    flex-direction: column;
    align-content: flex-start;
    gap: 0;
  }

  .social-icons {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
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
