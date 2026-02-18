<script lang="ts">
  import { renderPost, type PostData } from 'bluesky-post-embed/core';
  import 'bluesky-post-embed/style.css';
  import 'bluesky-post-embed/themes/dark.css';

  interface Props {
    data: PostData;
  }

  const { data }: Props = $props();

  const render = $derived(renderPost(data));
</script>

<bluesky-post src={data.thread?.post.uri}>
  {@html render}
</bluesky-post>
