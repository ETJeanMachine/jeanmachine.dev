// @ts-ignore Bun provides its test runner without app-wide ambient types.
import { expect, test } from 'bun:test';
// @ts-ignore This loader is test-only; Vite compiles production components.
import { file, plugin } from 'bun';
import { render } from 'svelte/server';
import { highlightCode, HIGHLIGHT_LIMITS } from './highlight';
import { svelteSSR } from './testing';

plugin(
  svelteSSR(/(?:\/components\/blog\/|\/@lucide\/svelte\/).*\.(svelte|css)$/),
);

const reconstruct = (source: string, language = 'javascript') =>
  highlightCode(source, language)
    ?.map((token) => token.text)
    .join('');
const codeMarkup = (html: string) =>
  html
    .match(/<code[^>]*>([\s\S]*?)<\/code>/)?.[1]
    .replace(/<!--[\s\S]*?-->|<\/?span\b[^>]*>/g, '');
const escapeText = (source: string) =>
  source.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

test('real JavaScript, TypeScript and Python tokens carry Latte and Frappe colors', () => {
  for (const [language, source] of [
    ['javascript', 'const count = 42;'],
    ['typescript', 'const count: number = 42;'],
    ['python', 'count = 42\nprint("hello")'],
  ]) {
    const tokens = highlightCode(source, language)!;
    expect(tokens).not.toBeNull();
    expect(tokens.map((token) => token.text).join('')).toBe(source);
    expect(tokens.find((token) => token.text === '42')).toMatchObject({
      light: '#FE640B',
      dark: '#EF9F76',
    });
    expect(new Set(tokens.map((token) => token.light)).size).toBeGreaterThan(1);
    for (const token of tokens) {
      expect(token.light).toMatch(/^#[\da-f]{6}$/i);
      expect(token.dark).toMatch(/^#[\da-f]{6}$/i);
    }
  }
  expect(highlightCode('const count = 42;', 'js')?.[0]).toEqual({
    text: 'const',
    light: '#8839EF',
    dark: '#CA9EE6',
  });
});

test('selected languages, embedded dependencies and public aliases are registered', () => {
  for (const [language, source] of [
    ['json', '{"count": 42}'],
    ['html', '<script>const n = 42;</script><style>a { color: red; }</style>'],
    ['css', 'a { color: red; }'],
    ['bash', 'echo "$HOME" # hello'],
    ['markdown', '# Heading\n**bold**'],
    ['yaml', 'count: 42'],
    ['postcss', 'a { color: red; }'],
    [
      'svelte',
      '<script lang="ts">\nconst n: number = 42;\n</script>\n<style>a { color: red; }</style>\n<p>{n}</p>',
    ],
  ]) {
    const tokens = highlightCode(source, language);
    expect(tokens).not.toBeNull();
    expect(tokens?.map((token) => token.text).join('')).toBe(source);
    expect(new Set(tokens?.map((token) => token.light)).size).toBeGreaterThan(
      1,
    );
  }
  for (const [alias, canonical] of [
    ['js', 'javascript'],
    ['mjs', 'javascript'],
    ['cjs', 'javascript'],
    ['ts', 'typescript'],
    ['mts', 'typescript'],
    ['cts', 'typescript'],
    ['sh', 'shellscript'],
    ['shell', 'shellscript'],
    ['zsh', 'shellscript'],
    ['py', 'python'],
    ['md', 'markdown'],
    ['yml', 'yaml'],
    [' TS ', 'typescript'],
  ]) {
    expect(highlightCode('count = 42', alias)).toBe(
      highlightCode('count = 42', canonical),
    );
  }
});

test('missing, plaintext and untrusted language names fall back without guessing', () => {
  for (const language of [
    undefined,
    '',
    ' ',
    'text',
    'plaintext',
    'txt',
    'unknown',
    'rust',
    '__proto__',
    'constructor',
    '../../javascript',
    '<script>alert(1)</script>',
    'javascript'.repeat(100),
  ]) {
    expect(highlightCode('<img src=x onerror=alert(1)>', language)).toBeNull();
  }
});

test('tabs, emoji selectors/ZWJ sequences and every original line ending are lossless', () => {
  const emoji = '🦋 ❤️ ☕️ 🏳️‍⚧️ 🇺🇸 👩🏽‍💻 1️⃣ ©️ ↔️';
  for (const source of [
    '',
    '\n',
    '\n\n',
    '\r\n\r\n',
    '\r\r',
    `const emoji = "${emoji}";\n\t// café\n\n`,
    `const emoji = "${emoji}";\r\n\t// café\r\n\r\n`,
    '// one\rtwo\r\nthree\nfour\r',
  ]) {
    expect(reconstruct(source)).toBe(source);
  }
});

test('code, line, line-count and token limits fall back instead of truncating', () => {
  for (const source of [
    Array(22).fill('x'.repeat(1_000)).join('\n'),
    'x'.repeat(HIGHLIGHT_LIMITS.lineCodeUnits + 1),
    'x\n'.repeat(HIGHLIGHT_LIMITS.lines),
    Array(100).fill('x+=1;'.repeat(25)).join('\n'),
  ]) {
    expect(highlightCode(source, 'js')).toBeNull();
  }
  expect(reconstruct('x'.repeat(HIGHLIGHT_LIMITS.lineCodeUnits))).toBe(
    'x'.repeat(HIGHLIGHT_LIMITS.lineCodeUnits),
  );
});

test('token cache is bounded and recently used entries survive eviction', () => {
  const oldest = highlightCode('// cache-oldest', 'js');
  const recent = highlightCode('// cache-recent', 'js');
  for (let i = 0; i < HIGHLIGHT_LIMITS.cacheEntries - 2; i++)
    highlightCode(`// cache-fill-${i}`, 'js');
  expect(highlightCode('// cache-recent', 'javascript')).toBe(recent);
  highlightCode('// cache-overflow', 'js');
  expect(highlightCode('// cache-recent', 'js')).toBe(recent);
  expect(highlightCode('// cache-oldest', 'js')).not.toBe(oldest);
});

test('standalone Code and Content SSR escape source while preserving Unicode and trailing lines', async () => {
  const { default: Code } = await import('../components/blog/Code.svelte');
  const { Content } = await import('../components/blog');
  const source =
    'const emoji = "🦋 ❤️ 🏳️‍⚧️ 👩🏽‍💻 1️⃣";\n\tconst html = "<script>alert(1)</script><img src=x onerror=alert(1)>&";\n\n';
  const value = {
    $type: 'pub.leaflet.blocks.code' as const,
    plaintext: source,
    language: 'typescript',
  };
  const code = render(Code, { props: { value } }).body;
  const content = render(Content, {
    props: {
      content: {
        $type: 'pub.leaflet.content',
        pages: [
          {
            $type: 'pub.leaflet.pages.linearDocument',
            blocks: [{ block: value }],
          },
        ],
      },
    },
  }).body;
  for (const html of [code, content]) {
    expect(html).toContain('class="code-token"');
    expect(html).toContain('--code-light: #8839EF');
    expect(html).toContain('--code-dark: #CA9EE6');
    expect(html).toContain('<figcaption>typescript</figcaption>');
    expect(html).toContain(
      'role="region" tabindex="0" aria-label="typescript code"',
    );
    expect(codeMarkup(html)).toBe(escapeText(source));
    expect(html).not.toMatch(
      /<script\b|<img\b|<iframe\b|twemoji|class="emoji"/i,
    );
  }
  // HTML parsers normalize CRLF/lone CR to LF; SSR and token data retain them.
  const crlf = source.replaceAll('\n', '\r\n');
  expect(
    codeMarkup(
      render(Code, { props: { value: { ...value, plaintext: crlf } } }).body,
    ),
  ).toBe(escapeText(crlf));
});

test('SSR fallback retains all escaped source and escapes an untrusted caption', async () => {
  const { default: Code } = await import('../components/blog/Code.svelte');
  for (const [source, language] of [
    ['<script>alert(1)</script>&\t\n\n', undefined],
    ['<img src=x onerror=alert(1)>\n', '\"><script>alert(1)</script>'],
    [
      '<script>"&"</script>\n' + 'x'.repeat(HIGHLIGHT_LIMITS.lineCodeUnits + 1),
      'js',
    ],
  ]) {
    const html = render(Code, {
      props: {
        value: {
          $type: 'pub.leaflet.blocks.code',
          plaintext: source!,
          language,
        },
      },
    }).body;
    expect(codeMarkup(html)).toBe(escapeText(source!));
    expect(html).not.toContain('class="code-token"');
    expect(html).not.toMatch(/<script\b|<img\b/);
  }
});

test('token colors follow the site color scheme without overriding background or typography', async () => {
  const css = await file(
    new URL('../components/blog/content.css', import.meta.url),
  ).text();
  const rule = css.match(/\.blog-content \.code-token\s*\{([^}]*)\}/)?.[1];
  expect(rule?.trim()).toBe(
    'color: light-dark(var(--code-light), var(--code-dark));',
  );
});
