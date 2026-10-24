<script lang="ts">
  import type { PubLeafletBlocksDrawing } from '@atcute/leaflet';
  let { value }: { value: PubLeafletBlocksDrawing.Main } = $props();
  function points(values: number[], stride: number) {
    const result: string[] = [];
    for (let i = 0; i + 1 < values.length; i += stride)
      result.push(`${values[i]},${values[i + 1]}`);
    return result.join(' ');
  }
</script>

<figure class="drawing">
  <svg
    viewBox={`${value.viewBox.x} ${value.viewBox.y} ${value.viewBox.width} ${value.viewBox.height}`}
    role="img"
    aria-label="Author's drawing"
  >
    <title>Author's drawing</title>
    {#each value.fills ?? [] as fill}<polygon
        points={points(fill.points, 2)}
        fill="var(--surface)"
      />{/each}
    {#each value.strokes as stroke}<polyline
        points={points(stroke.points, 3)}
        fill="none"
        stroke="currentColor"
        stroke-width={stroke.size}
        stroke-linecap="round"
        stroke-linejoin="round"
      />{/each}
  </svg>
  <figcaption>
    Drawing, adapted to site colors with uniform stroke pressure.
  </figcaption>
</figure>
