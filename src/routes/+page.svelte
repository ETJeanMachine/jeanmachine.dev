<script lang="ts">
  import { onMount } from 'svelte';
  import { getContext } from 'svelte';
  import { Home } from '$lib/components';
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
  import { Post } from '$lib/components';

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
</script>

<!-- <Post {rkey}></Post> -->

<!-- Desktop Layout -->
<div class="desktop-layout">
  <div
    style="display: flex; flex-direction: column; gap: 5px; min-width: 36vw;"
  >
    <div class="card">
      <div class="card-content profile">
        <Home.Profile iconSize={150} />
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

<!-- Mobile Layout -->
<div class="mobile-layout card">
  <div class="card-content">
    <Home.Profile iconSize={64} />

    <hr />

    <div>
      <h2 style="display: flex; flex-direction: row; gap: 10px;">
        <Pin size={18} strokeWidth={2.5} /> Pinned Post
      </h2>
      <Post />
    </div>

    <hr />

    <div>
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
  .desktop-layout {
    display: none;
  }

  .mobile-layout {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100vh - 80px);
    overflow-y: auto;
  }

  @media (min-width: 769px) {
    .desktop-layout {
      display: flex;
      flex-direction: row;
      gap: 15px;
      align-items: flex-start;
    }

    .mobile-layout {
      display: none;
    }
  }

  .mobile-icon {
    display: none;
    width: 64px;
    height: 64px;
    border-radius: 4px;
    object-fit: cover;
    border: 1px solid #000;
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

  @media (max-width: 768px) {
    .desktop-avatar {
      display: none;
    }

    .mobile-icon {
      display: block;
    }
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
