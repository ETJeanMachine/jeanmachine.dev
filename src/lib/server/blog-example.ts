import type * as L from '@atcute/leaflet';
import type {
  SiteStandardDocument,
  SiteStandardPublication,
} from '@atcute/standard-site';
import { DID, NAME, PUB_RKEY, TITLE } from '../constants';
import type { BlogArticle } from './blog';

// Edit this local fixture, then open /blog/example with `bun run dev`.
// The article and page content are local. Referenced public post/article previews
// load progressively after client mount through same-origin APIs. Image examples
// use the real public publication icon through the existing PDS blob proxy.
const publicationUri =
  `at://${DID}/site.standard.publication/${PUB_RKEY}` as const;
const documentUri = `at://${DID}/site.standard.document/3m4omt5rj5c2i` as const;
const postRef = {
  uri: `at://${DID}/app.bsky.feed.post/3m4omtcysns2i` as const,
  cid: 'bafyreifqys7n5wgzvhy56kjiyf4b7j7akcyfin3rzvygzbdiveobfapldm' as const,
};
const icon = {
  $type: 'blob',
  ref: { $link: 'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4' },
  mimeType: 'image/webp',
  size: 7030,
} as const;
const aspectRatio = { width: 1, height: 1 };
const encoder = new TextEncoder();

type Feature = L.PubLeafletRichtextFacet.Main['features'][number];

/** Authored substrings keep facets correct when emoji or accented text changes. */
function facet(
  plaintext: string,
  selection: string,
  ...features: Feature[]
): L.PubLeafletRichtextFacet.Main {
  const start = plaintext.indexOf(selection);
  if (start < 0 || !selection)
    throw new Error(`Missing facet text: ${selection}`);
  return {
    index: {
      byteStart: encoder.encode(plaintext.slice(0, start)).length,
      byteEnd: encoder.encode(plaintext.slice(0, start + selection.length))
        .length,
    },
    features,
  };
}

type TextBlock = L.PubLeafletBlocksText.Main & {
  $type: 'pub.leaflet.blocks.text';
};
type HeaderBlock = L.PubLeafletBlocksHeader.Main & {
  $type: 'pub.leaflet.blocks.header';
};
const text = (plaintext: string): TextBlock => ({
  $type: 'pub.leaflet.blocks.text',
  plaintext,
});
const heading = (plaintext: string, level = 2): HeaderBlock => ({
  $type: 'pub.leaflet.blocks.header',
  plaintext,
  level,
});
const blocks = (values: L.PubLeafletPagesLinearDocument.Block['block'][]) =>
  values.map((block) => ({ block }));
const marksText =
  '🦋 café — bold, italic, code, underline, strikethrough, highlight; bold italic overlap; a safe link, AT mention, DID mention, and a footnote.';
const marks: TextBlock = {
  ...text(marksText),
  facets: [
    facet(marksText, '🦋 café', { $type: 'pub.leaflet.richtext.facet#bold' }),
    facet(marksText, 'café', { $type: 'pub.leaflet.richtext.facet#italic' }),
    ...(
      [
        'bold',
        'italic',
        'code',
        'underline',
        'strikethrough',
        'highlight',
      ] as const
    ).map((mark) =>
      facet(marksText, mark, { $type: `pub.leaflet.richtext.facet#${mark}` }),
    ),
    facet(marksText, 'bold italic overlap', {
      $type: 'pub.leaflet.richtext.facet#bold',
    }),
    facet(marksText, 'italic overlap', {
      $type: 'pub.leaflet.richtext.facet#italic',
    }),
    facet(marksText, 'overlap', {
      $type: 'pub.leaflet.richtext.facet#highlight',
    }),
    facet(marksText, 'safe link', {
      $type: 'pub.leaflet.richtext.facet#link',
      uri: 'https://jeanmachine.dev',
    }),
    facet(marksText, 'AT mention', {
      $type: 'pub.leaflet.richtext.facet#atMention',
      atURI: publicationUri,
      href: 'https://jeanmachine.dev/blog',
    }),
    facet(marksText, 'DID mention', {
      $type: 'pub.leaflet.richtext.facet#didMention',
      did: DID,
    }),
    facet(marksText, 'footnote', {
      $type: 'pub.leaflet.richtext.facet#footnote',
      footnoteId: 'example-note',
      contentPlaintext:
        'A local footnote: café 🦋. Literal <HTML> stays escaped.',
    }),
  ],
};

// Open unions intentionally allow unknown future extensions. This is the only
// unrecognized block; the surrounding known examples must all validate.
const futureBlock = Object.assign(text(''), {
  $type: 'pub.leaflet.blocks.futureExample',
});

