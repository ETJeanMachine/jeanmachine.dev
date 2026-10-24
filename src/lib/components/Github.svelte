<script lang="ts">
  import { Github as GithubIcon } from '@lucide/svelte';
  import type { ContributionCalendar, LanguageStat } from '$lib/github';
  import type { HomeState } from '$lib/home';

  type DisplayLanguage = Pick<LanguageStat, 'name' | 'percent' | 'color'>;

  const {
    calendar,
    languageData,
  }: { calendar: HomeState['calendar']; languageData: HomeState['languages'] } =
    $props();

  const TOP_LANGUAGES = 8;

  // Language name (lowercase) → theme accent variable, matching each language
  // to the closest Catppuccin accent.
  const LANGUAGE_COLORS: Record<string, string> = {
    typescript: 'var(--blue)',
    javascript: 'var(--yellow)',
    python: 'var(--teal)',
    rust: 'var(--peach)',
    go: 'var(--sky)',
    c: 'var(--subtext)',
    'c++': 'var(--pink)',
    'c#': 'var(--green)',
    java: 'var(--maroon)',
    kotlin: 'var(--mauve)',
    swift: 'var(--peach)',
    ruby: 'var(--red)',
    php: 'var(--lavender)',
    html: 'var(--peach)',
    css: 'var(--lavender)',
    scss: 'var(--pink)',
    shell: 'var(--green)',
    powershell: 'var(--blue)',
    lua: 'var(--blue)',
    dart: 'var(--teal)',
    haskell: 'var(--lavender)',
    elixir: 'var(--mauve)',
    erlang: 'var(--red)',
    zig: 'var(--yellow)',
    nix: 'var(--sky)',
    vue: 'var(--green)',
    svelte: 'var(--peach)',
    astro: 'var(--pink)',
    'jupyter notebook': 'var(--peach)',
    r: 'var(--blue)',
    matlab: 'var(--red)',
    assembly: 'var(--overlay)',
    makefile: 'var(--subtext)',
    dockerfile: 'var(--sky)',
  };

  function langColor(lang: DisplayLanguage): string {
    return (
      LANGUAGE_COLORS[lang.name.toLowerCase()] ?? lang.color ?? 'var(--overlay)'
    );
  }

  const totalContributions = $derived(calendar.data?.totalContributions ?? 0);
  const maxDailyContributions = $derived(
    calendar.data ? maxContributions(calendar.data) : 0,
  );
  const weeks = $derived(calendar.data?.weeks ?? []);
  const languages = $derived(languageData.data?.languages ?? []);

  const displayed: DisplayLanguage[] = $derived.by(() => {
    const top = languages.slice(0, TOP_LANGUAGES);
    if (top.length === 0) return [];
    const rest = 100 - top.reduce((sum, lang) => sum + lang.percent, 0);
    return rest > 0.05
      ? [...top, { name: 'Other', percent: rest, color: null }]
      : top;
  });

  // Month label shown above each week column (null = no label).
  let weekLabels = $derived.by(() => {
    const labels: (string | null)[] = [];
    let lastMonth = '';
    for (const week of weeks) {
      const first = week.contributionDays[0];
      if (!first) {
        labels.push(null);
        continue;
      }
      const month = first.date.slice(0, 7);
      if (month !== lastMonth) {
        lastMonth = month;
        labels.push(
          new Date(`${first.date}T00:00:00`).toLocaleString('en-US', {
            month: 'short',
          }),
        );
      } else {
        labels.push(null);
      }
    }
    return labels;
  });

  // Continuous shading: 30% sapphire at the smallest non-zero count,
  // scaling linearly up to 100% at the peak day. 0 = unshaded.
  function shade(count: number): number {
    if (count <= 0 || maxDailyContributions <= 0) return 0;
    return 30 + 70 * Math.sqrt(count / maxDailyContributions);
  }

  function shadeStyle(shade: number): string {
    return shade > 0
      ? `background-color: color-mix(in srgb, var(--sapphire) ${shade}%, var(--surface))`
      : '';
  }

  // Weekday (0 = Sunday) of a YYYY-MM-DD date, used to pad the first week
  // down to its correct row.
  function weekday(dateString: string): number {
    return new Date(`${dateString}T00:00:00`).getDay();
  }

  // Maximum contributions we've ever made in a single day.
  function maxContributions(calendar: ContributionCalendar): number {
    return calendar.weeks.reduce((max, week) => {
      return week.contributionDays.reduce(
        (weekMax, day) => Math.max(weekMax, day.contributionCount),
        max,
      );
    }, 0);
  }
