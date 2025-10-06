<script lang="ts">
  import { Profile, Pinned, About, Github } from '$lib/components';
</script>

<!-- <Post {rkey}></Post> -->

<!-- Desktop Layout -->
<div class="desktop-layout">
  <div
    style="display: flex; flex-direction: column; gap: 5px; min-width: 36vw;"
  >
    <div class="card">
      <div class="card-content profile">
        <Profile />
      </div>
    </div>
    <div class="card">
      <div class="card-content">
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
<div class="mobile-layout card">
  <div class="card-content">
    <Profile mobile={true} />
    <hr />
    <div>
      <Pinned />
    </div>
    <hr />
    <div>
      <About />
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
</style>
