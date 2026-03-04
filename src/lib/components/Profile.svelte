<script lang="ts">
  import { getContext } from 'svelte';
  import {
    Github,
    Linkedin,
    MapPin,
    MessageCircleDashed,
    Send,
  } from '@lucide/svelte';
  import {
    NAME,
    PRONOUNS,
    TITLE,
    LOCATION,
    GITHUB_USERNAME,
    SIGNAL_URL,
    LINKEDIN_URL,
    EMAIL,
    DID,
  } from '$lib/constants';
  import { Butterfly } from '$lib/icons';
  import { blobUri } from '$lib';
  import type { SiteStandardPublication } from '@atcute/standard-site';

  const publicationContext = getContext<{
    value: SiteStandardPublication.Main | null;
  }>('publication');
  let publication = $derived(publicationContext.value);
  const { mobile = false } = $props();
  let iconSize = $derived(mobile ? 4.5 : 175);
  let iconBorderRadius = $derived(mobile ? 4 : 8);
  let avatarLoaded = $state(false);

  const socialIcons = [
    { name: 'LinkedIn', href: `${LINKEDIN_URL}`, icon: Linkedin },
    {
      name: 'GitHub',
      href: `https://github.com/${GITHUB_USERNAME}`,
      icon: Github,
    },
    { name: 'Signal', href: `${SIGNAL_URL}`, icon: MessageCircleDashed },
    {
      name: 'Bluesky',
      href: `https://bsky.app/profile/${DID}`,
      icon: Butterfly,
    },
    { name: 'Email', href: `mailto:${EMAIL}`, icon: Send },
  ];
</script>

<div class="profile">
  {#if publication && !mobile}
    <div
      class="avatar-wrapper"
      style="width: {iconSize}px; height: {iconSize}px; border-radius: {iconBorderRadius}px;"
    >
      <img
        src={blobUri(publication.icon)}
        alt={'Profile Icon'}
        class="avatar"
        style="max-height: {iconSize}px; border-radius: {iconBorderRadius}px; opacity: {avatarLoaded
          ? 1
          : 0};"
        onload={() => (avatarLoaded = true)}
      />
    </div>
  {/if}
  <div class="info">
    <div class="name-header">
      {#if publication && mobile}
        <div
          class="avatar-wrapper"
          style="width: {iconSize}rem; height: {iconSize}rem; border-radius: {iconBorderRadius}px;"
        >
          {#if !avatarLoaded}
            <div
              class="avatar-skeleton"
              style="border-radius: {iconBorderRadius}px;"
            ></div>
          {/if}
          <img
            src={blobUri(publication.icon)}
            alt={'Profile Icon'}
            class="avatar"
            style="max-height: {iconSize}rem; border-radius: {iconBorderRadius}px; opacity: {avatarLoaded
              ? 1
              : 0};"
            onload={() => (avatarLoaded = true)}
          />
        </div>
      {/if}
      <div class="name">
        <div class="woke">
          <h1>{NAME}</h1>
          <h3><i>({PRONOUNS})</i></h3>
        </div>
        {#if !mobile}
          <div class="location">
            <MapPin size={'1.4rem'} />
            <h3>
              {LOCATION}
            </h3>
          </div>
        {/if}
      </div>
    </div>
    {#if mobile}
      <div class="location">
        <MapPin size={'1.4rem'} />
        <h3>
          {LOCATION}
        </h3>
      </div>
    {/if}
    <span>{TITLE}</span>
    <div class="social-icons">
      {#each socialIcons as item}
        {@const SocialIcon = item.icon}
        <a href={item.href} target="_blank" rel="noopener noreferrer">
          <SocialIcon size={'1.5rem'} strokeWidth={2.5} />
        </a>
      {/each}
    </div>
  </div>
</div>

<style>
  .profile {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }

  .avatar {
    object-fit: cover;
    aspect-ratio: 1 / 1;
    width: 100%;
    height: 100%;
    transition: opacity 0.3s ease;
  }

  .info {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    gap: 0.3rem;
    flex: 1;
  }

  .info > * {
    margin: 0px;
  }

  .info span {
    font-style: italic;
  }

  .name-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .name {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    flex: 1;
  }

  .name > * {
    margin: 0px;
  }

  .woke {
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.3rem;
  }

  @media (max-width: 768px) {
    .woke {
      align-items: start;
      flex-direction: column;
    }
  }

  .woke > * {
    margin: 0px;
  }

  .location {
    display: flex;
    align-items: center;
    margin: 0px;
    gap: 0.5rem;
  }

  .location > * {
    margin: 0px;
  }

  .social-icons {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-items: center;
    gap: 1rem;
  }

  .social-icons > a {
    color: var(--overlay);
    transition: color 0.2s ease;
  }

  .social-icons > a:hover {
    color: var(--sapphire);
  }

  .avatar-wrapper {
    position: relative;
    flex-shrink: 0;
    overflow: hidden;
    border: 1px solid var(--overlay);
  }

  .avatar-skeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      var(--surface) 25%,
      var(--overlay) 50%,
      var(--surface) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
