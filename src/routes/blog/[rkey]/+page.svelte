<script lang="ts">
  import { blobUri } from '$lib';
  import { Article } from '$lib/components/blog';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const title = $derived(`${data.document.title} | ${data.publication.name}`);
  const description = $derived(
    data.document.description ??
      data.document.textContent?.slice(0, 300) ??
      `Read ${data.document.title} by ${data.publication.name}.`,
  );
  const primaryOrigin = 'https://jeanmachine.dev';
  const canonicalUrl = $derived(`${primaryOrigin}/blog/${data.rkey}`);
  const imageUrl = $derived(
    data.document.coverImage
      ? new URL(blobUri(data.document.coverImage), primaryOrigin).href
      : null,
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  {#if data.rkey === 'example'}
    <meta name="robots" content="noindex,nofollow" />
  {:else}
    <link rel="canonical" href={canonicalUrl} />
    <meta property="og:url" content={canonicalUrl} />
  {/if}
  <meta property="og:type" content="article" />
  <meta property="og:title" content={data.document.title} />
  <meta property="og:description" content={description} />
  <meta property="og:site_name" content={data.publication.name} />
  <meta property="article:published_time" content={data.document.publishedAt} />
  {#if data.document.updatedAt}
    <meta property="article:modified_time" content={data.document.updatedAt} />
  {/if}
  <meta
    name="twitter:card"
    content={imageUrl ? 'summary_large_image' : 'summary'}
  />
  <meta name="twitter:title" content={data.document.title} />
  <meta name="twitter:description" content={description} />
  {#if imageUrl}
    <meta property="og:image" content={imageUrl} />
    <meta name="twitter:image" content={imageUrl} />
  {/if}
</svelte:head>

{#key data.rkey}
  <Article
    document={data.document}
    publication={data.publication}
    rkey={data.rkey}
  />
{/key}
