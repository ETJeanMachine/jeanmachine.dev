<script lang="ts">
  import { Heart, Repeat2, MessageCircle } from '@lucide/svelte';
  import type { HTMLImgAttributes } from 'svelte/elements';
  import Butterfly from '../../icons/Butterfly.svelte';
  import { blueskyProfileUrl } from '$lib/blog/urls';
  import '../post-card.css';
  import {
    embedDate,
    embedTarget,
    loadEmbed,
    type EmbedKind,
    type EmbedPreview,
  } from '$lib/blog/embeds';

  let { uri, kind, label }: { uri: string; kind: EmbedKind; label: string } =
    $props();
  const target = $derived(embedTarget(uri, kind));
  let result = $state<{
    uri: string;
    kind: EmbedKind;
    preview: EmbedPreview;
  } | null>(null);
  let status = $state<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const preview = $derived(
    result?.uri === uri && result.kind === kind ? result.preview : null,
  );
  const href = $derived(preview?.href ?? target.href);
  const standard = $derived(
    kind === 'record' &&
      !!target.href &&
      /^at:\/\/[^/]+\/site\.standard\.(document|publication)\/[^/]+$/.test(uri),
  );
  const profile = $derived(
    preview?.author ? blueskyProfileUrl(preview.author.did) : null,
  );
  let failedImages = $state<string[]>([]);
  function imageFailed(event: Event & { currentTarget: Element }) {
    const src = event.currentTarget.getAttribute('src');
    if (src) failedImages = [...failedImages, src];
  }
  const linkLabel = $derived(
    kind === 'bluesky'
      ? 'Read post on Bluesky ↗'
      : href === '/blog'
        ? 'View publication ↗'
        : href?.startsWith('/blog/')
          ? 'Read article ↗'
          : 'View referenced record ↗',
  );

  $effect(() => {
    const currentUri = uri;
    const currentKind = kind;
    result = null;
    failedImages = [];
    status = 'idle';
    if (!target.request) return;
    const controller = new AbortController();
    status = 'loading';
    const timer = setTimeout(() => {
      status = 'failed';
      controller.abort();
    }, 8_000);
    void loadEmbed(currentUri, currentKind, fetch, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        if (value) {
          result = { uri: currentUri, kind: currentKind, preview: value };
          status = 'ready';
        } else status = 'failed';
      })
      .catch(() => {
        if (!controller.signal.aborted) status = 'failed';
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  });
</script>

{#snippet remoteImage(attributes: HTMLImgAttributes)}
  <img
    {...attributes}
    loading="lazy"
    decoding="async"
    referrerpolicy="no-referrer"
    onerror={imageFailed}
  />
{/snippet}

<aside class="embed-card native-embed post-card" aria-label={label}>
  <div class="embed-header">
    {#if preview?.author && profile}
      <a
        class="embed-identity"
        href={profile}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View @${preview.author.handle} on Bluesky`}
      >
        {#if preview.author.avatar && !failedImages.includes(preview.author.avatar)}
          {@render remoteImage({
            class: 'embed-avatar',
            src: preview.author.avatar,
            alt: '',
            width: 48,
            height: 48,
          })}
        {:else}
          <span class="embed-avatar embed-avatar-fallback" aria-hidden="true"
            ><Butterfly size={24} color="var(--sky)" /></span
          >
        {/if}
      </a>
    {:else if standard}
      {#if preview?.icon && !failedImages.includes(preview.icon)}
        {@render remoteImage({
          class: 'embed-avatar embed-publication-icon',
          src: preview.icon,
          alt: '',
          width: 48,
          height: 48,
        })}
      {:else}
        <img
          class="embed-avatar embed-publication-icon"
          src="/assets/standard-site-favicon.png"
          alt=""
          width="48"
          height="48"
        />
      {/if}
    {:else if kind === 'bluesky'}
      <span class="embed-avatar embed-avatar-fallback" aria-hidden="true"
        ><Butterfly size={24} color="var(--sky)" /></span
      >
    {/if}
    <div class="embed-author">
      <div class="embed-author-top">
        {#if preview?.author && profile}
          <a
            class="embed-name"
            href={profile}
            target="_blank"
            rel="noopener noreferrer"
            >{preview.author.displayName || preview.author.handle}</a
          >
        {:else}
          <strong class="embed-name">{preview?.title || label}</strong>
        {/if}
        {#if preview?.date}
          <time class="embed-date" datetime={preview.date}
            >{embedDate(preview.date)}</time
          >
        {/if}
      </div>
      {#if preview?.author && profile}
        <a
          class="embed-handle"
          href={profile}
          target="_blank"
          rel="noopener noreferrer">@{preview.author.handle}</a
        >
      {:else if standard}
        <span class="embed-provider">
          {#if preview?.icon && !failedImages.includes(preview.icon)}
            <img
              class="embed-provider-icon"
              src="/assets/standard-site-favicon.png"
              alt=""
              width="20"
              height="20"
            />
          {/if}
          Standard.site
        </span>
      {/if}
    </div>
  </div>
  {#if preview?.text}<p class="embed-text">{preview.text}</p>{/if}
  {#if preview?.images?.length}
    <div class="embed-images">
      {#each preview.images as image}
        {#if !failedImages.includes(image.src)}
          <a
            href={image.src}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={image.alt || 'Open post image'}
          >
            {@render remoteImage({ class: 'embed-media-preview', ...image })}
          </a>
        {/if}
      {/each}
    </div>
  {/if}
  {#if preview?.image && !failedImages.includes(preview.image.src)}
    {@render remoteImage({ class: 'embed-media-preview', ...preview.image })}
  {/if}
  {#if preview?.external}
    <a
      class="embed-external"
      href={preview.external.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {#if preview.external.image && !failedImages.includes(preview.external.image)}
        {@render remoteImage({
          class: 'embed-external-preview',
          src: preview.external.image,
          alt: '',
        })}
      {/if}
      <span class="embed-external-info">
        <strong>{preview.external.title}</strong>
        {#if preview.external.text}<span>{preview.external.text}</span>{/if}
      </span>
    </a>
  {/if}
  <div class="embed-footer">
    {#if kind === 'bluesky' && preview?.stats}
      <div class="embed-stats">
        <span
          class="embed-stat"
          aria-label={`${preview.stats.replyCount} replies`}
          ><MessageCircle size={14} aria-hidden="true" />{preview.stats
            .replyCount}</span
        >
        <span
          class="embed-stat"
          aria-label={`${preview.stats.repostCount} reposts`}
          ><Repeat2 size={16} aria-hidden="true" />{preview.stats
            .repostCount}</span
        >
        <span class="embed-stat" aria-label={`${preview.stats.likeCount} likes`}
          ><Heart size={14} aria-hidden="true" />{preview.stats.likeCount}</span
        >
      </div>
    {/if}
    {#if href}
      <a
        class="embed-primary-link"
        {href}
        target={kind === 'bluesky' ? '_blank' : undefined}
        rel="noopener noreferrer"
        aria-label={linkLabel}
      >
        {#if kind === 'bluesky' && preview}
          <Butterfly size={20} color="var(--sky)" />
        {:else}
          {linkLabel}
        {/if}
      </a>
    {:else}
      <p class="content-notice">
        {kind === 'bluesky' ? 'Post' : 'Record'} link unavailable.
      </p>
    {/if}
  </div>
  {#if status === 'loading'}
    <small class="embed-status" role="status"
      >Loading preview… The link is ready.</small
    >
  {:else if status === 'failed'}
    <small class="embed-status" role="status"
      >Preview unavailable. You can still follow the link.</small
    >
  {/if}
</aside>
