<script lang="ts">
  import { safeLink } from '$lib/blog/urls';
  let {
    pageId,
    label = 'Continue to linked page',
    pageLinks,
  }: {
    pageId: string;
    label?: string;
    pageLinks: Record<string, string>;
  } = $props();
  const href = $derived(
    Object.hasOwn(pageLinks, pageId) ? safeLink(pageLinks[pageId]) : null,
  );
</script>

{#if href}<p><a {href}>{label} ↓</a></p>{:else}<p class="content-notice">
    Linked page is unavailable in this article.
  </p>{/if}
