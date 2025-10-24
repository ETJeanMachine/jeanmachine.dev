<script lang="ts">
  import { Profile, Pinned, About, Github } from '$lib/components/home';
</script>

<!-- <Post {rkey}></Post> -->

<!-- Desktop Layout -->
<div class="desktop-layout">
  <div class="card">
    <Profile />
    <hr />
    <Pinned />
  </div>
  <div class="card">
    <About />
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

    .mobile-layout {
      display: none;
    }
  }
</style>
