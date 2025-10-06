<script lang="ts">
  import { onMount } from 'svelte';
  import { USER_DID, PDS_URL, PERSONAL, SOCIAL_LINKS } from '$lib/constants';

  import {
    Linkedin,
    Github,
    MessageCircleDashed,
    Send,
    Pin,
  } from '@lucide/svelte';
  import { Butterfly } from '$lib/icons';

  const socialIcons = [
    { name: 'LinkedIn', href: SOCIAL_LINKS.LINKEDIN, icon: Linkedin },
    { name: 'GitHub', href: SOCIAL_LINKS.GITHUB, icon: Github },
    { name: 'Signal', href: SOCIAL_LINKS.SIGNAL, icon: MessageCircleDashed },
    { name: 'Bluesky', href: SOCIAL_LINKS.BLUESKY, icon: Butterfly },
    { name: 'Email', href: SOCIAL_LINKS.EMAIL, icon: Send },
  ];

  import { Post, Avatar } from '$lib/components';
</script>

<!-- <Post {rkey}></Post> -->

<div class="container">
  <div
    style="display: flex; flex-direction: column; gap: 5px; min-width: 36vw;"
  >
    <div class="card">
      <div class="card-content profile">
        <div class="avatar-container">
          <Avatar />
        </div>
        <div class="info">
          <h1>{PERSONAL.NAME}</h1>
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

  .avatar-container {
    aspect-ratio: 1 / 1;
    flex-shrink: 0;
    max-height: 175px;
  }

  .info {
    display: flex;
    flex-direction: column;
    align-content: flex-start;
  }

  .social-icons {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-items: center;
    gap: 1rem;
  }

  .social-icons > a {
    color: currentColor;
    transition: color 0.2s ease;
  }

  .social-icons > a:hover {
    color: var(--accent-background);
  }
</style>
