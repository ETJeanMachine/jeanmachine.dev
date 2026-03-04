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
    <div class="avatar-wrapper">
      <img
        src={blobUri(publication.icon)}
        alt={'Profile Icon'}
        class="avatar"
      />
    </div>
  {/if}
  <div class="info">
    <div class="name-header">
      {#if publication && mobile}
        <div class="avatar-wrapper avatar-wrapper--mobile">
          <img
            src={blobUri(publication.icon)}
            alt={'Profile Icon'}
            class="avatar"
          />
        </div>
      {/if}
      {#if publication && !mobile}
        <div class="avatar-wrapper avatar-wrapper--compact">
          <img
            src={blobUri(publication.icon)}
            alt={'Profile Icon'}
            class="avatar"
          />
        </div>
      {/if}
      <div class="name">
        <h1>{NAME}</h1>
        <h3 class="pronouns"><i>({PRONOUNS})</i></h3>
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
    align-items: stretch;
    gap: 10px;
  }

  .avatar {
    object-fit: cover;
    width: 100%;
    height: 100%;
    display: block;
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

  .pronouns {
    color: var(--subtext);
    margin: 0;
  }

  .location {
    display: flex;
    align-items: center;
    margin: 0px;
    gap: 0.5rem;
    color: var(--subtext);
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
    flex-shrink: 0;
    overflow: hidden;
    border: 1px solid var(--overlay);
    border-radius: 8px;
    max-width: 175px;
    max-height: 175px;
    aspect-ratio: 1 / 1;
  }

  .avatar-wrapper--mobile {
    border-radius: 4px;
    width: 4.5rem;
    height: 4.5rem;
  }

  .avatar-wrapper--compact {
    display: none;
    border-radius: 4px;
    width: 5.5rem;
    height: 5.5rem;
    max-width: unset;
    max-height: unset;
    align-self: flex-start;
  }

  @container profile-card (max-width: 28rem) {
    .avatar-wrapper {
      display: none;
    }

    .avatar-wrapper--compact {
      display: block;
    }
  }
</style>
