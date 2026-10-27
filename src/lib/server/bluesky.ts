import { DID } from '../constants';
import { selectHomeBluesky, type HomeBluesky } from '../bluesky';

export const HOME_BLUESKY_TIMEOUT_MS = 2_500;
export const HOME_BLUESKY_MAX_BYTES = 512 * 1024;

export interface HomeBlueskyOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxBytes?: number;
}

const feedUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?${new URLSearchParams(
  { actor: DID, filter: 'posts_no_replies', includePins: 'true', limit: '1' },
)}`;

/** Best-effort fast path only. The homepage owns authoritative PDS fallback. */
export async function fetchHomeBluesky(
  fetcher: typeof fetch,
  {
    signal,
    timeoutMs = HOME_BLUESKY_TIMEOUT_MS,
    maxBytes = HOME_BLUESKY_MAX_BYTES,
  }: HomeBlueskyOptions = {},
): Promise<HomeBluesky | null> {
  if (signal?.aborted) return null;
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancel = () => {
    void reader?.cancel().catch(() => {});
  };
  let abort!: () => void;
  const interrupted = new Promise<null>((resolve) => {
    abort = () => {
      controller.abort();
      cancel();
      resolve(null);
    };
  });
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);

  const load = async () => {
    const response = await fetcher(feedUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal,
    });
    // A mock/non-cooperative fetch may resolve after cancellation or follow a redirect.
    if (controller.signal.aborted || !response.ok || response.redirected) {
      void response.body?.cancel().catch(() => {});
      return null;
    }
    if (!response.body) return null;
    reader = response.body.getReader();
    if (Number(response.headers.get('content-length')) > maxBytes)
      throw new Error('Bluesky feed exceeds the byte limit');
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let size = 0;
    let body = '';
    while (!controller.signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      // Fetch exposes decoded bytes, so compressed/chunked bodies get the same bound.
      if (size > maxBytes)
        throw new Error('Bluesky feed exceeds the byte limit');
      body += decoder.decode(value, { stream: true });
    }
    if (controller.signal.aborted) return null;
    return selectHomeBluesky(JSON.parse(body + decoder.decode()));
  };

  try {
    // The deadline covers fetch AND body reading, including non-cooperative fetchers.
    const result = await Promise.race([load(), interrupted]);
    if (!result) abort();
    return result;
  } catch {
    abort();
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    cancel();
    reader?.releaseLock();
  }
}
