<script lang="ts">
  import type {
    SiteStandardDocument,
    SiteStandardPublication,
  } from '@atcute/standard-site';
  import { ChevronLeft } from '@lucide/svelte';
  import { imageUrl } from '$lib/blog/urls';
  import Content from './Content.svelte';
  let {
    document,
    rkey,
  }: {
    document: SiteStandardDocument.Main;
    publication: SiteStandardPublication.Main;
    rkey: string;
  } = $props();
  const cover = $derived(imageUrl(document.coverImage));

  const dateFormat = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  });
  function date(value: string): string | null {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : dateFormat.format(parsed);
  }
</script>

<article class="native-article" data-document-key={rkey}>
  <header class="card article-header">
    <h1>{document.title}</h1>
    {#if document.description}<p class="description">
        {document.description}
      </p>{/if}
    <p class="dates">
      {#if date(document.publishedAt)}Published <time
          datetime={document.publishedAt}>{date(document.publishedAt)}</time
        >{/if}
      {#if document.updatedAt && document.updatedAt !== document.publishedAt && date(document.updatedAt)}<span
        >
          · Updated <time datetime={document.updatedAt}
            >{date(document.updatedAt)}</time
          ></span
        >{/if}
    </p>
    {#if document.tags?.length}<ul class="tags" aria-label="Tags">
        {#each document.tags as tag}<li>#{tag}</li>{/each}
      </ul>{/if}
  </header>
  <div class="article-body">
    <Content content={document.content} textContent={document.textContent}>
      {#snippet before()}
        {#if cover}<img
            class="cover"
            src={cover}
            alt=""
            decoding="async"
          />{/if}
      {/snippet}
      {#snippet after()}
        <footer>
          <a class="return-link" href="/blog">
            <ChevronLeft size={18} aria-hidden="true" />
            Return to blog
          </a>
        </footer>
      {/snippet}
    </Content>
  </div>
</article>

<style>
  .native-article,
  .article-header,
  .article-body {
    box-sizing: border-box;
    width: 100%;
    max-width: none;
    min-width: 0;
  }

  .native-article {
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: var(--text);
    font-family: var(--font-site);
    line-height: 1.8;
    overflow-wrap: anywhere;
  }

  a {
    color: var(--sky);
    text-underline-offset: 0.2em;
  }
  a:hover {
    color: var(--sapphire);
  }
  .return-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  h1 {
    font-size: clamp(1.65rem, 5vw, 2.5rem);
    line-height: 1.25;
    margin-block: 0.5em;
  }
  .dates {
    color: var(--subtext);
    font-size: 0.85rem;
  }
  .description {
    font-size: 1.05rem;
    line-height: 1.7;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    list-style: none;
    padding: 0;
    font-size: 0.85rem;
  }
  .tags li {
    border-radius: 0.4rem;
    padding: 0.15rem 0.55rem;
    background: var(--mantle);
  }
  .cover {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 0.6rem;
    margin-block: 1.5rem;
  }
  footer {
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--overlay);
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .native-article :global(:focus-visible) {
    outline: 2px solid var(--sapphire);
    outline-offset: 4px;
  }
</style>
