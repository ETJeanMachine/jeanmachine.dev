<script lang="ts">
  let { children } = $props();
  import "@material/web/button/filled-button.js";
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
    <source src="/backgrounds/suletta_battle.webm" type="video/webm" />
    <source src="/backgrounds/suletta_battle.mp4" type="video/mp4" />
  </video>
  <main class="content">
    <nav class="global-nav">
      <md-filled-button href="/">Home</md-filled-button>
      <md-filled-button href="/blog">Blog</md-filled-button>
      <md-filled-button href="/projects">Projects</md-filled-button>
    </nav>
    <div>
      {@render children()}
    </div>
  </main>
</div>

<svg style="display: none">
  <filter id="lg-dist" x="0%" y="0%" width="100%" height="100%">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.008 0.008"
      numOctaves="2"
      seed="92"
      result="noise"
    />
    <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
    <feDisplacementMap
      in="SourceGraphic"
      in2="blurred"
      scale="70"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
</svg>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap");

  :root {
    --md-sys-color-primary: slategrey;
    --md-sys-color-secondary: slateblue;
  }

  md-filled-button {
    border-radius: 8px;
    color: whitesmoke;
    font-family: "Noto Sans";
    font-weight: 550;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
  }

  .layout {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
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
  }

  .content {
    margin: 10px;
    min-height: 100vh;
    font-family: "Noto Sans";
    color: whitesmoke;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1;
  }

  .global-nav {
    display: flex;
    justify-content: left;
    margin-bottom: 10px;
    gap: 1rem;
  }
</style>
