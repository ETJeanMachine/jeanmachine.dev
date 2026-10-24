<script lang="ts">
  import { richText, type Segment, type Mark } from '$lib/blog/richtext';
  const defaultScope = $props.id();
  let {
    text,
    facets = [],
    scope = defaultScope,
  }: { text: string; facets?: unknown; scope?: string } = $props();
  const content = $derived(richText(text, facets, scope));
  const tags: Record<Mark, string> = {
    bold: 'strong',
    italic: 'em',
    code: 'code',
    underline: 'u',
    strikethrough: 's',
    highlight: 'mark',
  };
</script>

{#snippet marked(segment: Segment, index: number)}
  {#if index < segment.marks.length}
    <svelte:element this={tags[segment.marks[index]]}
      >{@render marked(segment, index + 1)}</svelte:element
    >
  {:else}{segment.text}{/if}
{/snippet}

{#each content.segments as segment}
  {#if segment.href}<a href={segment.href} rel="noopener noreferrer"
      >{@render marked(segment, 0)}</a
    >{:else}{@render marked(segment, 0)}{/if}
  {#each segment.notes as note}
    <sup
      ><a
        id={`${note}:ref`}
        href={`#${note}`}
        aria-label={`Footnote ${content.footnotes.findIndex((item) => item.id === note) + 1}`}
        >{content.footnotes.findIndex((item) => item.id === note) + 1}</a
      ></sup
    >
  {/each}
{/each}
{#if content.footnotes.length}
  <span class="footnotes" role="note" aria-label="Footnotes">
    {#each content.footnotes as note, index}
      <span id={note.id} class="footnote"
        ><sup>{index + 1}.</sup>
        {note.text}
        <a
          href={`#${note.id}:ref`}
          aria-label={`Back to footnote ${index + 1} reference`}>↩</a
        ></span
      >
    {/each}
  </span>
{/if}
