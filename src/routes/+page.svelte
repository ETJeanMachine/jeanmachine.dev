<script lang="ts">
  import { onMount } from 'svelte';
  import { getContext } from 'svelte';
  import { USER_DID, PDS_URL, PERSONAL, SOCIAL_LINKS } from '$lib/constants';
  import type { Publication } from '$lib/types/publication';

  import {
    Linkedin,
    Github,
    MessageCircleDashed,
    Send,
    Pin,
    MapPin,
  } from '@lucide/svelte';
  import { Butterfly } from '$lib/icons';

  const publicationContext = getContext<{ value: Publication | null }>(
    'publication',
  );
  let publication = $derived(publicationContext.value);

  const socialIcons = [
    { name: 'LinkedIn', href: SOCIAL_LINKS.LINKEDIN, icon: Linkedin },
    { name: 'GitHub', href: SOCIAL_LINKS.GITHUB, icon: Github },
    { name: 'Signal', href: SOCIAL_LINKS.SIGNAL, icon: MessageCircleDashed },
    { name: 'Bluesky', href: SOCIAL_LINKS.BLUESKY, icon: Butterfly },
    { name: 'Email', href: SOCIAL_LINKS.EMAIL, icon: Send },
  ];

  import { Post } from '$lib/components';
</script>

<!-- <Post {rkey}></Post> -->

<div class="container">
  <div
    style="display: flex; flex-direction: column; gap: 5px; min-width: 36vw;"
  >
    <div class="card">
      <div class="card-content profile">
        {#if publication}
          <img src={publication.icon} alt={'Leaflet Icon'} class="avatar" />
        {/if}
        <div class="info">
          <h1>{PERSONAL.NAME}</h1>
          <h3 class="location"><MapPin size={16} /> {PERSONAL.LOCATION}</h3>
          <h3>{PERSONAL.TITLE}</h3>
          <div class="social-icons">
            {#each socialIcons as item}
              {@const SocialIcon = item.icon}
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                <SocialIcon strokeWidth={2.5} />
              </a>
            {/each}
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-content">
        <h2 style="display: flex; flex-direction: row; gap: 10px;">
          <Pin size={18} strokeWidth={2.5} /> Pinned Post
        </h2>
        <Post />
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-content">
      <h2>About Me</h2>
      <p>
        My name's Eric, but I also go by Jean! I'm a software engineer from the
        Pacific Northwest with a degree in Computer Science. I love building all
        sorts of things, but in particular, the kinds of projects that get me
        going are the things that I know will positively impact people's lives.
      </p>
      <p>
        When I'm not coding, I enjoy biking, hiking, and attending city hall
        meetings, reading municipal planning documents too. I keep informed on
        what's going on in my community at all times - because I believe that
        staying involved is what enables me to make a better impact on the
        world.
      </p>
    </div>
  </div>
</div>

<style>
  /* Ensure all cards don't overflow */
  .container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  @media (min-width: 1028px) {
    .container {
      display: flex;
      flex-direction: row;
      gap: 15px;
      align-items: flex-start;
    }
  }

  .profile {
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  .avatar {
    border-radius: 8px;
    object-fit: cover;
    border: 1px solid #000;
    max-height: 150px;
    aspect-ratio: 1 / 1;
  }

  .info {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
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
