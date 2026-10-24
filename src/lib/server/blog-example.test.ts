// @ts-ignore Bun provides its test runner without app-wide ambient types.
import { expect, test } from 'bun:test';
// @ts-ignore The build API is used only for isolated, in-memory route compilation.
import { build, file } from 'bun';

import { render } from 'svelte/server';
import { is } from '@atcute/lexicons';
import {
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksStandardSitePost,
  PubLeafletBlocksStandardSitePublication,
  PubLeafletBlocksWebsite,
  PubLeafletContent,
  PubLeafletRichtextFacet,
} from '@atcute/leaflet';
import {
  SiteStandardDocument,
  SiteStandardPublication,
} from '@atcute/standard-site';
import { normalizeContent, type Block } from '../blog/normalize';
import { richText } from '../blog/richtext';
import { imageUrl, safeWebUrl } from '../blog/urls';
import { svelteSSR, type TestBuildHooks } from '../blog/testing';
import { exampleArticle, exampleContent } from './blog-example';

function flatten(blocks: Block[]): Block[] {
  return blocks.flatMap((block) => [
    block,
    ...(block.kind === 'group'
      ? flatten(block.blocks)
      : block.kind === 'list'
        ? block.items.flatMap((item) =>
            flatten([item.block, ...(item.nested ? [item.nested] : [])]),
          )
        : []),
  ]);
}

test('local envelopes and current Leaflet schemas validate; only the deliberate future block is unsupported', () => {
  expect(is(SiteStandardDocument.mainSchema, exampleArticle.document)).toBe(
    true,
  );
  expect(
    is(SiteStandardPublication.mainSchema, exampleArticle.publication),
  ).toBe(true);
  expect(is(PubLeafletContent.mainSchema, exampleContent)).toBe(true);
  expect(exampleArticle.document.site).toContain('/site.standard.publication/');
  expect(exampleArticle.document.content).toBe(exampleContent);
  expect(exampleArticle.rkey).toBe('example');
  expect(exampleContent.blobPages).toBeUndefined();

  const normalized = normalizeContent(exampleContent);
  expect(normalized.truncated).toBe(false);
  expect(normalized.fallback).toBeNull();
  expect(normalized.pages.map((page) => page.canvas)).toEqual([
    false,
    false,
    true,
  ]);
  expect(Object.keys(normalized.pageLinks)).toEqual([
    'examples',
    'second-page',
    'example-canvas',
  ]);
  const blocks = normalized.pages.flatMap((page) => flatten(page.blocks));
  expect([...new Set(blocks.map((block) => block.kind))].sort()).toEqual(
    [
      'blockquote',
      'bskyPost',
      'button',
      'code',
      'drawing',
      'embeddedCanvas',
      'group',
      'header',
      'horizontalRule',
      'html',
      'iframe',
      'image',
      'imageGallery',
      'list',
      'math',
      'membersOnlyDelimiter',
      'page',
      'poll',
      'postHeader',
      'postsList',
      'questions',
      'recommendedPubs',
      'reply',
      'signup',
      'standardSitePost',
      'standardSitePublication',
      'text',
      'unsupported',
      'website',
    ].sort(),
  );
  expect(
    blocks
      .filter((block) => block.kind === 'unsupported')
      .map((block) => block.label),
  ).toEqual(['Unsupported block: futureExample']);
  const duplicates = blocks.filter(
    (block) =>
      block.kind === 'header' && block.value.plaintext === 'Duplicate heading',
  );
  expect(duplicates.map((block) => block.id)).toEqual([
    'article-duplicate-heading',
    'article-duplicate-heading-2',
  ]);
});

