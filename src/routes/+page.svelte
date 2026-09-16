<script lang="ts">
  import { Profile, Pinned, About, Github } from '$lib/components';
</script>

<!-- <Post {rkey}></Post> -->

<!-- Desktop Layout -->
<div class="desktop-layout">
  <div class="card profile-card">
    <Profile />
    <hr />
    <Pinned />
  </div>
  <div class="card about-card">
    <About />
    <hr />
    <Github />
  </div>
</div>

<!-- Mobile Layout -->
<div class="mobile-layout">
  <Profile mobile={true} />
  <hr />
  <div>
    <About />
  </div>
  <hr />
  <div>
    <Pinned />
  </div>
  <hr />
  <div>
    <Github />
  </div>
</div>

<style>
  .desktop-layout {
    display: none;
  }

  @media (min-width: 769px) {
    .desktop-layout {
      display: flex;
      flex-direction: row;
      gap: 15px;
      align-items: flex-start;
    }

    .profile-card {
      container-type: inline-size;
      container-name: profile-card;
      min-width: 15rem;
    }

    /* Allow the card to shrink below the contribution calendar's intrinsic
       width; the calendar scrolls horizontally instead. */
    .about-card {
      min-width: 0;
    }

    .mobile-layout {
      display: none;
    }
  }
</style>
