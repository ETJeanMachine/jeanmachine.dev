<script lang="ts">
  let { children } = $props();
  import "../styles/index.css";

  let videoElement: HTMLVideoElement;

  $effect(() => {
    if (videoElement) {
      videoElement.playbackRate = 0.8;
    }
  });
</script>

<div class="layout">
  <video bind:this={videoElement} autoplay muted loop>
    <source src="backgrounds/suletta_battle.webm" type="video/webm" />
    <source src="backgrounds/suletta_battle.mp4" type="video/mp4" />
  </video>
  <main>
    <div>
      <nav class="global-nav">
        <a class="glass" href="/">Home</a>
        <a class="glass" href="/blog">Blog</a>
        <a class="glass" href="/projects">Projects</a>
      </nav>
      <div class="content">
        {@render children()}
      </div>
    </div>
  </main>
</div>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap");

  :global(html, body) {
    margin: 0;
    padding: 0;
  }

  .layout {
    min-height: 100vh;
    position: relative;
  }

  .layout > video {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    object-fit: cover;
    filter: blur(1.5rem);
    z-index: -1;
    margin: 0;
    padding: 0;
    transform: scale(1.05);
    background-color: black;
  }

  main {
    margin: 10px;
    min-height: 100vh;
    min-width: 100vh;
    font-family: "Noto Sans";
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    color: whitesmoke;
    gap: 10px;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-content: center;
  }

  main > div {
    max-width: 1200px;
    align-self: center;
  }

  .content {
    display: flex;
    flex-flow: row wrap;
    gap: 10px;
  }

  nav.global-nav {
    display: flex;
    margin-bottom: 10px;
    gap: 1rem;
  }

  .global-nav > a {
    font-family: inherit;
    font-size: 16px;
    color: inherit;
    text-shadow: inherit;
    padding: 0.5rem 1rem;
    font-weight: 550;
    text-decoration: none;
    transition: background-color 0.3s ease-in-out;
  }

  .global-nav > a:hover {
    background-color: rgba(255, 255, 255, 0.2);
    transition: background-color 0.3s ease-in-out;
  }
</style>
