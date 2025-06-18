<script lang="ts">
  let { children } = $props();
  import "@material/web/button/filled-button.js";
  import "@material/web/button/outlined-button.js";
</script>

<div class="layout">
  <nav class="global-nav">
    <md-filled-button href="/">Home</md-filled-button>
    <md-filled-button href="/blog">Blog</md-filled-button>
    <md-filled-button href="/projects">Projects</md-filled-button>
  </nav>
  <div class="content">
    {@render children()}
  </div>
</div>

<style>
  :root {
    --md-sys-color-primary: slategrey;
    --md-sys-color-secondary: slateblue;
  }

  md-filled-button {
    border-radius: 8px;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    background-color: dimgray;
    font-family: "Noto Sans", sans-serif;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .layout {
    min-height: 100vh;
    color: whitesmoke;
    padding: 20px;
    box-sizing: border-box;
  }

  .global-nav {
    display: flex;
    justify-content: left;
    margin-bottom: 10px;
    gap: 1rem;
  }
</style>