test('embed examples keep verified public references and authored website metadata without network requests', () => {
  const blocks = normalizeContent(exampleContent).pages.flatMap((page) =>
    flatten(page.blocks),
  );
  const posts = blocks.filter((block) => block.kind === 'bskyPost');
  expect(posts).toHaveLength(1);
  expect(is(PubLeafletBlocksBskyPost.mainSchema, posts[0].value)).toBe(true);
  const postRef = {
    uri: 'at://did:plc:6vxtya3serxcwvcdk5e7psvv/app.bsky.feed.post/3m4omtcysns2i',
    cid: 'bafyreifqys7n5wgzvhy56kjiyf4b7j7akcyfin3rzvygzbdiveobfapldm',
  };
  expect(posts[0].value.postRef).toEqual(postRef);

  const articles = blocks.filter((block) => block.kind === 'standardSitePost');
  expect(articles).toHaveLength(1);
  expect(
    is(PubLeafletBlocksStandardSitePost.mainSchema, articles[0].value),
  ).toBe(true);
  expect(articles[0].value.uri).toBe(
    'at://did:plc:6vxtya3serxcwvcdk5e7psvv/site.standard.document/3m4omt5rj5c2i',
  );
  const publications = blocks.filter(
    (block) => block.kind === 'standardSitePublication',
  );
  expect(publications).toHaveLength(1);
  expect(
    is(
      PubLeafletBlocksStandardSitePublication.mainSchema,
      publications[0].value,
    ),
  ).toBe(true);
  expect(publications[0].value.uri).toBe(
    'at://did:plc:6vxtya3serxcwvcdk5e7psvv/site.standard.publication/3lwddhdcemk2l',
  );

  const websites = blocks
    .filter((block) => block.kind === 'website')
    .map((block) => block.value);
  expect(websites).toEqual([
    {
      $type: 'pub.leaflet.blocks.website',
      src: 'https://jeanmachine.dev',
      title: 'Eliza Hamilton',
      description: 'Software Engineer, Caffeine Addict, Transit Enthusiast.',
      previewImage: {
        $type: 'blob',
        ref: {
          $link: 'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4',
        },
        mimeType: 'image/webp',
        size: 7030,
      },
    },
    {
      $type: 'pub.leaflet.blocks.website',
      src: 'https://standard.site',
      title: 'One schema. Every platform.',
      description:
        'Standard.site provides shared lexicons for long-form publishing on AT Protocol.',
    },
  ]);
  for (const website of websites) {
    expect(is(PubLeafletBlocksWebsite.mainSchema, website)).toBe(true);
    expect(safeWebUrl(website.src)).toBe(`${website.src}/`);
  }
  expect(imageUrl(websites[0].previewImage)).toBe(
    '/api/atproto/blob?cid=bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4&mimetype=image%2Fwebp',
  );
  expect(websites[1].previewImage).toBeUndefined();
  expect(
    blocks
      .filter((block) => block.kind === 'button')
      .map((block) => block.value),
  ).toEqual([
    {
      $type: 'pub.leaflet.blocks.button',
      text: 'Back to the blog',
      url: 'https://jeanmachine.dev/blog',
    },
  ]);
  expect(
    blocks.filter((block) => block.kind === 'poll').map((block) => block.value),
  ).toEqual([{ $type: 'pub.leaflet.blocks.poll', pollRef: postRef }]);
});

