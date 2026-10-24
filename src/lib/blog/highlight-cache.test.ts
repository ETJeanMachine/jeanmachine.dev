// @ts-ignore Bun provides its test runner without app-wide ambient types.
import { expect, test } from 'bun:test';
import { isolatedModule } from '../testing';
import type { CodeToken } from './highlight';
import { HIGHLIGHT_LIMITS } from './highlight';

test('token overflow is negatively cached, refreshed by aliases and bounded by LRU eviction', async () => {
  // Bundle a private copy: never mock Shiki in Bun's shared module registry or
  // expose cache controls from production. Only the tokenizer is substituted.
  const { module } = await isolatedModule(
    new URL('./highlight.ts', import.meta.url),
    {
      virtual: {
        'shiki/core': `
          export let invocations = 0;
          export function createHighlighterCoreSync() {
            return {
              getTheme: () => ({ fg: '#000000' }),
              codeToTokensWithThemes(source) {
                invocations++;
                if (source === '// throw') throw new Error('Tokenizer failed');
                return source.split('\\n').map(line => [...line].map(content => ({
                  content: source === '// mismatch' ? 'wrong' : content,
                  variants: { light: { color: '#000000' }, dark: { color: '#ffffff' } },
                })));
              },
            };
          }
        `,
      },
      transform: (source) =>
        source + '\nexport { invocations } from "shiki/core";',
    },
  );
  const isolated: {
    highlightCode(source: string, language?: string): CodeToken[] | null;
    invocations: number;
  } = module;
  expect(typeof isolated.highlightCode).toBe('function');

  const highlight = isolated.highlightCode;
  for (const [source, language] of [
    ['x', undefined],
    ['x', 'unknown'],
    ['x', 'j'.repeat(65)],
    ['x'.repeat(HIGHLIGHT_LIMITS.codeUnits + 1), 'js'],
    ['x'.repeat(HIGHLIGHT_LIMITS.lineCodeUnits + 1), 'js'],
    ['\n'.repeat(HIGHLIGHT_LIMITS.lines), 'js'],
  ] as const)
    expect(highlight(source, language)).toBeNull();
  expect(isolated.invocations).toBe(0);
  const source = Array(10)
    .fill('x'.repeat(1000))
    .join('\n')
    .slice(0, HIGHLIGHT_LIMITS.tokens + 1);
  expect(source).toHaveLength(HIGHLIGHT_LIMITS.tokens + 1);
  expect(source.length).toBeLessThan(HIGHLIGHT_LIMITS.codeUnits);
  expect(highlight(source, 'js')).toBeNull();
  expect(isolated.invocations).toBe(1);
  expect(highlight(source, ' JavaScript ')).toBeNull();
  expect(isolated.invocations).toBe(1);

  // Exactly the token cap is accepted losslessly (including line separators).
  const atLimit = source.slice(0, HIGHLIGHT_LIMITS.tokens);
  expect(
    highlight(atLimit, 'js')
      ?.map((token) => token.text)
      .join(''),
  ).toBe(atLimit);
  expect(isolated.invocations).toBe(2);
  for (let i = 0; i < HIGHLIGHT_LIMITS.cacheEntries - 2; i++)
    highlight(`// fill-${i}`, 'js');
  const filled = isolated.invocations;
  expect(highlight(source, 'js')).toBeNull();
  expect(isolated.invocations).toBe(filled);
  highlight('// evict-positive', 'js');
  expect(highlight(source, 'js')).toBeNull();
  expect(isolated.invocations).toBe(filled + 1);
  for (let i = 0; i < HIGHLIGHT_LIMITS.cacheEntries; i++)
    highlight(`// evict-${i}`, 'js');
  const evicted = isolated.invocations;
  expect(highlight(source, 'js')).toBeNull();
  expect(isolated.invocations).toBe(evicted + 1);

  for (const failure of ['// throw', '// mismatch']) {
    const before = isolated.invocations;
    expect(highlight(failure, 'js')).toBeNull();
    expect(highlight(failure, 'javascript')).toBeNull();
    expect(isolated.invocations).toBe(before + 1);
  }
});
