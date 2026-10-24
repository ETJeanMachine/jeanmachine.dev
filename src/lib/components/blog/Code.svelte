<script lang="ts">
  import type { PubLeafletBlocksCode } from '@atcute/leaflet';
  import { highlightCode } from '../../blog/highlight';

  let { value }: { value: PubLeafletBlocksCode.Main } = $props();
  const tokens = $derived(highlightCode(value.plaintext, value.language));
</script>

<figure class="code-block">
  {#if value.language}<figcaption>{value.language}</figcaption>{/if}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to focus and horizontally scroll code.) -->
  <pre
    role="region"
    tabindex="0"
    aria-label={value.language ? `${value.language} code` : 'Code'}><code
      >{#if tokens}{#each tokens as token}<span
            class="code-token"
            style:--code-light={token.light}
            style:--code-dark={token.dark}>{token.text}</span
          >{/each}{:else}{value.plaintext}{/if}</code
    ></pre>
</figure>
