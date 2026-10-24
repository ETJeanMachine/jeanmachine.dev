<script lang="ts">
  import { renderMath } from '$lib/blog/math';
  let { tex }: { tex: string } = $props();
  const rendered = $derived(renderMath(tex));
</script>

<div class="math-block">
  {#if rendered}{@html rendered}{:else}<p class="content-notice">
      Equation shown as TeX (could not render safely).
    </p>
    <pre><code>{tex}</code></pre>{/if}
</div>
