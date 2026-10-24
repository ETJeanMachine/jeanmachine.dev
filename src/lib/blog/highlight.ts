import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import javascript from 'shiki/langs/javascript.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import json from 'shiki/langs/json.mjs';
import html from 'shiki/langs/html.mjs';
import css from 'shiki/langs/css.mjs';
import bash from 'shiki/langs/bash.mjs';
import python from 'shiki/langs/python.mjs';
import markdown from 'shiki/langs/markdown.mjs';
import yaml from 'shiki/langs/yaml.mjs';
import svelte from 'shiki/langs/svelte.mjs';
import latte from 'shiki/themes/catppuccin-latte.mjs';
import frappe from 'shiki/themes/catppuccin-frappe.mjs';

// Public language modules include their embedded grammars (including PostCSS
// for Svelte). Deduplicate those dependencies, without loading a full bundle.
const grammars = [
  ...new Map(
    [
      ...javascript,
      ...typescript,
      ...json,
      ...html,
      ...css,
      ...bash,
      ...python,
      ...markdown,
      ...yaml,
      ...svelte,
    ].map((grammar) => [grammar.name, grammar]),
  ).values(),
];
const languages = new Map(
  grammars.flatMap((grammar) =>
    [grammar.name, ...(grammar.aliases ?? [])].map(
      (name) => [name, grammar.name] as const,
    ),
  ),
);

export const HIGHLIGHT_LIMITS = {
  codeUnits: 20_000,
  lineCodeUnits: 2_000,
  lines: 400,
  tokens: 10_000,
  cacheEntries: 32,
} as const;

export interface CodeToken {
  text: string;
  light: string;
  dark: string;
}

let highlighter: ReturnType<typeof createHighlighterCoreSync> | undefined;
const cache = new Map<string, CodeToken[] | null>();

/** null means render the original source as escaped plaintext, never HTML. */
export function highlightCode(
  source: string,
  language?: string,
): CodeToken[] | null {
  if (
    !language ||
    language.length > 64 ||
    source.length > HIGHLIGHT_LIMITS.codeUnits
  )
    return null;
  const lang = languages.get(language.trim().toLowerCase());
  if (!lang) return null;
  const lines = source.split(/\r\n|\r|\n/);
  if (
    lines.length > HIGHLIGHT_LIMITS.lines ||
    lines.some((line) => line.length > HIGHLIGHT_LIMITS.lineCodeUnits)
  )
    return null;

  const key = `${lang}\0${source}`;
  if (cache.has(key)) {
    const result = cache.get(key)!;
    cache.delete(key);
    cache.set(key, result);
    return result;
  }

  let result: CodeToken[] | null = null;
  try {
    highlighter ??= createHighlighterCoreSync({
      engine: createJavaScriptRegexEngine(),
      langs: grammars,
      themes: [latte, frappe],
    });
    // Normalize only the tokenizer input. Restore every original separator,
    // including lone CRs and trailing blank lines, in the rendered text.
    const endings = source.match(/\r\n|\r|\n/g) ?? [];
    const tokens = highlighter.codeToTokensWithThemes(lines.join('\n'), {
      lang,
      themes: { light: 'catppuccin-latte', dark: 'catppuccin-frappe' },
    });
    const light = highlighter.getTheme('catppuccin-latte').fg;
    const dark = highlighter.getTheme('catppuccin-frappe').fg;
    const output: CodeToken[] = [];
    for (const [index, line] of tokens.entries()) {
      for (const token of line) {
        output.push({
          text: token.content,
          light: token.variants.light.color!,
          dark: token.variants.dark.color!,
        });
      }
      if (endings[index]) {
        output.push({ text: endings[index], light, dark });
      }
      if (output.length > HIGHLIGHT_LIMITS.tokens) break;
    }
    if (
      output.length <= HIGHLIGHT_LIMITS.tokens &&
      output.map((token) => token.text).join('') === source
    )
      result = output;
  } catch {
    // Unsupported engine constructs or grammar errors must not hide the code.
  }
  cache.set(key, result);
  if (cache.size > HIGHLIGHT_LIMITS.cacheEntries)
    cache.delete(cache.keys().next().value!);
  return result;
}
