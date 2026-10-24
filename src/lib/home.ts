import type { AppBskyActorProfile, AppBskyFeedPost } from '@atcute/bluesky';
import type { Main as StrongRef } from '@atcute/atproto/types/repo/strongRef';
import { DID } from './constants';
import type { ContributionCalendar, LanguageStats } from './github';

export type HomeResource<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T | null; error: null }
  | { status: 'error'; data: null; error: string };

export interface PostCounts {
  likeCount: number;
  repostCount: number;
  replyCount: number;
}

interface HomeData {
  profile: AppBskyActorProfile.Main;
  pinned: { post: AppBskyFeedPost.Main; uri: string };
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
}: {
  fetch: (input: string, init: RequestInit) => Promise<Response>;
  signal: AbortSignal;
  onChange: (state: HomeState) => void;
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

  async function json<T>(url: string): Promise<T> {
    signal.throwIfAborted();
    const response = await fetcher(url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
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

  async function loadPinned() {
    const params = new URLSearchParams({
      collection: 'app.bsky.actor.profile',
      rkey: 'self',
    });
    const profile = await request(
      'profile',
      'Unable to load profile.',
      async () => {
        const record = await json<{ value?: AppBskyActorProfile.Main } | null>(
          `/api/atproto/record?${params}`,
        );
        return record?.value ?? null;
      },
    );
    if (signal.aborted) return;
    const ref = profile?.pinnedPost as StrongRef | undefined;
    if (!ref) {
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
    if (!rkey || !/^[a-zA-Z0-9._~:-]+$/.test(rkey)) {
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
        const record = await json<{ value?: AppBskyFeedPost.Main } | null>(
          `/api/atproto/record?${params}`,
        );
        return record?.value ? { post: record.value, uri } : null;
      }),
      request('counts', 'Post counts unavailable.', () =>
        json<PostCounts>(
          `/api/atproto/postview?uri=${encodeURIComponent(uri)}`,
        ),
      ),
    ]);
  }

  await Promise.all([
    loadPinned(),
    request('handle', 'Handle unavailable; showing DID.', async () => {
      const data = await json<{ handle?: string } | null>(
        '/api/atproto/resolve',
      );
      return data?.handle || null;
    }),
    request('calendar', 'Unable to load GitHub contributions.', () =>
      json<ContributionCalendar>('/api/github/contributions'),
    ),
    request('languages', 'Unable to load GitHub languages.', () =>
      json<LanguageStats>('/api/github/languages'),
    ),
  ]);
}
