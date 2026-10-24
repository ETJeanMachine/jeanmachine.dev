import { error, isHttpError } from '@sveltejs/kit';
import { PubLeafletContent } from '@atcute/leaflet';
import { is } from '@atcute/lexicons';
import { isCid, isTid } from '@atcute/lexicons/syntax';
import {
  SiteStandardDocument,
  SiteStandardPublication,
} from '@atcute/standard-site';
import { DID, PDS_URL, PUB_RKEY } from '../constants';

const PUBLICATION_URI = `at://${DID}/site.standard.publication/${PUB_RKEY}`;
const RECORD_LIMIT = 1_000_000;
const BLOB_LIMIT = 5_000_000;
const REQUEST_TIMEOUT_MS = 8_000;

export interface BlogArticle {
  document: SiteStandardDocument.Main;
  publication: SiteStandardPublication.Main;
  rkey: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(text: string, label: string): unknown {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    error(502, `Malformed JSON in upstream ${label}`);
  }

  // Bound traversal/serialization as well as byte size, including unknown formats.
  const pending = [{ value, depth: 0 }];
  let nodes = 1;
  while (pending.length) {
    const entry = pending.pop()!;
    if (entry.depth > 64) {
      error(502, `Upstream ${label} exceeds JSON complexity limits`);
    }
    if (entry.value !== null && typeof entry.value === 'object') {
      for (const child of Object.values(entry.value)) {
        if (++nodes > 100_000) {
          error(502, `Upstream ${label} exceeds JSON complexity limits`);
        }
        pending.push({ value: child, depth: entry.depth + 1 });
      }
    }
  }
  return value;
}

async function readText(
  response: Response,
  limit: number,
  label: string,
  signal: AbortSignal,
) {
  const length = Number(response.headers.get('content-length'));
  if (length > limit) {
    await response.body?.cancel();
    error(502, `Upstream ${label} exceeds the response size limit`);
  }
  if (!response.body) error(502, `Empty upstream ${label} response`);

  const reader = response.body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const decode = (chunk?: Uint8Array, stream = false) => {
    try {
      return decoder.decode(chunk, { stream });
    } catch {
      error(502, `Malformed UTF-8 in upstream ${label}`);
    }
  };
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        error(502, `Upstream ${label} exceeds the response size limit`);
      }
      text += decode(value, true);
    }
    return text + decode();
  } finally {
    signal.removeEventListener('abort', cancel);
    // Cancel on early failure too; do not leave an oversized body downloading.
    cancel();
    reader.releaseLock();
  }
}

