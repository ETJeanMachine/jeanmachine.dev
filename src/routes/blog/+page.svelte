<script lang="ts">
  import { get } from "svelte/store";
  import { onMount } from "svelte";
  import { PDS_URL, HANDLE, COLLECTIONS, API_ENDPOINTS } from "$lib/constants";

  let blogs: any[];

  async function getBlogs(page = 0) {
    let response = await fetch(
      `${PDS_URL}${API_ENDPOINTS.ATPROTO_REPO_LIST_RECORDS}?repo=${HANDLE}&collection=${COLLECTIONS.LEAFLET_DOCUMENT}`,
    );
    let blogs = await response.json();
    // reconstructing the array to have only public blog posts.
    let blog_entries = blogs.records.map((blog: any) => ({
      rkey: blog.uri.split("/").pop(),
      title: blog.value.title,
      description: blog.value.description,
      publishedAt: new Date(blog.value.publishedAt).toLocaleDateString(),
    }));
    console.log(blog_entries);
    return blog_entries;
  }

  onMount(async () => {
    blogs = await getBlogs();
    console.log(blogs);
  });
</script>

<div class="blog-container">
  {#each blogs as blog}
    <article class="blog-card">
      <a href="/blog/{blog.rkey}" class="blog-card-link">
        <div class="blog-card-content">
          <header class="blog-card-header">
            <h2 class="blog-card-title">{blog.title}</h2>
            <time class="blog-card-date" datetime={blog.publishedAt}
              >{blog.publishedAt}</time
            >
          </header>
          <p class="blog-card-description">{blog.description}</p>
        </div>
      </a>
    </article>
  {/each}
</div>

<style>
  .blog-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .blog-card {
    position: relative;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .blog-card:hover {
    transform: translateY(-4px);
    box-shadow:
      0 8px 30px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .blog-card-link {
    display: block;
    text-decoration: none;
    color: inherit;
    height: 100%;
  }

  .blog-card-content {
    padding: 1.5rem;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .blog-card-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .blog-card-title {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.4;
    color: #ffffff;
    margin: 0;
    word-wrap: break-word;
  }

  .blog-card-date {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 400;
  }

  .blog-card-description {
    margin: 0;
    margin-top: 1rem;
    font-size: 0.9rem;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.8);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .blog-container {
      grid-template-columns: 1fr;
      padding: 1rem;
      gap: 1rem;
    }

    .blog-card-content {
      padding: 1.25rem;
    }
  }
</style>
