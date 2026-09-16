<script lang="ts">
  import { Profile, Pinned, About, Github } from '$lib/components';
</script>

<!-- <Post {rkey}></Post> -->

<!-- Desktop Layout -->
<div class="desktop-layout">
  <div class="column profile-column">
    <div class="card profile-card">
      <Profile />
    </div>
    <div class="card pinned-card">
      <Pinned />
    </div>
  </div>
  <div class="column about-column">
    <div class="card about-card">
      <About />
    </div>
    <div class="card github-card">
      <Github />
    </div>
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

    .column {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .profile-column {
      flex: 1 1 0;
      min-width: 15rem;
    }

    .profile-card {
      container-type: inline-size;
      container-name: profile-card;
    }

    /* Let the right column shrink; the contribution calendar wraps instead
       of forcing width. */
    .about-column {
      flex: 1 1 0;
      min-width: 0;
    }

    /* The global .card is content-box: its width: 100% + padding made each
       card 20px wider than its column, bleeding into the neighboring card
       and eating the gap. */
    .card {
      box-sizing: border-box;
    }

    .mobile-layout {
      display: none;
    }
  }
</style>