</script>

<h2>
  <GithubIcon size={'1.25rem'} strokeWidth={2.5} /> GitHub
</h2>
{#if calendar.error}
  <p class="error">{calendar.error}</p>
{:else if calendar.status === 'loading'}
  <p>Loading contributions…</p>
{:else}
  <p class="total">{totalContributions} contributions in the last year</p>
  {#if weeks.length === 0}
    <p>No contribution activity available.</p>
  {:else}
    <div class="calendar">
      {#each weeks as week, i}
        {@const leading =
          i === 0 && week.contributionDays[0]
            ? weekday(week.contributionDays[0].date)
            : 0}
        {@const trailing = Math.max(
          0,
          7 - week.contributionDays.length - leading,
        )}
        <div class="week-col">
          <span class="month-label">{weekLabels[i] ?? ''}</span>
          <div class="week">
            {#each Array(leading) as _}
              <span class="day pad"></span>
            {/each}
            {#each week.contributionDays as day}
              {@const dayShade = shade(day.contributionCount)}
              <span
                class="day"
                style={shadeStyle(dayShade)}
                title="{day.contributionCount} contribution{day.contributionCount ===
                1
                  ? ''
                  : 's'} on {day.date}"
              ></span>
            {/each}
            {#each Array(trailing) as _}
              <span class="day pad"></span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
    <div class="calendar-legend">
      <span>Less</span>
      {#each [0, 30, 53.33, 76.67, 100] as legendShade}
        <span class="day" style={shadeStyle(legendShade)}></span>
      {/each}
      <span>More</span>
    </div>
  {/if}
{/if}

<hr />

{#if languageData.error}
  <p class="error">{languageData.error}</p>
{:else if languageData.status === 'loading'}
  <p>Loading languages…</p>
{:else if languages.length === 0}
  <p>No language data available.</p>
{:else}
  <div class="lang-bar" role="img" aria-label="Most used languages">
    {#each displayed as lang}
      <span
        class="segment"
        style="width: {lang.percent}%; background: {langColor(lang)};"
        title="{lang.name} {lang.percent.toFixed(1)}%"
      ></span>
    {/each}
  </div>
  <ul class="lang-legend">
    {#each displayed as lang}
      <li>
        <span class="dot" style="background: {langColor(lang)}"></span>
        {lang.name}
        <span class="pct">{lang.percent.toFixed(1)}%</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .calendar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 2px;
  }

  .week-col {
    flex: 1 1 14px;
    min-width: 8px;
    max-width: 14px;
  }

  .month-label {
    display: block;
    height: 12px;
    font-size: 0.7rem;
    line-height: 12px;
    color: var(--subtext);
    white-space: nowrap;
  }

  .week {
    display: grid;
    gap: 2px;
  }

  .day {
    width: 100%;
    aspect-ratio: 1 / 1;
    border: 1px solid color-mix(in srgb, var(--overlay) 45%, transparent);
    border-radius: 2px;
    background-color: color-mix(in srgb, var(--surface) 80%, transparent);
    box-sizing: border-box;
  }

  /* Padding cells (before the chart window / after today) hold their grid
     slots for weekday alignment but render as nothing. */
  .day.pad {
    visibility: hidden;
  }

  .calendar-legend {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 3px;
    margin-top: 6px;
    font-size: 0.7rem;
    color: var(--subtext);
  }

  .calendar-legend .day {
    width: 10px;
    height: 10px;
    aspect-ratio: auto;
    flex: none;
  }

  .total {
    color: var(--subtext);
  }

  .error {
    color: var(--sapphire);
  }

  .lang-bar {
    display: flex;
    gap: 2px;
    height: 10px;
    border-radius: 5px;
    overflow: hidden;
    background-color: var(--surface);
  }

  .lang-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    list-style: none;
    padding: 0;
    margin: 0.75rem 0 0 0;
    font-size: 0.8rem;
  }

  .lang-legend li {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .pct {
    color: var(--subtext);
  }
</style>
