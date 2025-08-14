<script lang="ts">
  import { get } from "svelte/store";
  import { onMount } from "svelte";

  const pds_url = "https://pds.jeanmachine.dev";
  const handle = "jeanmachine.dev";
  let blogs: any[];

  async function getBlogs(page = 0) {
    let response = await fetch(
      `${pds_url}/xrpc/com.atproto.repo.listRecords?repo=${handle}&collection=com.whtwnd.blog.entry`,
    );
    let blogs = await response.json();
    // reconstructing the array to have only public blog posts.
    blogs = blogs.records.filter(
      (blog: any) => blog.value.visibility === "public",
    );
    blogs = blogs.map((blog: any) => ({
      ...blog,
      rkey: blog.uri.split("/").pop(),
    }));
    return blogs;
  }

  onMount(async () => {
    blogs = await getBlogs();
    console.log(blogs);
  });
</script>

<div class="container">
  {#each blogs as blog}
    <a href="/blog/{blog.rkey}">
      <div class="card glass">
        <h1>{blog.value.title}</h1>
        <h3>{blog.value.createdAt}</h3>
      </div>
    </a>
  {/each}
</div>