export const exampleContent: L.PubLeafletContent.Main = {
  $type: 'pub.leaflet.content',
  pages: [
    {
      $type: 'pub.leaflet.pages.linearDocument',
      id: 'examples',
      blocks: blocks([
        heading('Leaflet component examples', 1),
        text(
          'Development only. This deterministic article is local, not a published PDS record. Edit src/lib/server/blog-example.ts to try rendering changes.',
        ),
        heading('Text, Unicode, overlapping marks and footnotes'),
        marks,
        text(
          'Plain text is not Markdown: **stars** and <strong>HTML</strong> remain literal. A decomposed accent: café; an emoji sequence: 👩🏽‍💻.',
        ),
        heading('Heading levels and duplicate anchors'),
        heading('Duplicate heading', 3),
        text(
          'The next heading has the same text but must receive a different anchor.',
        ),
        heading('Duplicate heading', 3),
        heading('Fourth-level heading', 4),
        heading('Fifth-level heading', 5),
        heading('Sixth-level heading', 6),
        {
          $type: 'pub.leaflet.blocks.blockquote',
          plaintext:
            'A blockquote uses native site styling, not a publication theme.',
        },
        heading('Nested ordered, unordered and checklist items'),
        {
          $type: 'pub.leaflet.blocks.orderedList',
          startIndex: 3,
          children: [
            {
              content: text('Ordered item starting at three'),
              unorderedListChildren: {
                $type: 'pub.leaflet.blocks.unorderedList',
                children: [
                  {
                    content: text('Nested unordered item'),
                    orderedListChildren: {
                      $type: 'pub.leaflet.blocks.orderedList',
                      children: [
                        { content: text('Ordered again, one level deeper') },
                      ],
                    },
                  },
                ],
              },
            },
            { content: text('Completed checklist item'), checked: true },
            { content: text('Pending checklist item'), checked: false },
          ],
        },
        {
          $type: 'pub.leaflet.blocks.unorderedList',
          children: [
            {
              content: text('Unordered parent'),
              children: [
                { content: text('Same-type nested child'), checked: false },
              ],
            },
          ],
        },
        heading('Code overflow and horizontal rule'),
        {
          $type: 'pub.leaflet.blocks.code',
          language: 'typescript',
          plaintext: `const escaped = '<script>not executable</script>';\nconst deliberatelyLongLine = '${'horizontal-overflow-'.repeat(16)}';\nconsole.log(escaped, deliberatelyLongLine);`,
        },
        { $type: 'pub.leaflet.blocks.horizontalRule' },
        heading('Image and gallery — real public PDS blob'),
        text(
          'These examples reuse the real publication icon. Images request /api/atproto/blob when displayed; the local article and page content need no PDS fetch. Repetition in the gallery is intentional.',
        ),
        {
          $type: 'pub.leaflet.blocks.image',
          image: icon,
          aspectRatio,
          width: 160,
          alt: 'Public publication icon, single-image example',
        },
        {
          $type: 'pub.leaflet.blocks.imageGallery',
          images: [
            {
              image: icon,
              aspectRatio,
              alt: 'Publication icon, gallery item one',
            },
            {
              image: icon,
              aspectRatio,
              alt: 'Publication icon, gallery item two',
            },
          ],
        },
        heading('Website previews and native blog button'),
        text(
          'These website cards use real homepage text supplied in Leaflet fields, not an arbitrary URL scraper. Only the primary-site card uses the owner’s public publication icon; Standard.site has no preview image here.',
        ),
        {
          $type: 'pub.leaflet.blocks.website',
          src: 'https://jeanmachine.dev',
          title: NAME,
          description: TITLE,
          previewImage: icon,
        },
        {
          $type: 'pub.leaflet.blocks.website',
          src: 'https://standard.site',
          title: 'One schema. Every platform.',
          description:
            'Standard.site provides shared lexicons for long-form publishing on AT Protocol.',
        },
        {
          $type: 'pub.leaflet.blocks.button',
          text: 'Back to the blog',
          url: 'https://jeanmachine.dev/blog',
        },
        heading('KaTeX math'),
        {
          $type: 'pub.leaflet.blocks.math',
          tex: String.raw`\int_0^1 x^2\,dx = \frac{1}{3} \qquad e^{i\pi}+1=0`,
        },
        heading('Drawing — native SVG adaptation'),
        {
          $type: 'pub.leaflet.blocks.drawing',
          viewBox: { x: 0, y: 0, width: 240, height: 120 },
          fills: [{ color: 'tertiary', points: [20, 100, 120, 20, 220, 100] }],
          strokes: [
            {
              color: 'accent',
              size: 3,
              points: [20, 100, 500, 120, 20, 900, 220, 100, 500],
            },
          ],
        },
        heading('Page and embedded canvas links'),
        text(
          'These links jump to included pages. Canvas geometry is intentionally adapted to accessible reading order.',
        ),
        { $type: 'pub.leaflet.blocks.page', id: 'second-page' },
        {
          $type: 'pub.leaflet.blocks.embeddedCanvas',
          id: 'example-canvas',
          alt: 'Jump to the example canvas',
        },
        heading('Live public Bluesky and Standard Site previews'),
        text(
          'This article is local, but these real public references load metadata progressively after client mount through same-origin APIs. Bluesky shows the referenced author, post text and date, not an assumed publication author. Owned Standard Site records show their title and description with native /blog links. SSR starts with safe links; unavailable previews and foreign records retain link fallbacks.',
        ),
        { $type: 'pub.leaflet.blocks.bskyPost', postRef },
        { $type: 'pub.leaflet.blocks.standardSitePost', uri: documentUri },
        {
          $type: 'pub.leaflet.blocks.standardSitePublication',
          uri: publicationUri,
        },
        heading('Click-to-load video — Rick Astley: Never Gonna Give You Up'),
        text(
          'Rick Astley — Never Gonna Give You Up (official video). YouTube is never contacted until you explicitly load or open the video. Loading shares your IP address and this site’s origin (not the article path or query) with the provider and permits player storage.',
        ),
        {
          $type: 'pub.leaflet.blocks.iframe',
          url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXc',
          height: 360,
        },
        heading('Deliberately unsupported widgets and raw HTML'),
        text(
          'The following valid widget blocks show native fallback notices. A postHeader is intentionally omitted by the renderer because Article supplies its own header. The poll card reuses the public post reference to exercise link-only rendering; poll interaction is unavailable and it is not a live poll.',
        ),
        { $type: 'pub.leaflet.blocks.postHeader' },
        { $type: 'pub.leaflet.blocks.postsList' },
        { $type: 'pub.leaflet.blocks.questions' },
        { $type: 'pub.leaflet.blocks.recommendedPubs' },
        {
          $type: 'pub.leaflet.blocks.reply',
          promptText: 'Example reply widget — interaction unavailable',
        },
        { $type: 'pub.leaflet.blocks.signup' },
        { $type: 'pub.leaflet.blocks.membersOnlyDelimiter', audience: 'paid' },
        { $type: 'pub.leaflet.blocks.poll', pollRef: postRef },
        {
          $type: 'pub.leaflet.blocks.html',
          html: '<strong>Deliberately not injected</strong>',
        },
        heading('Deliberate future-block fallback'),
        text(
          'Only the next block is intentionally unknown. It must show an unsupported-block notice without hiding its siblings.',
        ),
        futureBlock,
        text('Valid text after the future block is still visible.'),
      ]),
    },
    {
      $type: 'pub.leaflet.pages.linearDocument',
      id: 'second-page',
      blocks: blocks([
        heading('Second linear page'),
        text('The page link above targets this section.'),
        { $type: 'pub.leaflet.blocks.page', id: 'examples' },
      ]),
    },
    {
      $type: 'pub.leaflet.pages.canvas',
      id: 'example-canvas',
      blocks: [
        {
          x: 20,
          y: 20,
          width: 400,
          block: heading('Canvas page in reading order'),
        },
        {
          x: 60,
          y: 120,
          width: 400,
          block: {
            $type: 'pub.leaflet.pages.linearDocument',
            blocks: blocks([
              heading('Nested linear group', 3),
              text(
                'This linear group is nested inside a canvas page; it stays in record order.',
              ),
              { $type: 'pub.leaflet.blocks.page', id: 'examples' },
            ]),
          },
        },
      ],
    },
  ],
};

const publication: SiteStandardPublication.Main = {
  $type: 'site.standard.publication',
  name: `${NAME} — development examples`,
  url: 'https://jeanmachine.dev',
};
const document: SiteStandardDocument.Main = {
  $type: 'site.standard.document',
  site: publicationUri,
  title: 'Example post — development only',
  description:
    'Local rendering examples for Leaflet blocks, rich text, media and fallback notices.',
  publishedAt: '2026-01-01T00:00:00.000Z',
  textContent: 'Development-only Leaflet component examples.',
};
// site.standard.document's open content union has no registered formats in TS.
Object.assign(document, { content: exampleContent });

export const exampleArticle: BlogArticle = {
  document,
  publication,
  rkey: 'example',
};
