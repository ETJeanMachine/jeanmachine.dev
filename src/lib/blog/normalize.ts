import * as L from '@atcute/leaflet';
import { is } from '@atcute/lexicons';
import type { InferInput } from '@atcute/lexicons/validations';
import { cleanFacets } from './richtext';

const schemas = {
  text: L.PubLeafletBlocksText.mainSchema,
  header: L.PubLeafletBlocksHeader.mainSchema,
  blockquote: L.PubLeafletBlocksBlockquote.mainSchema,
  image: L.PubLeafletBlocksImage.mainSchema,
  imageGallery: L.PubLeafletBlocksImageGallery.mainSchema,
  code: L.PubLeafletBlocksCode.mainSchema,
  horizontalRule: L.PubLeafletBlocksHorizontalRule.mainSchema,
  website: L.PubLeafletBlocksWebsite.mainSchema,
  math: L.PubLeafletBlocksMath.mainSchema,
  bskyPost: L.PubLeafletBlocksBskyPost.mainSchema,
  button: L.PubLeafletBlocksButton.mainSchema,
  iframe: L.PubLeafletBlocksIframe.mainSchema,
  html: L.PubLeafletBlocksHtml.mainSchema,
  drawing: L.PubLeafletBlocksDrawing.mainSchema,
  page: L.PubLeafletBlocksPage.mainSchema,
  embeddedCanvas: L.PubLeafletBlocksEmbeddedCanvas.mainSchema,
  standardSitePost: L.PubLeafletBlocksStandardSitePost.mainSchema,
  standardSitePublication: L.PubLeafletBlocksStandardSitePublication.mainSchema,
  poll: L.PubLeafletBlocksPoll.mainSchema,
  postHeader: L.PubLeafletBlocksPostHeader.mainSchema,
  postsList: L.PubLeafletBlocksPostsList.mainSchema,
  questions: L.PubLeafletBlocksQuestions.mainSchema,
  recommendedPubs: L.PubLeafletBlocksRecommendedPubs.mainSchema,
  reply: L.PubLeafletBlocksReply.mainSchema,
  signup: L.PubLeafletBlocksSignup.mainSchema,
  membersOnlyDelimiter: L.PubLeafletBlocksMembersOnlyDelimiter.mainSchema,
};
export type KnownKind = keyof typeof schemas;
export type KnownBlock = {
  [K in KnownKind]: {
    kind: K;
    value: InferInput<(typeof schemas)[K]>;
    id: string;
  };
}[KnownKind];
export interface ListItem {
  block: Block;
  checked?: boolean;
  nested?: ListBlock;
}
export interface ListBlock {
  kind: 'list';
  id: string;
  ordered: boolean;
  start: number;
  items: ListItem[];
}
export type Block =
  | KnownBlock
  | ListBlock
  | { kind: 'group'; id: string; blocks: Block[] }
  | { kind: 'unsupported'; id: string; label: string };
export interface Page {
  id: string;
  sourceId?: string;
  canvas: boolean;
  blocks: Block[];
}
export interface ArticleContent {
  pages: Page[];
  pageLinks: Record<string, string>;
  fallback: string | null;
  truncated: boolean;
}
export const MAX_DEPTH = 16;
export const MAX_BLOCKS = 4000;
const MAX_TEXT = 200_000;
const blockPrefix = 'pub.leaflet.blocks.';
const linearType = 'pub.leaflet.pages.linearDocument';
const canvasType = 'pub.leaflet.pages.canvas';
export function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** A per-article allocator: deterministic on SSR/navigation, unique even for colliding slugs. */
export function anchorAllocator() {
  const used = new Set<string>();
  return (text: string) => {
    const base = `article-${
      text
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_-]+/gu, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100) || 'section'
    }`;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  };
}

