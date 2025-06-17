<script lang="ts">
    let { children } = $props();
    import "@material/web/button/filled-button.js";
    import "@material/web/button/outlined-button.js";
</script>

<div class="layout">
    <h1 class="header">Eric Hamilton</h1>
    <nav class="global-nav">
        <md-filled-button href="/">Home</md-filled-button>
        <md-filled-button href="/blog">Blog</md-filled-button>
        <md-filled-button href="/projects">Projects</md-filled-button>
    </nav>
    {@render children()}
</div>

<style>
    :root {
        --md-sys-color-primary: slategray;
        --md-sys-color-secondary: lightgray;
    }

    :global(html, body) {
        margin: 0;
        padding: 0;
        background-color: dimgray;
        font-family: "Noto Sans", sans-serif;
    }

    .header {
        text-align: center;
    }

    .layout {
        min-height: 100vh;
        color: whitesmoke;
        padding: 20px;
        box-sizing: border-box;
    }

    .global-nav {
        display: flex;
        justify-content: center;
        gap: 1rem;
    }
</style>
