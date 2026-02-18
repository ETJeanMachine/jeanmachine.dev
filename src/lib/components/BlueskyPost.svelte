<script lang="ts">
  import { renderPost, type PostData } from 'bluesky-post-embed/core';

  interface Props {
    data: PostData;
  }

  const { data }: Props = $props();

  const render = $derived(renderPost(data));
</script>

<bluesky-post src={data.thread?.post.uri}>
  {@html render}
</bluesky-post>

<style>
  @import 'bluesky-post-embed/style.css';
  @import 'bluesky-post-embed/themes/dark.css';

  :global(.bluesky-embed) {
    --font-family: 'CaskaydiaCove Nerd Font', sans-serif;
    --text-primary: var(--primary);
    --text-link: var(--accent-background);
    --background-primary: rgb(from var(--page-background) r g b);
    --background-secondary: rgb(from var(--page-background) r g b / 0.6);
    --button: var(--accent-background);
    --button-hover: var(--accent-text);
  }
</style>
