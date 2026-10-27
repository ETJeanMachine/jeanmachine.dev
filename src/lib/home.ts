import type { AppBskyActorProfile, AppBskyFeedPost } from '@atcute/bluesky';
import type { Main as StrongRef } from '@atcute/atproto/types/repo/strongRef';
import { isRecordKey } from '@atcute/lexicons/syntax';
import { DID } from './constants';
import {
  isHomeBluesky,
  postFromRecord,
  profileFromRecord,
  type BlueskyPost,
  type BlueskyProfile,
  type PostCounts,
} from './bluesky';
import type { ContributionCalendar, LanguageStats } from './github';
export type { PostCounts } from './bluesky';

export type HomeResource<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T | null; error: null }
  | { status: 'error'; data: null; error: string };

interface HomeData {
  profile: BlueskyProfile;
  pinned: BlueskyPost;
  counts: PostCounts;
  handle: string;
  calendar: ContributionCalendar;
  languages: LanguageStats;
}

export type HomeState = { [K in keyof HomeData]: HomeResource<HomeData[K]> };

export function createHomeState(): HomeState {
  return {
    profile: { status: 'loading', data: null, error: null },
    pinned: { status: 'loading', data: null, error: null },
    counts: { status: 'loading', data: null, error: null },
    handle: { status: 'loading', data: null, error: null },
    calendar: { status: 'loading', data: null, error: null },
    languages: { status: 'loading', data: null, error: null },
  };
}

// One invocation per homepage mount; neither requests nor state survive navigation.
export async function loadHome({
  fetch: fetcher,
  signal,
  onChange,
  timeouts = {},
}: {
  fetch: (input: string, init: RequestInit) => Promise<Response>;
  signal: AbortSignal;
  onChange: (state: HomeState) => void;
  timeouts?: { fastPath?: number; fallback?: number };
}): Promise<void> {
  if (signal.aborted) return;
  let state = createHomeState();

  function update<K extends keyof HomeData>(
    key: K,
    resource: HomeResource<HomeData[K]>,
  ) {
    // Also guard fetch implementations/body readers that finish after abort.
    if (signal.aborted) return;
    state = { ...state, [key]: resource };
    onChange(state);
  }

  async function json<T>(url: string, timeoutMs?: number): Promise<T> {
    signal.throwIfAborted();
    async function read(requestSignal: AbortSignal): Promise<T> {
      const response = await fetcher(url, { signal: requestSignal });
      if (requestSignal.aborted || !response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new Error(`Request unavailable (HTTP ${response.status})`);
      }
      const data = await response.json();
      requestSignal.throwIfAborted();
      return data;
    }
    if (timeoutMs === undefined) return read(signal);

    const controller = new AbortController();
    let abort!: () => void;
    const interrupted = new Promise<never>((_, reject) => {
      abort = () => {
        controller.abort();
        reject(new Error('Bluesky request cancelled or timed out'));
      };
    });
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try {
      // Bound body reading too, even if a fetcher ignores cancellation.
      return await Promise.race([read(controller.signal), interrupted]);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  }

  function bskyJson<T>(url: string): Promise<T> {
    return json<T>(url, timeouts.fallback ?? 5_000);
  }

  async function request<K extends keyof HomeData>(
    key: K,
    message: string,
    read: () => Promise<HomeData[K] | null>,
  ): Promise<HomeData[K] | null> {
    try {
      const data = await read();
      update(key, { status: 'success', data, error: null });
      return signal.aborted ? null : data;
    } catch {
      update(key, { status: 'error', data: null, error: message });
      return null;
    }
  }

  async function loadPinnedFromPds() {
    let ref: StrongRef | undefined;
    const params = new URLSearchParams({
      collection: 'app.bsky.actor.profile',
      rkey: 'self',
    });
    const profile = await request(
      'profile',
      'Unable to load profile.',
      async () => {
        const record = await bskyJson<{
          value?: AppBskyActorProfile.Main;
        } | null>(`/api/atproto/record?${params}`);
        if (!record?.value) return null;
        const profile = profileFromRecord(record.value);
        if (!profile) throw new Error('Invalid profile');
        ref = record.value.pinnedPost as StrongRef | undefined;
        return profile;
      },
    );
    if (signal.aborted) return;
    if (!profile || !ref) {
      update(
        'pinned',
        state.profile.status === 'error'
          ? {
              status: 'error',
              data: null,
              error: 'Pinned post unavailable without profile.',
            }
          : { status: 'success', data: null, error: null },
      );
      update('counts', { status: 'success', data: null, error: null });
      return;
    }

    // Post is deliberately an owner-identity component, not a foreign-post renderer.
    const prefix = `at://${DID}/app.bsky.feed.post/`;
    const uri = ref.uri;
    const rkey =
      typeof uri === 'string' && uri.startsWith(prefix)
        ? uri.slice(prefix.length)
        : '';
    if (!isRecordKey(rkey)) {
      update('pinned', {
        status: 'error',
        data: null,
        error: 'Invalid pinned post reference.',
      });
      update('counts', { status: 'success', data: null, error: null });
      return;
    }

    await Promise.all([
      request('pinned', 'Unable to load pinned post.', async () => {
        const params = new URLSearchParams({
          collection: 'app.bsky.feed.post',
          rkey,
        });
        const record = await bskyJson<{ value?: AppBskyFeedPost.Main } | null>(
          `/api/atproto/record?${params}`,
        );
        if (!record?.value) return null;
        const post = postFromRecord(record.value, uri);
        if (!post) throw new Error('Invalid pinned post');
        return post;
      }),
      request('counts', 'Post counts unavailable.', () =>
        bskyJson<PostCounts>(
          `/api/atproto/postview?uri=${encodeURIComponent(uri)}`,
        ),
      ),
    ]);
  }

  async function loadBluesky() {
    try {
      const home = await json<unknown>(
        '/api/atproto/home',
        timeouts.fastPath ?? 3_500,
      );
      if (!isHomeBluesky(home)) throw new Error('Invalid Bluesky home data');
      if (signal.aborted) return;
      // Publish the pin, identity and its counts together, without resetting GitHub.
      state = {
        ...state,
        profile: { status: 'success', data: home.profile, error: null },
        pinned: { status: 'success', data: home.pinned, error: null },
        counts: { status: 'success', data: home.counts, error: null },
        handle: { status: 'success', data: home.handle, error: null },
      };
      onChange(state);
      return;
    } catch {
      if (signal.aborted) return;
    }

    // A missing AppView pin is inconclusive; consult the authoritative PDS.
    await Promise.all([
      loadPinnedFromPds(),
      request('handle', 'Handle unavailable; showing DID.', async () => {
        const data = await bskyJson<{ handle?: string } | null>(
          '/api/atproto/resolve',
        );
        return data?.handle || null;
      }),
    ]);
  }

  await Promise.all([
    loadBluesky(),
    request('calendar', 'Unable to load GitHub contributions.', () =>
      json<ContributionCalendar>('/api/github/contributions'),
    ),
    request('languages', 'Unable to load GitHub languages.', () =>
      json<LanguageStats>('/api/github/languages'),
    ),
  ]);
}
