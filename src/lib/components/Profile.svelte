<script lang="ts">
  import { getContext } from 'svelte';
  import type { Publication } from '$lib/types/publication';
  import { SOCIAL_LINKS, PERSONAL } from '$lib/constants';
  import {
    Github,
    Linkedin,
    MapPin,
    MessageCircleDashed,
    Send,
  } from '@lucide/svelte';
  import { Butterfly } from '$lib/icons';

  const publicationContext = getContext<{ value: Publication | null }>(
    'publication',
  );
  let publication = $derived(publicationContext.value);
  const { mobile = false } = $props();
  let iconSize = $state(150);
  let iconBorderRadius: number = $state(8);
  if (mobile) {
    iconBorderRadius = 4;
    iconSize = 64;
  }

  const socialIcons = [
    { name: 'LinkedIn', href: SOCIAL_LINKS.LINKEDIN, icon: Linkedin },
    { name: 'GitHub', href: SOCIAL_LINKS.GITHUB, icon: Github },
    { name: 'Signal', href: SOCIAL_LINKS.SIGNAL, icon: MessageCircleDashed },
    { name: 'Bluesky', href: SOCIAL_LINKS.BLUESKY, icon: Butterfly },
    { name: 'Email', href: SOCIAL_LINKS.EMAIL, icon: Send },
  ];
</script>

<div class="profile">
  {#if publication && !mobile}
    <img
      src={publication.icon}
      alt={'Leaflet Icon'}
      class="avatar"
      style="max-height: {iconSize}px; border-radius: {iconBorderRadius}px;"
    />
  {/if}
  <div class="info">
    <div class="name-header">
      {#if publication && mobile}
        <img
          src={publication.icon}
          alt={'Leaflet Icon'}
          class="avatar"
          style="max-height: {iconSize}px; border-radius: {iconBorderRadius}px;"
        />
      {/if}
      <div class="name">
        <h1>{PERSONAL.NAME}</h1>
        <h3 class="location"><MapPin size={16} /> {PERSONAL.LOCATION}</h3>
      </div>
    </div>
    {#if iconSize > 100}
      <hr />
    {/if}
    <h3>{PERSONAL.TITLE}</h3>
    <div class="social-icons">
      {#each socialIcons as item}
        {@const SocialIcon = item.icon}
        <a href={item.href} target="_blank" rel="noopener noreferrer">
          <SocialIcon size={24} strokeWidth={2.5} />
        </a>
      {/each}
    </div>
  </div>
</div>

<style>
  .profile {
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  .avatar {
    object-fit: cover;
    border: 1px solid #000;
    aspect-ratio: 1 / 1;
  }

  .name-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .name {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .name > * {
    margin: 0px;
  }

  .info {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    gap: 0.75rem;
    flex: 1;
  }

  .location {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .info > * {
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
