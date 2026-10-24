// @ts-ignore Bun supplies its test runner without app-wide ambient types.
import { expect, test } from 'bun:test';
// @ts-ignore This file API is test-only; production uses SvelteKit.
import { file } from 'bun';

const css: string = await file(
  new URL('../../index.css', import.meta.url),
).text();
const root = css.match(/:root\s*\{([^}]+)\}/)?.[1] ?? '';

test('emoji presentation keeps the author font stack instead of Chromium platform fallback', () => {
  expect(root).toMatch(/font-variant-emoji:\s*normal;/);
  expect(css).not.toMatch(/font-variant-emoji:\s*(?:unicode|emoji);/);
  expect(css).not.toContain('@fontsource/noto-color-emoji');
  expect(css).toMatch(
    /src:\s*url\('\/fonts\/NotoColorEmoji\/Noto-COLRv1\.b8e25ea6\.ttf'\)\s*format\('truetype'\)\s*tech\(color-COLRv1\);/,
  );
});

test('the self-hosted font is the pixel-tested upstream color build', async () => {
  const font: ArrayBuffer = await file(
    new URL(
      '../../../static/fonts/NotoColorEmoji/Noto-COLRv1.b8e25ea6.ttf',
      import.meta.url,
    ),
  ).arrayBuffer();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', font));
  expect(
    [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
  ).toBe('b8e25ea68db82f9e4d0aee921f4420be2be39887bd5c893a2ad98710531f9d0c');

  const view = new DataView(font);
  expect(view.getUint32(0)).toBe(0x00010000);
  const tables = new Map<string, number>();
  for (let i = 0; i < view.getUint16(4); i++) {
    const offset = 12 + i * 16;
    const tag = String.fromCharCode(...new Uint8Array(font, offset, 4));
    tables.set(tag, view.getUint32(offset + 8));
  }
  expect(tables.has('COLR')).toBe(true);
  expect(tables.has('CPAL')).toBe(true);
  expect(view.getUint16(tables.get('COLR')!)).toBe(1);
});

test('Maple remains ahead of Noto so plain digits and punctuation stay text', () => {
  const stack = root.match(/--font-site:\s*([^;]+);/)?.[1] ?? '';
  expect(stack.split(',').map((family) => family.trim())).toEqual([
    "'Maple Mono'",
    "'Noto Color Emoji'",
    "'Cascadia Code'",
    "'Fira Code'",
    "'Consolas'",
    "'Menlo'",
    'monospace',
  ]);
});
