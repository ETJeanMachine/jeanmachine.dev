<script lang="ts">
  import { onMount } from "svelte";

  import "../styles/index.css";

  // svg logos
  import github_logo from "$lib/icons/github.svg";
  import linkedin_logo from "$lib/icons/linkedin.svg";
  import bsky_logo from "$lib/icons/bsky.svg";
  import email_logo from "$lib/icons/email.svg";
  // @ts-ignore
  import ColorThief from "color-thief-ts";

  // my bluesky DID (hardcoded)
  const did = "did:plc:6vxtya3serxcwvcdk5e7psvv";
  const api = "https://public.api.bsky.app/xrpc/";

  // easy to edit page components
  const name = "Eric Hamilton";
  const title = "Software Engineer, Caffeine Addict, Transit Enthusiast.";
  const github = "https://github.com/ETJeanMachine";
  const linkedin = "https://linkedin.com/in/etjhamilton";
  const bsky = "https://bsky.app/profile/jeanmachine.dev";
  const email = "mailto:etj2206@rit.edu";

  let avatar_src = "";
  let avatar_element: HTMLImageElement;
  let gradient = `linear-gradient(to right, #000000, #ffffff)`;

  // gets my bluesky profile picture for the home page
  async function get_profile_picture() {
    const xrpc = api + "app.bsky.actor.getProfile?actor=" + did;
    const response = await fetch(xrpc, {
      method: "GET",
    });
    const data = await response.json();
    const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(data.avatar);
    return proxyUrl;
  }

  onMount(async () => {
    avatar_src = await get_profile_picture();
  });

  async function process_gradient() {
    if (avatar_element?.complete) {
      try {
        let colorThief = new ColorThief();
        let colors = await colorThief.getPaletteAsync(avatar_src, 2);
        console.log(colors);
        if (colors && colors.length >= 2) {
          gradient = `linear-gradient(45deg, ${colors[0]}, ${colors[1]})`;
          console.log(gradient);
        }
      } catch (error) {
        console.error("ColorThief error:", error);
      }
    }
  }
</script>

<div class="container">
  <div class="card">
    <div class="avatar-border" style="--gradient: {gradient};">
      <div class="avatar-container">
        {#if avatar_src}
          <img
            bind:this={avatar_element}
            src={avatar_src}
            crossorigin="anonymous"
            on:load={() => void process_gradient()}
            alt="Bluesky Avatar"
          />
        {/if}
      </div>
    </div>
    <div>
      <h1>{name}</h1>
      <h3>{title}</h3>
      <div class="social-icons">
        <a href={github}><img alt="Github Logo" src={github_logo} /></a>
        <a href={bsky}><img alt="Bluesky Logo" src={bsky_logo} /></a>
        <a href={linkedin}><img alt="LinkedIn Logo" src={linkedin_logo} /></a>
        <a href={email}><img alt="Email Logo" src={email_logo} /></a>
      </div>
    </div>
  </div>
  <div class="card">
    <p>About Me</p>
  </div>
</div>

<style>
  .avatar-border {
    border-radius: 8px;
    background: var(--gradient);
    padding: 2px;
  }

  .avatar-container {
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 8px;
    overflow: hidden;
    width: 125px;
    height: 125px;
  }

  .avatar-container img {
    width: 100%;
    height: 100%;
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
