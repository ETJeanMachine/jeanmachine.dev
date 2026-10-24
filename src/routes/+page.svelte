<script lang="ts">
  import { onMount } from 'svelte';
  import { Profile, Pinned, About, Github } from '$lib/components';
  import { createHomeState, loadHome } from '$lib/home';

  let home = $state(createHomeState());

  onMount(() => {
    const controller = new AbortController();
    void loadHome({
      fetch,
      signal: controller.signal,
      onChange: (state) => {
        home = state;
      },
    });
    return () => controller.abort();
  });
</script>

<!-- Desktop Layout -->
<div class="desktop-layout">
  <div class="column profile-column">
    <div class="card profile-card">
      <Profile profile={home.profile.data} error={home.profile.error} />
    </div>
    <div class="card pinned-card">
      <Pinned
        author={home.profile.data}
        pinned={home.pinned}
        counts={home.counts}
        handle={home.handle}
      />
    </div>
  </div>
  <div class="column about-column">
    <div class="card about-card">
      <About />
    </div>
    <div class="card github-card">
      <Github calendar={home.calendar} languageData={home.languages} />
    </div>
  </div>
</div>

<!-- Mobile Layout -->
<div class="mobile-layout">
  <Profile
    mobile={true}
    profile={home.profile.data}
    error={home.profile.error}
  />
  <hr />
  <div>
    <About />
  </div>
  <hr />
  <div>
    <Pinned
      author={home.profile.data}
      pinned={home.pinned}
      counts={home.counts}
      handle={home.handle}
    />
  </div>
  <hr />
  <div>
    <Github calendar={home.calendar} languageData={home.languages} />
  </div>
</div>

<style>
  .desktop-layout :global(.home-heading),
  .mobile-layout :global(.home-heading) {
    display: flex;
    flex-direction: row;
    gap: 10px;
    align-items: center;
  }

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