test('every facet validates and uses UTF-8 boundaries; Unicode overlap and all supported inline features survive', () => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const features = new Set<string>();
  let count = 0;
  for (const block of normalizeContent(exampleContent).pages.flatMap((page) =>
    flatten(page.blocks),
  )) {
    if (block.kind !== 'text' || !block.value.facets?.length) continue;
    const { plaintext, facets } = block.value;
    const bytes = encoder.encode(plaintext);
    for (const facet of facets) {
      expect(is(PubLeafletRichtextFacet.mainSchema, facet)).toBe(true);
      const { byteStart, byteEnd } = facet.index;
      expect(byteEnd).toBeGreaterThan(byteStart);
      expect(byteEnd).toBeLessThanOrEqual(bytes.length);
      for (const range of [
        bytes.slice(0, byteStart),
        bytes.slice(byteStart, byteEnd),
        bytes.slice(byteEnd),
      ]) {
        expect(() => decoder.decode(range)).not.toThrow();
      }
      for (const feature of facet.features) features.add(String(feature.$type));
      count++;
    }
    const result = richText(plaintext, facets);
    expect(result.segments.map((segment) => segment.text).join('')).toBe(
      plaintext,
    );
    expect(result.segments).toContainEqual({
      text: 'café',
      marks: ['bold', 'italic'],
      href: null,
      notes: [],
    });
    expect(result.footnotes).toHaveLength(1);
  }
  expect(count).toBeGreaterThan(10);
  expect([...features].sort()).toEqual(
    [
      'bold',
      'italic',
      'code',
      'underline',
      'strikethrough',
      'highlight',
      'link',
      'atMention',
      'didMention',
      'footnote',
    ]
      .map((name) => `pub.leaflet.richtext.facet#${name}`)
      .sort(),
  );
});

// Compile real route sources with isolated virtual $app modules. No global
// mock.module calls: production/dev cases cannot poison other renderer tests.

