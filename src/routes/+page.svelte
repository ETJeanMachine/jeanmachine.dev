<script lang="ts">
  import { Profile, Pinned, About, Github } from '$lib/components';
</script>

<!-- <Post {rkey}></Post> -->

<!-- Desktop Layout -->
<div class="desktop-layout">
  <div style="display: flex; flex-direction: row; gap: 5px;">
    <div class="card">
      <div class="card-content profile">
        <Profile />
        <hr />
        <Pinned />
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-content">
      <About />
    </div>
  </div>
</div>

<!-- Mobile Layout -->
<div class="mobile-layout">
  <div class="card-content">
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
