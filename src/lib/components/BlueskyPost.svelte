<script lang="ts">
  import { HANDLE, USER_DID } from '$lib/constants';
  import { Butterfly } from '$lib/icons';

  let { post, author } = $props<{ post: any; author: any }>();

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getPostUrl(uri: string): string {
    const rkey = uri.split('/').pop();
    return `https://bsky.app/profile/${HANDLE}/post/${rkey}`;
  }
</script>

<div class="post">
  <div class="post-header">
    <a
      href={`https://bsky.app/profile/${HANDLE}`}
      class="handle"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img src={author.avatar} alt={author.displayName} class="avatar" /></a
    >
    <div class="author-info">
      <a
        href={`https://bsky.app/profile/${HANDLE}`}
        class="handle"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="display-name">{author.displayName}</span></a
      >
      <a
        href={`https://bsky.app/profile/${HANDLE}`}
        class="handle"
        target="_blank"
        rel="noopener noreferrer">@{HANDLE}</a
      >
    </div>
  </div>

  <div class="post-content">
    <p>{post.value.text}</p>

    {#if post.value.embed}
      {#if post.value.embed.$type === 'app.bsky.embed.record'}
        <div class="quote-post">
          <div class="quote-header">
            <span class="quote-author">Quoted post</span>
          </div>
          <div class="quote-content">
            <p class="quote-text">
              {post.value.embed.record.uri}
            </p>
          </div>
        </div>
      {:else if post.value.embed.$type === 'app.bsky.embed.images'}
        <div class="images">
          {#each post.value.embed.images as image}
            <img src={image.image} alt={image.alt || ''} class="post-image" />
          {/each}
        </div>
      {:else if post.value.embed.$type === 'app.bsky.embed.external'}
        <a
          href={post.value.embed.external.uri}
          class="external-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {#if post.value.embed.external.thumb}
            <img
              src={post.value.embed.external.thumb}
              alt=""
              class="external-thumb"
            />
          {/if}
          <div class="external-info">
            <span class="external-title">{post.value.embed.external.title}</span
            >
            <span class="external-description"
              >{post.value.embed.external.description}</span
            >
          </div>
        </a>
      {/if}
    {/if}
  </div>

  <div class="post-footer">
    <a href={getPostUrl(post.uri)} target="_blank" rel="noopener noreferrer">
      {formatDate(post.value.createdAt)}
    </a>
    <Butterfly size={20} color="#1185fe" />
  </div>
</div>

<style>
  .post {
    border: 1px solid #2e3236;
    border-radius: 16px;
    padding: 16px;
    background-color: #16191f;
    max-width: 100%;
    width: 100%;
    box-sizing: border-box;
  }

  .post-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
  }

  .author-info {
    display: flex;
    flex-direction: column;
  }

  .display-name {
    font-weight: bold;
    font-size: 15px;
    color: #e7e9ea;
  }

  .handle {
    font-size: 14px;
    color: #7c8b9c;
    text-decoration: none;
  }

  .handle:hover {
    text-decoration: underline;
  }

  .post-content {
    margin-bottom: 12px;
  }

  .post-content p {
    margin: 0 0 12px 0;
    font-size: 15px;
    line-height: 1.5;
    color: #e7e9ea;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .quote-post {
    border: 1px solid #2e3236;
    border-radius: 12px;
    padding: 12px;
    margin-top: 12px;
    background-color: #1c1f26;
  }

  .quote-header {
    margin-bottom: 8px;
  }

  .quote-author {
    font-size: 13px;
    color: #7c8b9c;
    font-weight: 500;
  }

  .quote-content {
    font-size: 14px;
  }

  .quote-text {
    margin: 0;
    color: #e7e9ea;
  }

  .images {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 8px;
    margin-top: 12px;
  }

  .post-image {
    width: 100%;
    border-radius: 12px;
    object-fit: cover;
  }

  .external-link {
    display: flex;
    flex-direction: column;
    border: 1px solid #2e3236;
    border-radius: 12px;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    margin-top: 12px;
  }

  .external-link:hover {
    background-color: #1c1f26;
  }

  .external-thumb {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  .external-info {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .external-title {
    font-weight: 600;
    font-size: 14px;
    color: #e7e9ea;
  }

  .external-description {
    font-size: 13px;
    color: #7c8b9c;
  }

  .post-footer {
    padding-top: 12px;
    border-top: 1px solid #2e3236;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .post-footer a {
    color: #7c8b9c;
    font-size: 14px;
    text-decoration: none;
  }

  .post-footer a:hover {
    text-decoration: underline;
  }
</style>
