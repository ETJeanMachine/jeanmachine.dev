<script lang="ts">
  import type { Block } from '$lib/blog/normalize';
  import BlockRenderer from './BlockRenderer.svelte';
  import Paragraph from './Paragraph.svelte';
  import Heading from './Heading.svelte';
  import Quote from './Quote.svelte';
  import Image from './Image.svelte';
  import Gallery from './Gallery.svelte';
  import Code from './Code.svelte';
  import Rule from './Rule.svelte';
  import List from './List.svelte';
  import WebsiteCard from './WebsiteCard.svelte';
  import Math from './Math.svelte';
  import BlueskyEmbed from './BlueskyEmbed.svelte';
  import Iframe from './Iframe.svelte';
  import Drawing from './Drawing.svelte';
  import PageLink from './PageLink.svelte';
  import Unsupported from './Unsupported.svelte';
  import RecordCard from './RecordCard.svelte';
  import ButtonLink from './ButtonLink.svelte';
  let {
    block,
    pageLinks = {},
  }: { block: Block; pageLinks?: Record<string, string> } = $props();
</script>

{#if block.kind === 'text'}<Paragraph value={block.value} id={block.id} />
{:else if block.kind === 'header'}<Heading value={block.value} id={block.id} />
{:else if block.kind === 'blockquote'}<Quote
    value={block.value}
    id={block.id}
  />
{:else if block.kind === 'image'}<Image value={block.value} />
{:else if block.kind === 'imageGallery'}<Gallery value={block.value} />
{:else if block.kind === 'code'}<Code value={block.value} />
{:else if block.kind === 'horizontalRule'}<Rule />
{:else if block.kind === 'math'}<Math tex={block.value.tex} />
{:else if block.kind === 'website'}<WebsiteCard value={block.value} />
{:else if block.kind === 'bskyPost'}<BlueskyEmbed value={block.value} />
{:else if block.kind === 'iframe'}<Iframe value={block.value} />
{:else if block.kind === 'drawing'}<Drawing value={block.value} />
{:else if block.kind === 'button'}<ButtonLink value={block.value} />
{:else if block.kind === 'list'}<List {block} {pageLinks} />
{:else if block.kind === 'group'}{#each block.blocks as child}<BlockRenderer
      block={child}
      {pageLinks}
    />{/each}
{:else if block.kind === 'page' || block.kind === 'embeddedCanvas'}<PageLink
    pageId={block.value.id}
    {pageLinks}
    label={block.kind === 'embeddedCanvas'
      ? block.value.alt || 'View embedded canvas'
      : 'Continue to linked page'}
  />
{:else if block.kind === 'standardSitePost' || block.kind === 'standardSitePublication'}<RecordCard
    uri={block.value.uri}
    label={block.kind === 'standardSitePost'
      ? 'Referenced article'
      : 'Referenced publication'}
  />
{:else if block.kind === 'poll'}<RecordCard
    uri={block.value.pollRef.uri}
    label="Poll (interactive voting is unavailable)"
  />
{:else if block.kind === 'unsupported'}<Unsupported label={block.label} />
{:else if block.kind === 'html'}<Unsupported
    label="Inline HTML is not displayed in the native reader."
  />
{:else if block.kind === 'membersOnlyDelimiter'}<p class="content-notice">
    This section is marked for members.
  </p>
{:else if block.kind === 'reply'}<Unsupported
    label={block.value.promptText ||
      'Interactive replies are not available in this reader.'}
  />
{:else if block.kind !== 'postHeader'}<Unsupported
    label={`${({ signup: 'Subscriptions', postsList: 'Publication post lists', questions: 'Reader questions', recommendedPubs: 'Publication recommendations' } as Record<string, string>)[block.kind] ?? 'Interactive content'} are not available in this reader.`}
  />
{/if}
