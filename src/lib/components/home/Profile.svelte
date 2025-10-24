<script lang="ts">
  import { getContext } from 'svelte';
  import {
    Github,
    Linkedin,
    MapPin,
    MessageCircleDashed,
    Send,
  } from '@lucide/svelte';
  import { PubLeafletPublication } from '@atcute/leaflet';
  import {
    PUBLIC_NAME,
    PUBLIC_TITLE,
    PUBLIC_LOCATION,
  } from '$env/static/public';
  import { Butterfly } from '$lib/icons';
  import { blobUri } from '$lib';
  import BlobImage from '../BlobImage.svelte';

  const publicationContext = getContext<{
    value: PubLeafletPublication.Main | null;
  }>('publication');
  let publication = $derived(publicationContext.value);
  const { mobile = false } = $props();
  let iconSize = $state(175);
  let iconBorderRadius: number = $state(8);
  if (mobile) {
    iconBorderRadius = 4;
    iconSize = 4.5;
  }

  const socialIcons = [
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/in/etjhamilton',
      icon: Linkedin,
    },
    { name: 'GitHub', href: 'https://github.com/ETJeanMachine', icon: Github },
    {
      name: 'Signal',
      href: 'https://signal.me/#eu/NRi1kt98GTlPfIyn2DP4faTgyElC3ufIcTcdK0fLLttDMBFxJANNhoD-Ksn30G8O',
      icon: MessageCircleDashed,
    },
    {
      name: 'Bluesky',
      href: 'https://bsky.app/profile/jeanmachine.dev',
      icon: Butterfly,
    },
    { name: 'Email', href: 'mailto:etj2206@rit.edu', icon: Send },
  ];
</script>

<div class="profile">
  {#if publication && !mobile}
    <BlobImage
      blob={publication.icon}
      alt="Leaflet Icon"
      style="max-height: {iconSize}px;
      border-radius: {iconBorderRadius}px;
      object-fit: cover;
      border: 1px solid #000;
      aspect-ratio: 1 / 1;"
    />
  {/if}
  <div class="info">
    <div class="name-header">
      {#if publication && mobile}
        <BlobImage
          blob={publication.icon}
          alt="Leaflet Icon"
          style="max-height: {iconSize}rem;
          border-radius: {iconBorderRadius}px;
          object-fit: cover;
          border: 1px solid #000;
          aspect-ratio: 1 / 1;"
        />
      {/if}
      <div class="name">
        <div class="woke">
          <h1>{PUBLIC_NAME}</h1>
          <h3><i>(any/all)</i></h3>
        </div>
        {#if !mobile}
          <div class="location">
            <MapPin size={'1.4rem'} />
            <h3>
              {PUBLIC_LOCATION}
            </h3>
          </div>
        {/if}
      </div>
    </div>
    {#if mobile}
      <div class="location">
        <MapPin size={'1.4rem'} />
        <h3>
          {PUBLIC_LOCATION}
        </h3>
      </div>
    {/if}
    <span>{PUBLIC_TITLE}</span>
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
    color: #c2c2c2;
    transition: color 0.2s ease;
  }

  .social-icons > a:hover {
    color: var(--accent-background);
  }
</style>
