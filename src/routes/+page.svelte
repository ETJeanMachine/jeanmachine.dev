<script lang="ts">
  import "../styles/index.css";
  import github_logo from "$lib/icons/github.svg";
  import linkedin_logo from "$lib/icons/linkedin.svg";
  import bsky_logo from "$lib/icons/bsky.svg";

  // my bluesky DID (hardcoded)
  const did = "did:plc:6vxtya3serxcwvcdk5e7psvv";
  const api = "https://public.api.bsky.app/xrpc/";

  // gets my bluesky profile picture for the home page
  async function get_profile_picture() {
    const xrpc = api + "app.bsky.actor.getProfile?actor=" + did;
    const response = await fetch(xrpc, {
      method: "GET",
    });
    const data = await response.json();
    return data.avatar;
  }
</script>

<div class="container">
  <div class="card">
    <div>
      <h1>Eric Hamilton</h1>
      <h3>Software Engineer, Coffee Lover, Biker.</h3>
      <div class="social-icons">
        <a href="https://bsky.app/profile/jeanmachine.dev"
          ><img alt="Bluesky Logo" src={bsky_logo} /></a
        >
        <a href="https://github.com/jeanmachine"
          ><img alt="Github Logo" src={github_logo} /></a
        >
        <a href="https://linkedin.com/in/jeanmachine"
          ><img alt="LinkedIn Logo" src={linkedin_logo} /></a
        >
      </div>
    </div>
    <div class="avatar-container">
      {#await get_profile_picture() then avatar}
        <img src={avatar} alt="Bluesky Avatar" />
      {/await}
    </div>
  </div>
  <div class="card">
    <p>About Me</p>
  </div>
</div>

<style>
  .avatar-container {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f5f5f5;
    border-radius: 8px;
    outline: 3px solid slateblue;
    overflow: hidden;
    max-width: 150px;
    max-height: 150px;
    height: 100%;
    width: 100%;
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
</style>
