// @ts-ignore Bun supplies these test/runtime modules without app-wide ambient types.
import { expect, test } from 'bun:test';
// @ts-ignore The loader is local to these tests; the production build uses SvelteKit.
import { file, plugin } from 'bun';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { svelteSSR } from './testing';
import { MAX_DEPTH } from './normalize';
import {
  content as pagedContent,
  documentFixture,
  page,
  publicationFixture,
  singlePage as content,
  text,
} from './fixtures';

plugin(
  svelteSSR(
    /(?:\/components\/|\/icons\/|\/@lucide\/svelte\/).*\.(svelte|css)$/,
  ),
);

test('article media sizes images, previews and drawings without enlarging footer icons', async () => {
  const css = await file(
    new URL('../components/blog/content.css', import.meta.url),
  ).text();
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const imageRules = rules.filter(([, selectors]) => /\bimg\b/.test(selectors));
  expect(imageRules.map(([, selectors]) => selectors.trim())).toEqual([
    '.blog-content img,\n.blog-content .drawing svg',
  ]);
  expect(imageRules[0][2]).toMatch(/display:\s*block;/);
  expect(imageRules[0][2]).toMatch(/width:\s*100%;/);
  expect(imageRules[0][2]).toMatch(/height:\s*auto;/);
  const rule = (selector: string) =>
    rules.find(([, selectors]) => selectors.includes(selector))?.[2] ?? '';
  const websitePreview = rule('.website-card .website-media-preview');
  expect(websitePreview).toMatch(/\bwidth:\s*clamp\(64px, 16vw, 96px\);/);
  expect(websitePreview).toMatch(/\bheight:\s*clamp\(64px, 16vw, 96px\);/);
  expect(websitePreview).toMatch(/flex-shrink:\s*0;/);
  expect(websitePreview).toMatch(/object-fit:\s*contain;/);
  expect(websitePreview).toMatch(/object-position:\s*center;/);
  expect(websitePreview).toMatch(/border-radius:\s*12px;/);
  expect(websitePreview).not.toMatch(/40vh|100%/);
  const websiteCard = rules.find(
    ([, selectors]) => selectors.trim() === '.blog-content .website-card',
  )?.[2];
  expect(websiteCard).toMatch(/flex-direction:\s*row;/);
  expect(websiteCard).toMatch(/align-items:\s*flex-start;/);
  expect(rule('.website-copy')).toMatch(/display:\s*flex;/);
  expect(rule('.website-copy')).toMatch(/flex:\s*1;/);
  expect(rule('.website-copy')).toMatch(/min-width:\s*0;/);
  expect(rule('.website-copy')).toMatch(/flex-direction:\s*column;/);
  expect(rule('.website-copy')).toMatch(/gap:\s*8px;/);
  expect(rule('.native-embed .embed-media-preview')).toMatch(
    /max-height:\s*40vh;/,
  );
  expect(rule('.native-embed .embed-avatar')).toMatch(/width:\s*48px;/);
  expect(rule('.native-embed .embed-avatar')).toMatch(/height:\s*48px;/);
  expect(rule('.website-card .embed-provider-icon')).toMatch(/width:\s*20px;/);
  expect(rule('.website-card .embed-provider-icon')).toMatch(/height:\s*20px;/);
  expect(rule('.embed-external-preview')).toMatch(/height:\s*200px;/);
  expect(rule('.embed-external-preview')).toMatch(/object-fit:\s*cover;/);
  const svgRules = rules.filter(([, selectors]) => /\bsvg\b/.test(selectors));
  expect(css).not.toContain('.emoji');
  expect(svgRules).toHaveLength(2);
  for (const [, selectors] of svgRules)
    expect(selectors.trim().split(',').at(-1)?.trim()).toBe(
      '.blog-content .drawing svg',
    );
});

test('homepage and article embeds share a translucent frame without sharing the homepage width cap', async () => {
  const base = await file(
    new URL('../components/post-card.css', import.meta.url),
  ).text();
  const post = await file(
    new URL('../components/Post.svelte', import.meta.url),
  ).text();
  const css = await file(
    new URL('../components/blog/content.css', import.meta.url),
  ).text();
  expect(base).toContain('.post-card {');
  expect(base).toContain('border: 1px solid var(--overlay)');
  expect(base).toContain('border-radius: 16px');
  expect(base).toContain('padding: 16px');
  expect(base).toContain('color-mix(in srgb, var(--surface) 80%, transparent)');
  expect(base).toContain('gap: 12px');
  expect(base).toContain('box-sizing: border-box');
  expect(base).not.toContain('max-width');
  expect(post).toContain("import './post-card.css'");
  expect(post).toContain('class="post post-card"');
  expect(post).toContain('max-width: 30rem');
  expect(post).not.toContain('color-mix(');
  const frame =
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
      ([, selectors]) =>
        selectors.includes('.native-embed,') &&
        selectors.includes('.website-card'),
    )?.[2] ?? '';
  expect(frame).toContain('width: 100%');
  expect(frame).toContain('max-width: none');
  expect(frame).toContain('min-width: 0');
  expect(frame).not.toContain('background');
  expect(css).toMatch(/\.embed-author-top\s*\{[^}]*flex-wrap:\s*wrap;/);
});