async function routeModule(relativePath: string, dev: boolean, search = '') {
  const entrypoint = new URL(relativePath, import.meta.url).pathname;
  const result = await build({
    entrypoints: [entrypoint],
    target: 'bun',
    external: ['svelte', 'svelte/*', '@sveltejs/kit'],
    minify: { syntax: true },
    plugins: [
      {
        name: 'isolated-example-routes',
        setup(hooks: TestBuildHooks) {
          // SvelteKit supplies dev as a compile-time constant; inline it here too.
          hooks.onLoad({ filter: /\+page\.server\.ts$/ }, async ({ path }) => ({
            contents: (await file(path).text()).replace(
              "import { dev } from '$app/environment';",
              `const dev = ${dev};`,
            ),
            loader: 'ts',
          }));
          hooks.onResolve({ filter: /^\$app\// }, ({ path }) => ({
            path,
            namespace: 'example-app',
          }));
          hooks.onLoad(
            { filter: /.*/, namespace: 'example-app' },
            ({ path }) => ({
              contents:
                path === '$app/environment'
                  ? `export const dev = ${dev};`
                  : path === '$app/state'
                    ? `export const page = {url: new URL('https://local.test/blog${search}')};`
                    : 'export const goto = () => { throw new Error("Unexpected SSR navigation"); };',
              loader: 'js',
            }),
          );
          hooks.onResolve({ filter: /^\$lib(?:\/|$)/ }, ({ path }) => ({
            path: new URL(
              path === '$lib'
                ? '../index.ts'
                : path === '$lib/blog' || path === '$lib/components/blog'
                  ? `../${path.slice(5)}/index.ts`
                  : `../${path.slice(5)}.ts`,
              import.meta.url,
            ).pathname,
          }));

          // Empty listing SSR never renders pagination icons. Keep its compilation small.
          hooks.onResolve({ filter: /^@lucide\/svelte$/ }, () =>
            relativePath === '../../routes/blog/+page.svelte'
              ? { path: 'icons', namespace: 'example-icons' }
              : undefined,
          );
          hooks.onLoad({ filter: /.*/, namespace: 'example-icons' }, () => ({
            contents:
              'export const ChevronFirst = () => {}; export const ChevronLast = ChevronFirst; export const ChevronLeft = ChevronFirst; export const ChevronRight = ChevronFirst;',
            loader: 'js',
          }));
        },
      },
      svelteSSR(),
    ],
  });
  if (!result.success) throw new Error(String(result.logs));
  const code = (await result.outputs[0].text()).replace(
    /(['"])(svelte(?:\/[^'"]*)?|@sveltejs\/kit)\1/g,
    (_match: string, _quote: string, specifier: string) =>
      JSON.stringify(import.meta.resolve(specifier)),
  );
  const url = URL.createObjectURL(
    new Blob([code], { type: 'text/javascript' }),
  );
  try {
    return { code, module: await import(url) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

test('reserved example route is local/no-store in dev and 404 before any PDS fetch in production', async () => {
  let calls = 0;
  const fetcher = () => {
    calls++;
    throw new Error('Unexpected PDS fetch');
  };
  const headers: Record<string, string>[] = [];
  const event = {
    params: { rkey: 'example' },
    fetch: fetcher,
    setHeaders: (value: Record<string, string>) => headers.push(value),
  };
  const development = await routeModule(
    '../../routes/blog/[rkey]/+page.server.ts',
    true,
  );
  const article = await development.module.load(event);
  expect(article).toEqual(exampleArticle);
  expect(headers).toEqual([{ 'Cache-Control': 'no-store' }]);

  const production = await routeModule(
    '../../routes/blog/[rkey]/+page.server.ts',
    false,
  );
  expect(production.code.includes('Leaflet component examples')).toBe(false);
  expect(
    production.code.includes(
      'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4',
    ),
  ).toBe(false);
  await expect(production.module.load(event)).rejects.toMatchObject({
    status: 404,
  });
  expect(calls).toBe(0);
  expect(headers).toHaveLength(1);
});

test('example SSR uses the native Article, escaped fallbacks, opt-in media and preview-only metadata', async () => {
  const { module } = await routeModule(
    '../../routes/blog/[rkey]/+page.svelte',
    true,
  );
  const output = render(module.default, {
    props: {
      data: {
        ...exampleArticle,
        document: {
          ...exampleArticle.document,
          coverImage: {
            $type: 'blob',
            ref: {
              $link:
                'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4',
            },
            mimeType: 'image/webp',
            size: 7030,
          },
        },
      },
    },
  });
  const html = output.body;
  expect(html).toMatch(
    /<article class="native-article\b[^"]*" data-document-key="example">/,
  );
  expect(html).not.toContain('card native-article');
  const cards = [...html.matchAll(/class="card ([^"]+)"/g)];
  expect(cards).toHaveLength(4);
  expect(cards[0][1]).toMatch(/^article-header\b/);
  expect(cards.slice(1).map((card) => card[1])).toEqual([
    'article-page',
    'article-page',
    'article-page',
  ]);
  expect(html).not.toContain('card article-body');
  expect(html).not.toContain('article-navigation');
  expect(html).not.toMatch(/<nav\b/);
  expect(html).not.toContain(exampleArticle.publication.name);
  const markup = html.replace(/<!--[\s\S]*?-->/g, '');
  const pages = [
    ...markup.matchAll(
      /<section class="card article-page" id="([^"]+)" aria-label="([^"]+)">([\s\S]*?)<\/section>/g,
    ),
  ];
  expect(pages.map(([, id, label]) => [id, label])).toEqual([
    ['article-page-1', 'Article page 1'],
    ['article-page-2', 'Article page 2'],
    ['article-page-3', 'Article page 3'],
  ]);
  expect([
    ...markup.matchAll(/<\/section>\s*<section class="card article-page"/g),
  ]).toHaveLength(2);
  expect([...markup.matchAll(/<img\b[^>]*class="cover\b/g)]).toHaveLength(1);
  expect(pages[0][3]).toMatch(/^<img\b[^>]*class="cover\b/);
  expect(pages[0][3]).toContain('href="#article-page-2"');
  expect(pages[0][3]).toContain('href="#article-page-3"');
  expect(pages[1][3]).toContain('Second linear page');
  expect(pages[1][3]).toContain('href="#article-page-1"');
  expect(pages[2][3]).toContain(
    'Canvas content is presented in document order',
  );
  expect(pages[2][3]).toContain('Nested linear group');
  expect(pages[0][3]).not.toContain('<footer');
  expect(pages[1][3]).not.toContain('<footer');
  expect(pages[2][3]).toContain('<footer');
  expect(pages[1][3]).not.toMatch(/class="cover\b/);
  expect(pages[2][3]).not.toMatch(/class="cover\b/);
  const returnLinks = [
    ...markup.matchAll(/<a\b[^>]*href="\/blog"[^>]*>([\s\S]*?)<\/a>/g),
  ].filter(([, label]) => label.includes('Return to blog'));
  expect(returnLinks).toHaveLength(1);
  const footer = markup.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? '';
  expect(footer.trim()).toBe(returnLinks[0][0]);
  expect(returnLinks[0][1]).toMatch(
    /^<svg\b[^>]*aria-hidden="true"[^>]*>[\s\S]*<\/svg>\s*Return to blog\s*$/,
  );
  expect(returnLinks[0][1]).toContain('lucide-chevron-left');
  expect(html).toMatch(/<header class="card article-header\b[^"]*">/);
  expect(html).toMatch(/<div class="article-body\b[^"]*">/);
  expect(html).toContain('<math');
  expect(html).toContain('<svg');
  expect(html).toContain('start="3"');
  expect(html).toContain('Load media from www.youtube-nocookie.com');
  expect(html).toContain(
    'Rick Astley — Never Gonna Give You Up (official video)',
  );
  expect(html).toContain('class="post-card native-embed video-embed"');
  expect(html).toContain('href="https://www.youtube.com/watch?v=dQw4w9WgXc"');
  const video = normalizeContent(exampleContent)
    .pages.flatMap((page) => flatten(page.blocks))
    .find((block) => block.kind === 'iframe');
  expect(video?.value.url).toBe(
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXc',
  );
  expect(html).toContain('Unsupported block: futureExample');
  expect(html).toContain('Valid text after the future block is still visible.');
  expect(html).toContain('Inline HTML is not displayed');
  expect(html).toContain('href="https://jeanmachine.dev/"');
  expect(html).toContain('Eliza Hamilton');
  expect(html).toContain(
    'Software Engineer, Caffeine Addict, Transit Enthusiast.',
  );
  expect(html).toContain('href="https://standard.site/"');
  expect(html).toContain('One schema. Every platform.');
  expect(html).toContain(
    'Standard.site provides shared lexicons for long-form publishing on AT Protocol.',
  );
  expect(html).toContain('href="https://jeanmachine.dev/blog"');
  expect(html).not.toMatch(/<iframe|<script|<strong>Deliberately not injected/);
  expect(html).toContain(
    '/api/atproto/blob?cid=bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4',
  );
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  expect(new Set(ids).size).toBe(ids.length);
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g))
    expect(ids).toContain(target);
  expect(output.head).toContain('name="robots" content="noindex,nofollow"');
  expect(output.head).not.toMatch(/rel="canonical"|property="og:url"/);

  const real = render(module.default, {
    props: { data: { ...exampleArticle, rkey: '3m4omt5rj5c2i' } },
  });
  expect(real.head).toContain(
    'rel="canonical" href="https://jeanmachine.dev/blog/3m4omt5rj5c2i"',
  );
  expect(real.head).toContain(
    'property="og:url" content="https://jeanmachine.dev/blog/3m4omt5rj5c2i"',
  );
  expect(real.head).not.toContain('name="robots"');
});

test('empty listing SSR pins example only on the first development page, never production', async () => {
  for (const [dev, search, visible] of [
    [true, '', true],
    [true, '?page=0', true],
    [true, '?page=1', false],
    [false, '', false],
  ] as const) {
    const { module } = await routeModule(
      '../../routes/blog/+page.svelte',
      dev,
      search,
    );
    const html = render(module.default).body;
    expect(html.includes('href="/blog/example"')).toBe(visible);
    expect(html.includes('Example post — development only')).toBe(visible);
    expect(html).not.toContain('class="paginator');
  }
});
