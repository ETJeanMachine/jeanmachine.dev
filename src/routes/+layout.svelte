<script lang="ts">
    let { children } = $props();
</script>

<div class="layout">
    <nav>
        <a href="/">Home</a>
        <a href="/blog">Blog</a>
        <a href="/projects">Projects</a>
    </nav>
    {@render children()}
</div>

<style>
    @font-face {
        font-family: "Noto Sans";
        src: url("/static/fonts/NotoSans-VariableFont_wdth,wght.ttf")
            format("truetype");
        font-display: swap;
    }

    :global(html, body) {
        margin: 0;
        padding: 0;
        background: linear-gradient(135deg, blue, black);
        font-family: "Noto Sans", sans-serif;
    }

    .layout {
        min-height: 100vh;

        color: whitesmoke;
        padding: 20px;
        box-sizing: border-box;
    }

    nav a {
        background-color: rgba(0, 0, 0, 0.3);
        color: navajowhite;
        padding: 10px 20px;
        border-radius: 25px;
        display: inline-block;
    }

    nav a:hover {
        background-color: rgba(255, 255, 255, 0.2);
        color: #ffffff;
    }
</style>