test('site and standalone articles share self-hosted emoji fonts without DOM conversion', async () => {
  const [css, layout, article, contentCss, manifest, credits, license] =
    await Promise.all(
      [
        '../../index.css',
        '../../routes/+layout.svelte',
        '../components/blog/Article.svelte',
        '../components/blog/content.css',
        '../../../package.json',
        '../../routes/attributions/+page.svelte',
        '../../../static/fonts/NotoColorEmoji/LICENSE.txt',
      ].map((path) => file(new URL(path, import.meta.url)).text()),
    );

  for (const [source, selector] of [
    [layout, 'main'],
    [article, '.native-article'],
    [contentCss, '.blog-content'],
  ]) {
    const rule = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
      ([, selectors]) => selectors.trim() === selector,
    )?.[2];
    expect(rule).toMatch(/font-family:\s*var\(--font-site\);/);
  }
  expect(contentCss).toMatch(
    /\.blog-content code\s*\{\s*font-family:\s*inherit;/,
  );
  expect(contentCss).toMatch(/\.blog-content button,[\s\S]*?font:\s*inherit;/);
  expect(css + layout + article + contentCss).not.toMatch(
    /twemoji|MutationObserver|parseEmoji|img\.emoji|img:not\(\.emoji\)/i,
  );
  expect(layout).not.toContain('onMount');
  expect(JSON.parse(manifest).dependencies).not.toHaveProperty(
    '@fontsource/noto-color-emoji',
  );
  expect(JSON.parse(manifest).dependencies).not.toHaveProperty('@twemoji/api');
  expect(credits).toContain('https://github.com/googlefonts/noto-emoji');
  expect(credits).toContain('/fonts/NotoColorEmoji/LICENSE.txt');

  expect(license).toContain('SIL OPEN FONT LICENSE Version 1.1');
});

test('SSR preserves emoji sequences as native Unicode in rich text, code and fallback', async () => {
  const { Content } = await import('../components/blog');
  const emoji = '🦋 ❤️ ☕️ 🏳️‍⚧️ 🇺🇸 👩🏽‍💻 1️⃣ ©️ ↔️';
  const plaintext = `Maple 0123456789 # * ${emoji} end`;
  const byteStart = new TextEncoder().encode('Maple 0123456789 # * ').length;
  const byteEnd = byteStart + new TextEncoder().encode(emoji).length;
  const rich = render(Content, {
    props: {
      content: content([
        {
          ...text(plaintext),
          facets: [
            {
              index: { byteStart, byteEnd },
              features: [{ $type: 'pub.leaflet.richtext.facet#bold' }],
            },
          ],
        },
        { $type: 'pub.leaflet.blocks.code', plaintext, language: 'text' },
      ]),
    },
  }).body.replace(/<!--[\s\S]*?-->/g, '');
  const fallback = render(Content, {
    props: { content: undefined, textContent: plaintext },
  }).body.replace(/<!--[\s\S]*?-->/g, '');
  expect(rich).toContain(`<strong>${emoji}</strong>`);
  expect(rich).toMatch(/<\/strong>\s+end/);
  expect(rich.match(/<code[^>]*>([\s\S]*?)<\/code>/)?.[1]).toBe(plaintext);
  expect(fallback).toContain(plaintext);
  expect(rich + fallback).not.toMatch(/<img|twemoji|class="emoji"/i);
});