async function fetchJson(
  fetcher: typeof fetch,
  method: string,
  params: Record<string, string>,
  label: string,
  limit: number,
  record = false,
): Promise<unknown> {
  const url = new URL(`/xrpc/${method}`, PDS_URL);
  url.search = new URLSearchParams(params).toString();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const request = async () => {
    const response = await fetcher(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'error',
    });
    if (controller.signal.aborted) {
      void response.body?.cancel().catch(() => {});
      error(502, `Upstream ${label} timed out`);
    }
    if (!response.ok && !(record && response.status === 400)) {
      void response.body?.cancel().catch(() => {});
      if (record && response.status === 404) error(404, `${label} not found`);
      error(502, `Upstream ${label} request failed (HTTP ${response.status})`);
    }

    const text = await readText(response, limit, label, controller.signal);
    const json = parseJson(text, label);
    if (!response.ok) {
      if (isObject(json) && json.error === 'RecordNotFound') {
        error(404, `${label} not found`);
      }
      error(502, `Upstream ${label} request failed (HTTP ${response.status})`);
    }
    return json;
  };

  try {
    return await Promise.race([
      request(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Upstream request timed out'));
        }, REQUEST_TIMEOUT_MS);
      }),
    ]);
  } catch (cause) {
    if (isHttpError(cause)) throw cause;
    if (controller.signal.aborted) error(502, `Upstream ${label} timed out`);

    error(502, `Unable to read upstream ${label}`);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRecord(
  fetcher: typeof fetch,
  collection: string,
  rkey: string,
  label: string,
) {
  const json = await fetchJson(
    fetcher,
    'com.atproto.repo.getRecord',
    { repo: DID, collection, rkey },
    label,
    RECORD_LIMIT,
    true,
  );
  if (
    !isObject(json) ||
    json.uri !== `at://${DID}/${collection}/${rkey}` ||
    !isObject(json.value)
  ) {
    error(502, `Malformed upstream ${label} envelope`);
  }
  return json.value;
}

function publicationUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

async function normalizeContent(
  fetcher: typeof fetch,
  document: SiteStandardDocument.Main,
): Promise<SiteStandardDocument.Main> {
  // The envelope's open content union has no registered formats in its TS type.
  const content: unknown = document.content;
  if (!isObject(content) || content.$type !== 'pub.leaflet.content') {
    return document;
  }
  // Validate only the transport shell. The renderer handles individual pages,
  // blocks and facets tolerantly; one malformed child must not hide siblings.
  const leaflet: unknown = { ...content, pages: [] };
  if (!is(PubLeafletContent.mainSchema, leaflet)) {
    error(502, 'Malformed upstream Leaflet content');
  }
  if (!leaflet.blobPages) {
    if (!Array.isArray(content.pages)) {
      error(502, 'Malformed upstream Leaflet content: expected a page array');
    }
    return document;
  }

  const blob = leaflet.blobPages;
  // Non-strict lexicon validation intentionally accepts legacy blobs and skips
  // MIME/size constraints. Enforce those here without rejecting legacy refs.
  if (
    blob.mimeType !== 'application/json' ||
    ('size' in blob && (blob.size < 0 || blob.size > BLOB_LIMIT))
  ) {
    error(502, 'Malformed upstream Leaflet content');
  }
  const cid = 'ref' in blob ? blob.ref.$link : blob.cid;
  if (!isCid(cid)) error(502, 'Malformed upstream Leaflet content');
  const pages = await fetchJson(
    fetcher,
    'com.atproto.sync.getBlob',
    { did: DID, cid },
    'Leaflet pages blob',
    BLOB_LIMIT,
  );
  if (!Array.isArray(pages)) {
    error(502, 'Malformed upstream Leaflet pages blob: expected a page array');
  }
  // blobPages overrides even malformed inline stubs. Keep decoded children
  // untouched for tolerant renderer normalization, without the transport ref.
  const { blobPages: _, ...inline } = leaflet;
  const normalizedDocument: unknown = {
    ...document,
    content: { ...inline, pages },
  };
  if (!is(SiteStandardDocument.mainSchema, normalizedDocument)) {
    error(502, 'Malformed upstream site.standard.document record');
  }
  return normalizedDocument;
}

export async function loadBlogArticle(
  fetcher: typeof fetch,
  rkey: string,
): Promise<BlogArticle> {
  if (!isTid(rkey)) error(404, 'Document not found');

  const value = await fetchRecord(
    fetcher,
    'site.standard.document',
    rkey,
    'Document record',
  );
  if (!is(SiteStandardDocument.mainSchema, value)) {
    error(502, 'Malformed upstream site.standard.document record');
  }
  if (value.site.startsWith('at://') && value.site !== PUBLICATION_URI) {
    error(404, 'Document not found in this publication');
  }

  const publication = await fetchRecord(
    fetcher,
    'site.standard.publication',
    PUB_RKEY,
    'Publication record',
  );
  if (!is(SiteStandardPublication.mainSchema, publication)) {
    error(502, 'Malformed upstream site.standard.publication record');
  }
  if (
    value.site !== PUBLICATION_URI &&
    !(value.site === publication.url && publicationUrl(publication.url))
  ) {
    error(404, 'Document not found in this publication');
  }

  return {
    document: await normalizeContent(fetcher, value),
    publication,
    rkey,
  };
}