/** Never validate a whole article union: a malformed/future child must not hide its siblings. */
export function normalizeContent(
  content: unknown,
  textContent?: string,
): ArticleContent {
  const allocate = anchorAllocator();
  let count = 0;
  let truncated = false;
  const pageLinks: Record<string, string> = Object.create(null);
  const unsupported = (id: string, label: string): Block => ({
    kind: 'unsupported',
    id,
    label,
  });
  function block(input: unknown, depth: number): Block {
    const id = allocate(`block-${++count}`);
    if (depth > MAX_DEPTH || count > MAX_BLOCKS) {
      truncated = true;
      return unsupported(id, 'Content nesting or size limit reached');
    }
    const raw = object(input);
    if (!raw || typeof raw.$type !== 'string')
      return unsupported(id, 'Invalid block');
    if (raw.$type === linearType)
      return { kind: 'group', id, blocks: blocks(raw.blocks, depth + 1) };
    const kind = raw.$type.startsWith(blockPrefix)
      ? raw.$type.slice(blockPrefix.length)
      : '';
    if (kind === 'orderedList' || kind === 'unorderedList') {
      const ordered = kind === 'orderedList';
      const shell = { ...raw, children: [] };
      if (
        !is(
          ordered
            ? L.PubLeafletBlocksOrderedList.mainSchema
            : L.PubLeafletBlocksUnorderedList.mainSchema,
          shell,
        ) ||
        !Array.isArray(raw.children)
      )
        return unsupported(id, 'Invalid list');
      const items: ListItem[] = [];
      for (const child of raw.children.slice(0, MAX_BLOCKS)) {
        if (count >= MAX_BLOCKS) {
          truncated = true;
          break;
        }
        const item = object(child);
        if (!item) continue;
        const childBlock = block(item.content, depth + 1);
        let nested: ListBlock | undefined;
        const nestedRaw = Array.isArray(item.children)
          ? { $type: raw.$type, children: item.children }
          : item[ordered ? 'unorderedListChildren' : 'orderedListChildren'];
        if (nestedRaw) {
          const normalized = block(nestedRaw, depth + 1);
          if (normalized.kind === 'list') nested = normalized;
        }
        items.push({
          block: childBlock,
          checked: typeof item.checked === 'boolean' ? item.checked : undefined,
          nested,
        });
      }
      if (raw.children.length > MAX_BLOCKS) truncated = true;
      return {
        kind: 'list',
        id,
        ordered,
        start: typeof raw.startIndex === 'number' ? raw.startIndex : 1,
        items,
      };
    }
    if (!Object.hasOwn(schemas, kind))
      return unsupported(id, `Unsupported block: ${kind || raw.$type}`);
    const known = kind as KnownKind;
    let candidate = raw;
    if (kind === 'text' || kind === 'header' || kind === 'blockquote') {
      candidate = { ...raw, facets: cleanFacets(raw.facets) };
    }
    if (
      typeof candidate.plaintext === 'string' &&
      candidate.plaintext.length > MAX_TEXT
    ) {
      truncated = true;
      candidate = {
        ...candidate,
        plaintext: candidate.plaintext.slice(0, MAX_TEXT),
        facets: [],
      };
    }
    if (kind === 'drawing') {
      // Bound the amount of SVG geometry, independently of the surrounding block budget.
      const limit = (values: unknown) =>
        Array.isArray(values)
          ? values.slice(0, 250).map((value) => {
              const shape = object(value);
              return shape && Array.isArray(shape.points)
                ? { ...shape, points: shape.points.slice(0, 12_000) }
                : value;
            })
          : values;
      candidate = {
        ...candidate,
        strokes: limit(candidate.strokes),
        fills: limit(candidate.fills),
      };
    }
    if (kind === 'imageGallery' && Array.isArray(candidate.images))
      candidate = { ...candidate, images: candidate.images.slice(0, 100) };
    if (!is(schemas[known], candidate))
      return unsupported(id, `Invalid ${kind} block`);
    const headingId =
      kind === 'header' &&
      'plaintext' in candidate &&
      typeof candidate.plaintext === 'string'
        ? allocate(candidate.plaintext)
        : id;
    // The discriminator selects exactly the schema checked above.
    return { kind: known, value: candidate, id: headingId } as KnownBlock;
  }
  function blocks(input: unknown, depth: number): Block[] {
    if (!Array.isArray(input)) return [];
    const output: Block[] = [];
    for (const entry of input) {
      if (count >= MAX_BLOCKS) {
        truncated = true;
        break;
      }
      const wrapper = object(entry);
      output.push(block(wrapper?.block, depth));
    }
    return output;
  }
  const raw = object(content);
  const pages: Page[] = [];
  if (raw?.$type === 'pub.leaflet.content' && Array.isArray(raw.pages)) {
    for (const value of raw.pages.slice(0, 100)) {
      const page = object(value);
      if (!page || ![linearType, canvasType].includes(String(page.$type)))
        continue;
      const schema =
        page.$type === canvasType
          ? L.PubLeafletPagesCanvas.mainSchema
          : L.PubLeafletPagesLinearDocument.mainSchema;
      // Themes and geometry aren't part of the reader's presentation. Blocks are checked separately.
      if (!is(schema, { $type: page.$type, id: page.id, blocks: [] })) continue;
      const id = allocate(`page-${pages.length + 1}`);
      const sourceId = typeof page.id === 'string' ? page.id : undefined;
      if (sourceId && !Object.hasOwn(pageLinks, sourceId))
        pageLinks[sourceId] = `#${id}`;
      pages.push({
        id,
        sourceId,
        canvas: page.$type === canvasType,
        blocks: blocks(page.blocks, 0),
      });
    }
    if (raw.pages.length > 100) truncated = true;
  }
  function meaningful(block: Block): boolean {
    if (block.kind === 'unsupported') return false;
    if (block.kind === 'group') return block.blocks.some(meaningful);
    if (block.kind === 'list')
      return block.items.some(
        (item) =>
          meaningful(item.block) || (item.nested && meaningful(item.nested)),
      );
    return !['postHeader', 'html'].includes(block.kind);
  }
  return {
    pages,
    pageLinks,
    fallback:
      !pages.some((page) => page.blocks.some(meaningful)) && textContent
        ? textContent
        : null,
    truncated,
  };
}