test('SSR blockquotes keep direct rich text, native emoji and scoped footnotes without a panel', async () => {
  const { Content } = await import('../components/blog');
  const prefix = '<quoted> &  \n';
  const emoji = '👩🏽‍💻 🏳️‍⚧️';
  const byteStart = new TextEncoder().encode(prefix).length;
  const byteEnd = byteStart + new TextEncoder().encode(emoji).length;
  const quote = {
    $type: 'pub.leaflet.blocks.blockquote',
    plaintext: `${prefix}${emoji} end`,
    facets: [
      {
        index: { byteStart, byteEnd },
        features: [
          { $type: 'pub.leaflet.richtext.facet#bold' },
          { $type: 'pub.leaflet.richtext.facet#highlight' },
          {
            $type: 'pub.leaflet.richtext.facet#link',
            uri: 'https://example.com/quote',
          },
          {
            $type: 'pub.leaflet.richtext.facet#footnote',
            footnoteId: 'shared-quote-note',
            contentPlaintext: '<note> & 🦋',
          },
        ],
      },
    ],
  };
  const html = render(Content, {
    props: { content: content([quote, quote]) },
  }).body.replace(/<!--[\s\S]*?-->/g, '');
  const quotes = [
    ...html.matchAll(/<blockquote class="rich-text">([\s\S]*?)<\/blockquote>/g),
  ];
  expect(quotes).toHaveLength(2);
  expect(html).not.toContain('quote-content');
  for (const [index, [, body]] of quotes.entries()) {
    expect(body).toMatch(/^\s*&lt;quoted> &amp;  \n/);
    expect(body).toContain(
      `<a href="https://example.com/quote" rel="noopener noreferrer"><strong><mark>${emoji}</mark></strong></a>`,
    );
    expect(body).toContain(' end');
    const note = `footnote:article-block-${index + 1}:1`;
    expect(body).toContain(`id="${note}:ref" href="#${note}"`);
    expect(body).toContain(`id="${note}" class="footnote"`);
    expect(body).toContain(`href="#${note}:ref"`);
    expect(body).toContain('role="note" aria-label="Footnotes"');
    expect(body).toContain('&lt;note> &amp; 🦋');
    expect(body).not.toMatch(/<quoted>|<note>|<img|class="card/);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('blockquote styles use only a side pill with naturally wrapping text and no panel', async () => {
  const css = await file(
    new URL('../components/blog/content.css', import.meta.url),
  ).text();
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const rule = (selector: string) =>
    rules.find(([, selectors]) => selectors.trim() === selector)?.[2] ?? '';
  const shell = rule('.blog-content blockquote');
  expect(shell).toMatch(/position:\s*relative;/);
  expect(shell).toMatch(/padding-inline-start:\s*12px;/);
  expect(shell).not.toMatch(/display|grid|flex|gap|border-radius/);
  expect(shell).not.toMatch(/(?:^|[;\s])margin\s*:|margin-block/);
  expect(shell).toMatch(/min-width:\s*0;/);
  expect(shell).toMatch(/margin-inline:\s*0;/);
  expect(shell).toMatch(/padding:\s*0;/);
  expect(shell).toMatch(/border:\s*0;/);
  expect(shell).toMatch(/background:\s*transparent;/);
  const pill = rule('.blog-content blockquote::before');
  expect(pill).toMatch(/content:\s*'';/);
  expect(pill).toMatch(/position:\s*absolute;/);
  expect(pill).toMatch(/inset-block:\s*0;/);
  expect(pill).toMatch(/inset-inline-start:\s*0;/);
  expect(pill).toMatch(/inline-size:\s*4px;/);
  expect(pill).toMatch(/border-radius:\s*999px;/);
  expect(pill).toMatch(/background:\s*var\(--sapphire\);/);
  expect(css).not.toContain('quote-content');
  expect(shell + pill).not.toMatch(/border-left|border-inline-start/);
  expect(shell + pill).not.toMatch(/max-width|overflow|font-family/);
  expect(
    rule('.blog-content .rich-text,\n.blog-content .text-fallback'),
  ).toMatch(/white-space:\s*pre-wrap;/);
});

test('top-level page cards use full width and 10px gaps without separator lines or extra fill', async () => {
  const css = await file(
    new URL('../components/blog/content.css', import.meta.url),
  ).text();
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const contentRule =
    rules.find(([, selector]) => selector.trim() === '.blog-content')?.[2] ??
    '';
  expect(contentRule).toMatch(/display:\s*flex;/);
  expect(contentRule).toMatch(/flex-direction:\s*column;/);
  expect(contentRule).toMatch(/gap:\s*10px;/);
  expect(contentRule).toMatch(/background:\s*transparent;/);
  const pageRule =
    rules.find(
      ([, selector]) => selector.trim() === '.blog-content > .article-page',
    )?.[2] ?? '';
  expect(pageRule).toMatch(/width:\s*100%;/);
  expect(pageRule).toMatch(/max-width:\s*none;/);
  expect(pageRule).toMatch(/min-width:\s*0;/);
  expect(pageRule).not.toMatch(/background|padding|border|overflow|height/);
  expect(css).not.toMatch(/section\s*\+\s*section/);
});

test('SSR renders escaped article data, unique anchors, nested lists and independent Bluesky links', async () => {
  const { Article } = await import('../components/blog');
  const document = documentFixture({
    title: '<script>title</script>',
    content: content([
      { $type: 'pub.leaflet.blocks.header', plaintext: 'Hello' },
      { $type: 'pub.leaflet.blocks.header', plaintext: 'Hello' },
      {
        ...text('🦋<script>body</script>'),
        facets: [
          {
            index: { byteStart: 0, byteEnd: 4 },
            features: [
              { $type: 'pub.leaflet.richtext.facet#bold' },
              {
                $type: 'pub.leaflet.richtext.facet#link',
                uri: 'javascript:alert(1)',
              },
            ],
          },
        ],
      },
      {
        ...text('mention'),
        facets: [
          {
            index: { byteStart: 0, byteEnd: 7 },
            features: [
              {
                $type: 'pub.leaflet.richtext.facet#didMention',
                did: 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb',
              },
            ],
          },
        ],
      },
      {
        $type: 'pub.leaflet.blocks.orderedList',
        startIndex: 3,
        children: [
          {
            content: text('parent'),
            unorderedListChildren: {
              $type: 'pub.leaflet.blocks.unorderedList',
              children: [{ content: text('nested child') }],
            },
          },
        ],
      },
      {
        $type: 'pub.leaflet.blocks.bskyPost',
        postRef: {
          uri: 'at://did:plc:aaaaaaaaaaaaaaaaaaaaaaaa/app.bsky.feed.post/test',
          cid: `bafkrei${'a'.repeat(52)}`,
        },
      },
      {
        $type: 'pub.leaflet.blocks.iframe',
        html: '<script>embed</script>',
        url: 'https://example.com',
      },
      { $type: 'pub.leaflet.blocks.html', html: '<img src=x onerror=bad()>' },
    ]),
  });
  const publication = publicationFixture({ name: 'Native publication' });
  const html = render(Article, {
    props: { document, publication, rkey: 'test' },
  }).body.replace(/<!--[\s\S]*?-->/g, '');
  expect(html).toContain('&lt;script>title&lt;/script>');
  expect(html).toContain('<strong>🦋</strong>');
  expect(html).toContain('nested child');
  expect(html).toContain('start="3"');
  expect(html).toContain('id="article-hello"');
  expect(html).toContain('id="article-hello-2"');
  expect(html).toContain(
    'href="https://bsky.app/profile/did:plc:aaaaaaaaaaaaaaaaaaaaaaaa/post/test"',
  );
  expect(html).toContain(
    'href="https://bsky.app/profile/did:plc:bbbbbbbbbbbbbbbbbbbbbbbb"',
  );
  expect(html).not.toMatch(/<script|<iframe|onerror=|href="javascript:/);
});

test('plain-text article shell separates shared header/fallback cards and uses only local footer return navigation', async () => {
  const { Article } = await import('../components/blog');
  const document = documentFixture({
    description: 'Article description',
    site: 'https://publication.example',
    updatedAt: '2026-10-24T00:00:00.000Z',
    tags: ['layout'],
    textContent: 'Article body',
  });
  const publication = publicationFixture({
    name: 'Publication label',
    url: 'https://publication.example',
  });
  const html = render(Article, {
    props: { document, publication, rkey: 'local' },
  }).body.replace(/<!--[\s\S]*?-->/g, '');
  expect(html).toMatch(
    /<article class="native-article [^"]*" data-document-key="local">/,
  );
  expect(html).not.toContain('class="card native-article');
  const cards = [...html.matchAll(/class="card ([^"]+)"/g)];
  expect(cards).toHaveLength(2);
  expect(cards[0][1]).toMatch(/^article-header\b/);
  expect(cards[1][1]).toBe('article-page');
  expect(html).not.toContain('card article-body');
  expect(html).not.toContain('article-navigation');
  expect(html).not.toMatch(/<nav\b/);
  const header =
    html.match(
      /<header class="card article-header\b[^>]*>([\s\S]*?)<\/header>/,
    )?.[1] ?? '';
  const body =
    html.match(
      /<div class="card article-page"[^>]*>([\s\S]*?)<\/article>/,
    )?.[1] ?? '';
  expect(html).not.toContain(publication.name);
  for (const metadata of [
    'Native article',
    'Article description',
    'Published',
    'Updated',
    'datetime="2026-10-23T00:00:00.000Z"',
    'October 23, 2026',
    'datetime="2026-10-24T00:00:00.000Z"',
    'October 24, 2026',
    '#layout',
  ]) {
    expect(header).toContain(metadata);
    expect(body).not.toContain(metadata);
  }
  expect(body).toContain('Article body');
  expect(header).not.toContain('Article body');
  expect(html).not.toContain('reading-panel');
  const returnLinks = [
    ...html.matchAll(/<a\b[^>]*href="\/blog"[^>]*>([\s\S]*?)<\/a>/g),
  ];
  expect(returnLinks).toHaveLength(1);
  const footer = body.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? '';
  expect(footer.trim()).toBe(returnLinks[0][0]);
  expect(returnLinks[0][1]).toMatch(
    /^<svg\b[^>]*aria-hidden="true"[^>]*>[\s\S]*<\/svg>\s*Return to blog\s*$/,
  );
  expect(returnLinks[0][1]).toContain('lucide-chevron-left');
  expect(html).not.toMatch(/Back to blog/i);
  expect(
    [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]),
  ).toEqual(['/blog']);
  expect(html).not.toContain(publication.url);
  expect(html).not.toMatch(
    /original source|see the original|read original|mirror/i,
  );
});

test('two linear pages are sibling cards with stable links, one cover first and one footer last', async () => {
  const { Article, Content } = await import('../components/blog');
  const body = pagedContent(
    page(
      [
        text('First page text'),
        { $type: 'pub.leaflet.blocks.page', id: 'second' },
        { $type: 'pub.leaflet.blocks.page', id: 'missing' },
      ],
      { id: 'first' },
    ),
    page(
      [
        text('Second page text'),
        { $type: 'pub.leaflet.blocks.page', id: 'first' },
        page([text('Nested linear group')]),
      ],
      { id: 'second' },
    ),
  );
  const document = documentFixture({
    title: 'Two pages',
    content: body,
    textContent: 'Do not replace readable pages with this fallback',
    coverImage: {
      $type: 'blob',
      ref: {
        $link: 'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4',
      },
      mimeType: 'image/webp',
      size: 7030,
    },
  });
  const publication = publicationFixture();
  const article = render(Article, {
    props: { document, publication, rkey: 'two-pages' },
  }).body.replace(/<!--[\s\S]*?-->/g, '');
  const standalone = render(Content, {
    props: { content: body, textContent: document.textContent },
  }).body.replace(/<!--[\s\S]*?-->/g, '');
  for (const html of [article, standalone]) {
    const pages = [
      ...html.matchAll(
        /<section class="card article-page" id="([^"]+)" aria-label="([^"]+)">([\s\S]*?)<\/section>/g,
      ),
    ];
    expect(pages.map(([, id, label]) => [id, label])).toEqual([
      ['article-page-1', 'Article page 1'],
      ['article-page-2', 'Article page 2'],
    ]);
    expect(html).toMatch(/<\/section>\s*<section class="card article-page"/);
    expect(pages[0][3]).toContain('First page text');
    expect(pages[0][3]).toContain('href="#article-page-2"');
    expect(pages[0][3]).toContain(
      'Linked page is unavailable in this article.',
    );
    expect(pages[1][3]).toContain('Second page text');
    expect(pages[1][3]).toContain('href="#article-page-1"');
    expect(pages[1][3]).toContain('Nested linear group');
    expect(pages[1][3].indexOf('Second page text')).toBeLessThan(
      pages[1][3].indexOf('Nested linear group'),
    );
    expect(html).not.toContain(document.textContent!);
    expect(html).not.toContain('card article-body');
    if (html === article) {
      expect([...html.matchAll(/class="card /g)]).toHaveLength(3);
      expect([...html.matchAll(/<img\b[^>]*class="cover\b/g)]).toHaveLength(1);
      expect(pages[0][3]).toMatch(/class="cover\b/);
      expect(pages[0][3].indexOf('class="cover')).toBeLessThan(
        pages[0][3].indexOf('First page text'),
      );
      expect(pages[0][3]).not.toContain('<footer');
      expect(pages[1][3]).not.toMatch(/class="cover\b/);
      expect(pages[1][3]).toContain('<footer');
      expect([...html.matchAll(/href="\/blog"/g)]).toHaveLength(1);
      expect(pages[1][3].indexOf('Nested linear group')).toBeLessThan(
        pages[1][3].indexOf('<footer'),
      );
    } else {
      expect([...html.matchAll(/class="card /g)]).toHaveLength(2);
      expect(html).not.toMatch(/<footer|class="cover\b/);
    }
  }
});

test('single-page and unreadable articles retain exactly one body card and footer', async () => {
  const { Article } = await import('../components/blog');
  const publication = publicationFixture();
  for (const [body, expected] of [
    [content([text('Single readable page')]), 'Single readable page'],
    [null, 'No readable article content is available.'],
  ] as const) {
    const document = documentFixture({ title: 'Single card', content: body });
    const html = render(Article, {
      props: { document, publication, rkey: 'single' },
    }).body;
    expect([...html.matchAll(/class="card /g)]).toHaveLength(2);
    expect(html).not.toContain('card article-body');
    const card =
      html.match(
        /<(section|div) class="card article-page"[^>]*>([\s\S]*?)<\/\1>/,
      )?.[2] ?? '';
    expect(card).toContain(expected);
    expect(card).toContain('<footer');
    expect([...html.matchAll(/href="\/blog"/g)]).toHaveLength(1);
    if (body) expect(html).toContain('aria-label="Article body"');
  }
});

test('all SSR DOM IDs stay unique across adversarial heading slugs, pages and footnotes', async () => {
  const { Article } = await import('../components/blog');
  const note = () => ({
    ...text('note'),
    facets: [
      {
        index: { byteStart: 0, byteEnd: 4 },
        features: [
          {
            $type: 'pub.leaflet.richtext.facet#footnote',
            footnoteId: 'shared-note-id',
            contentPlaintext: 'Note text',
          },
        ],
      },
    ],
  });
  const heading = (plaintext: string) => ({
    $type: 'pub.leaflet.blocks.header',
    plaintext,
  });
  const body = content([
    note(),
    heading('block-1-note-1'),
    heading('block-1-note-1-ref'),
    heading('page-1'),
    heading('footnote:article-block-1:1'),
    heading('footnote:article-block-1:1:ref'),
    { ...note(), $type: 'pub.leaflet.blocks.header' },
    {
      $type: 'pub.leaflet.blocks.unorderedList',
      children: [{ content: note() }],
    },
  ]);
  body.pages.push(page([note(), heading('page-2')]));
  const document = documentFixture({
    title: 'Anchor regression',
    content: body,
  });
  const publication = publicationFixture();
  const html = render(Article, {
    props: { document, publication, rkey: 'anchors' },
  }).body;
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toContain('article-block-1-note-1');
  expect(ids).toContain('article-block-1-note-1-ref');
  expect(ids).toContain('article-page-1');
  expect(ids).toContain('article-page-2');
  expect(ids).toContain('footnote:article-block-1:1');
  expect(ids).toContain('footnote:article-block-1:1:ref');
  expect(ids.filter((id) => id.startsWith('footnote:'))).toHaveLength(8);
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g))
    expect(ids).toContain(target);
});

test('standalone page links reject inherited entries and unsafe URLs', async () => {
  const { PageLink } = await import('../components/blog');
  const cases: { pageId: string; pageLinks: Record<string, string> }[] = [
    { pageId: 'constructor', pageLinks: {} },
    { pageId: 'evil', pageLinks: { evil: 'javascript:alert(1)' } },
  ];
  for (const props of cases) {
    const html = render(PageLink, { props }).body;
    expect(html).not.toContain('<a');
  }
});

test('video SSR offers provider watch links and opt-in only, with no raw HTML or remote media', async () => {
  const { Content } = await import('../components/blog');
  for (const [url, provider, href] of [
    [
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXc',
      'YouTube',
      'https://www.youtube.com/watch?v=dQw4w9WgXc',
    ],
    [
      'https://player.vimeo.com/video/123?h=abc',
      'Vimeo',
      'https://vimeo.com/123?h=abc',
    ],
  ]) {
    const html = render(Content, {
      props: {
        content: content([{ $type: 'pub.leaflet.blocks.iframe', url }]),
      },
    }).body;
    expect(html).toContain('class="post-card native-embed video-embed"');
    expect(html).toContain(`${provider} video`);
    expect(html).toContain(`Watch on ${provider}`);
    expect(html).toContain(`href="${href}"`);
    expect(html).toContain('Load media from');
    expect(html).toContain('IP address');
    expect(html).toContain('provider storage');
    expect(html).not.toMatch(/<iframe|<script|<img|<link|autoplay|srcdoc/);
  }
  for (const value of [
    { url: 'https://example.com/video', href: 'https://example.com/video' },
    { url: 'javascript:alert(1)' },
    {
      url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXc',
      html: '<iframe src="https://evil.example"></iframe><script>alert(1)</script>',
    },
  ]) {
    const html = render(Content, {
      props: {
        content: content([{ $type: 'pub.leaflet.blocks.iframe', ...value }]),
      },
    }).body;
    expect(html).not.toMatch(/<iframe|<script|<button|Load media|Watch on/);
    if ('href' in value) expect(html).toContain(`href="${value.href}"`);
    else expect(html).not.toContain('<a ');
  }
});

test('video playback configuration preserves provider isolation and origin-only referrers', async () => {
  const source = await file(
    new URL('../components/blog/Iframe.svelte', import.meta.url),
  ).text();
  expect(source).toContain("import '../post-card.css'");
  expect(source).toContain('safeFrameUrl(value.url)');
  expect(source).toContain('{#if src && loadedUrl === src}');
  expect(source).toContain('title={`${provider} video player`}');
  expect(source).toContain(
    'sandbox="allow-scripts allow-same-origin allow-presentation"',
  );
  expect(source).toContain('referrerpolicy="strict-origin-when-cross-origin"');
  expect(source).toContain(
    'allow="encrypted-media; fullscreen; picture-in-picture"',
  );
  expect(source).toContain('$effect.pre(');
  expect(source).not.toMatch(
    /allow-(?:forms|popups|top-navigation|storage-access)|srcdoc|\{@html|autoplay|onload/,
  );
});

test('video-only geometry uses responsive YouTube and bounded authored Vimeo heights', async () => {
  const css = await file(
    new URL('../components/blog/content.css', import.meta.url),
  ).text();
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const playerRules = rules.filter(([, selectors]) =>
    selectors.includes('.video-player'),
  );
  expect(playerRules).toHaveLength(2);
  for (const [, selectors] of playerRules)
    expect(selectors.trim()).toStartWith(
      '.blog-content .video-embed .video-player',
    );
  expect(playerRules[0][2]).toContain('width: 100%');
  expect(playerRules[0][2]).toContain(
    'clamp(200px, var(--video-height, 360px), 80vh)',
  );
  expect(playerRules[0][2]).toContain('min-height: 200px');
  expect(playerRules[0][2]).toContain('border-radius: 12px');
  expect(playerRules[1][2]).toContain('aspect-ratio: 16 / 9');
  expect(playerRules[1][2]).toContain('height: auto');
});

test('canvas SSR preserves flow, nested-list descendants, page links and first/last snippets when truncated', async () => {
  const { Content } = await import('../components/blog');
  const before = createRawSnippet(() => ({
    render: () => '<div>Canvas before</div>',
  }));
  const after = createRawSnippet(() => ({
    render: () => '<footer>Linear after</footer>',
  }));
  let tooDeep: unknown = text('Beyond depth limit');
  for (let i = 0; i <= MAX_DEPTH; i++) tooDeep = page([tooDeep]);
  const html = render(Content, {
    props: {
      content: pagedContent(
        {
          $type: 'pub.leaflet.pages.canvas',
          id: 'canvas',
          blocks: [
            {
              x: 900,
              y: 900,
              block: page([
                {
                  $type: 'pub.leaflet.blocks.unorderedList',
                  children: [
                    {
                      content: { $type: 'pub.leaflet.blocks.future' },
                      children: [
                        { content: text('Readable nested canvas text') },
                      ],
                    },
                  ],
                },
                { $type: 'pub.leaflet.blocks.page', id: 'linear' },
              ]),
            },
          ],
        },
        page([tooDeep], { id: 'linear' }),
      ),
      textContent: 'Do not hide nested canvas text',
      before,
      after,
    },
  }).body.replace(/<!--[\s\S]*?-->/g, '');
  const pages = [
    ...html.matchAll(
      /<section class="card article-page" id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g,
    ),
  ];
  expect(pages.map(([, id]) => id)).toEqual([
    'article-page-1',
    'article-page-2',
  ]);
  expect(pages[0][2]).toContain('Canvas before');
  expect(pages[0][2]).toContain(
    'Canvas content is presented in document order',
  );
  expect(pages[0][2]).toContain('Readable nested canvas text');
  expect(pages[0][2]).toContain('href="#article-page-2"');
  expect(pages[0][2].indexOf('Canvas before')).toBeLessThan(
    pages[0][2].indexOf('Readable nested canvas text'),
  );
  expect(pages[0][2].indexOf('Readable nested canvas text')).toBeLessThan(
    pages[0][2].indexOf('href="#article-page-2"'),
  );
  expect(pages[0][2]).not.toContain('Linear after');
  expect(pages[1][2]).toContain('Content nesting or size limit reached');
  expect(pages[1][2]).toContain('Linear after');
  expect(pages[1][2]).not.toContain('Canvas before');
  expect(html).toContain(
    'Some content could not be displayed because it exceeded',
  );
  expect(html.indexOf('Linear after')).toBeLessThan(
    html.indexOf('Some content could not be displayed'),
  );
  expect(html).not.toContain('Beyond depth limit');
  expect(html).not.toContain('Do not hide nested canvas text');
  expect([...html.matchAll(/Canvas before/g)]).toHaveLength(1);
  expect([...html.matchAll(/Linear after/g)]).toHaveLength(1);
});

test('Content SSR dispatches highlighted code, safe math, escaped TeX and validated gallery media', async () => {
  const { Content } = await import('../components/blog');
  const image = (mimeType: string) => ({
    $type: 'blob',
    ref: { $link: `bafkrei${'a'.repeat(52)}` },
    mimeType,
    size: 100,
  });
  const media = (mimeType: string, alt: string) => ({
    image: image(mimeType),
    aspectRatio: { width: 16, height: 9 },
    alt,
  });
  const html = render(Content, {
    props: {
      content: content([
        {
          $type: 'pub.leaflet.blocks.code',
          plaintext: 'const answer = 42;',
          language: 'js',
        },
        { $type: 'pub.leaflet.blocks.math', tex: 'x^2' },
        { $type: 'pub.leaflet.blocks.math', tex: '\\unknowncommand<script>&' },
        {
          $type: 'pub.leaflet.blocks.image',
          ...media('image/png', 'Standalone <image>'),
          width: 5000,
        },
        {
          $type: 'pub.leaflet.blocks.imageGallery',
          images: [
            media('image/webp', 'Gallery image'),
            media('image/svg+xml', 'Rejected <SVG>'),
          ],
        },
      ]),
    },
  }).body.replace(/<!--[\s\S]*?-->/g, '');
  expect(html).toContain('class="code-token"');
  expect(html).toContain('aria-label="js code"');
  expect([...html.matchAll(/<math\b/g)]).toHaveLength(1);
  expect(html).toContain('Equation shown as TeX (could not render safely).');
  expect(html).toContain('\\unknowncommand&lt;script>&amp;');
  expect(html).toContain('aria-label="Image gallery"');
  const images = [...html.matchAll(/<img\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/g)].map(
    ([tag]) => tag,
  );
  expect(images).toHaveLength(2);
  for (const tag of images) {
    expect(tag).toContain('src="/api/atproto/blob?cid=');
    expect(tag).toContain(
      'width="16" height="9" loading="lazy" decoding="async"',
    );
  }
  expect(html).toContain('max-width: 4096px');
  expect(html).toContain('Standalone &lt;image>');
  expect(html).toContain('Image unavailable: Rejected &lt;SVG>.');
  expect(html).not.toMatch(/<script\b|<iframe\b|mimetype=image%2Fsvg/);
});

test('SSR escaped plain-text fallback and media opt-in work without browser-only APIs', async () => {
  const { Content } = await import('../components/blog');
  const before = createRawSnippet(() => ({
    render: () => '<div>Before body</div>',
  }));
  const after = createRawSnippet(() => ({
    render: () => '<footer>After body</footer>',
  }));
  for (const textContent of ['<b>literal</b>', undefined]) {
    const fallback = render(Content, {
      props: { content: null, textContent, before, after },
    }).body.replace(/<!--[\s\S]*?-->/g, '');
    expect([...fallback.matchAll(/class="card article-page"/g)]).toHaveLength(
      1,
    );
    expect(fallback).toMatch(
      /<div class="card article-page"><div>Before body<\/div>[\s\S]*<footer>After body<\/footer><\/div>/,
    );
    expect(fallback).toContain(
      textContent
        ? '&lt;b>literal&lt;/b>'
        : 'No readable article content is available.',
    );
    expect([...fallback.matchAll(/Before body/g)]).toHaveLength(1);
    expect([...fallback.matchAll(/After body/g)]).toHaveLength(1);
  }
  const html = render(Content, {
    props: {
      content: content([
        {
          $type: 'pub.leaflet.blocks.iframe',
          url: 'https://www.youtube-nocookie.com/embed/test',
        },
      ]),
    },
  }).body;
  expect(html).toContain('Load media');
  expect(html).not.toContain('<iframe');
});
