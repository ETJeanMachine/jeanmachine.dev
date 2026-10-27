// @ts-ignore Bun supplies test/runtime modules without app-wide ambient types.
import { expect, test } from 'bun:test';
import { DID } from './constants';
import { createHomeState, loadHome, type HomeState } from './home';
import type { ContributionCalendar, LanguageStats } from './github';
import type { HomeBluesky } from './bluesky';

const fastUrl = '/api/atproto/home';
const profileUrl =
  '/api/atproto/record?collection=app.bsky.actor.profile&rkey=self';
const pinnedUrl =
  '/api/atproto/record?collection=app.bsky.feed.post&rkey=pinned';
const uri = `at://${DID}/app.bsky.feed.post/pinned`;
const countsUrl = `/api/atproto/postview?uri=${encodeURIComponent(uri)}`;
const handleUrl = '/api/atproto/resolve';
const calendarUrl = '/api/github/contributions';
const languagesUrl = '/api/github/languages';
const urls = [
  fastUrl,
  profileUrl,
  pinnedUrl,
  countsUrl,
  handleUrl,
  calendarUrl,
  languagesUrl,
];
const profile = {
  $type: 'app.bsky.actor.profile',
  displayName: 'Eliza',
  pinnedPost: {
    uri,
    cid: 'bafkreifdkkuhnfrsz35uibzth7wractnc755xgydmxnv3wxpjhjs5rbrr4',
  },
};
const post = {
  $type: 'app.bsky.feed.post',
  text: 'Pinned text',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const counts = { likeCount: 3, repostCount: 2, replyCount: 1 };
const calendar: ContributionCalendar = {
  totalContributions: 4,
  weeks: [{ contributionDays: [{ date: '2026-01-01', contributionCount: 4 }] }],
};
const languages: LanguageStats = {
  languages: [
    { name: 'TypeScript', size: 100, percent: 100, color: '#3178c6' },
  ],
  totalSize: 100,
  reposAnalyzed: 1,
};
const displayProfile = { displayName: 'Eliza' };
const displayPost = { uri, text: post.text, createdAt: post.createdAt };
const fastData: HomeBluesky = {
  profile: displayProfile,
  pinned: displayPost,
  counts,
  handle: 'eliza.vg',
};
const payloads: Record<string, unknown> = {
  // Fallback regressions deliberately exercise an unavailable fast path.
  [fastUrl]: { error: 'Feed unavailable' },
  [profileUrl]: { value: profile },
  [pinnedUrl]: { value: post },
  [countsUrl]: counts,
  [handleUrl]: { handle: 'eliza.vg' },
  [calendarUrl]: calendar,
  [languagesUrl]: languages,
};

type Fetcher = Parameters<typeof loadHome>[0]['fetch'];
type Reply = (url: string, init: RequestInit) => Promise<Response>;

function mount(
  reply: Reply = async (url) => Response.json(payloads[url]),
  timeouts?: Parameters<typeof loadHome>[0]['timeouts'],
) {
  const controller = new AbortController();
  const calls: { url: string; signal: AbortSignal | null | undefined }[] = [];
  const snapshots: HomeState[] = [];
  let state = createHomeState();
  const fetcher: Fetcher = (url, init) => {
    if (!urls.includes(url)) throw new Error(`Unexpected request: ${url}`);
    calls.push({ url, signal: init.signal });
    return reply(url, init);
  };
  const done = loadHome({
    fetch: fetcher,
    signal: controller.signal,
    timeouts,
    onChange: (next) => {
      state = next;
      snapshots.push(next);
    },
  });
  return {
    controller,
    calls,
    snapshots,
    done,
    get state() {
      return state;
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function expectSuccessfulHome(state: HomeState) {
  expect(
    Object.values(state).every((resource) => resource.status === 'success'),
  ).toBe(true);
  expect(state.profile.data).toEqual(displayProfile);
  expect(state.pinned.data).toEqual(displayPost);
  expect(state.counts.data).toEqual(counts);
  expect(state.handle.data).toBe('eliza.vg');
  expect(state.calendar.data).toEqual(calendar);
  expect(state.languages.data).toEqual(languages);
}

test('successful fast path needs one Bluesky request and two independent GitHub requests', async () => {
  const page = mount(async (url) =>
    Response.json(url === fastUrl ? fastData : payloads[url]),
  );
  await page.done;
  expect(page.calls.map((call) => call.url)).toEqual([
    fastUrl,
    calendarUrl,
    languagesUrl,
  ]);
  expectSuccessfulHome(page.state);
  expect(page.snapshots).toHaveLength(3);
  const ready = page.snapshots.find(
    (snapshot) => snapshot.profile.status === 'success',
  );
  expect(ready?.pinned.data?.uri).toBe(uri);
  expect(ready?.counts.data).toEqual(counts);
  expect(ready?.handle.data).toBe('eliza.vg');
});

test('GitHub finishes while the Bluesky fast path is pending', async () => {
  const pending = deferred<Response>();
  const page = mount(async (url) =>
    url === fastUrl ? pending.promise : Response.json(payloads[url]),
  );
  await tick();
  expect(page.state.calendar.status).toBe('success');
  expect(page.state.languages.status).toBe('success');
  expect(page.state.profile.status).toBe('loading');
  expect(page.state.pinned.status).toBe('loading');
  expect(page.calls).toHaveLength(3);
  pending.resolve(Response.json(fastData));
  await page.done;
  expectSuccessfulHome(page.state);
});

test('Bluesky does not wait for a slow or failing GitHub resource', async () => {
  const pending = deferred<Response>();
  const page = mount(async (url) => {
    if (url === fastUrl) return Response.json(fastData);
    if (url === calendarUrl) return pending.promise;
    return new Response('Unavailable', { status: 503 });
  });
  await tick();
  expect(page.state.profile.data).toEqual(displayProfile);
  expect(page.state.pinned.data).toEqual(displayPost);
  expect(page.state.counts.data).toEqual(counts);
  expect(page.state.calendar.status).toBe('loading');
  expect(page.state.languages.status).toBe('error');
  pending.resolve(Response.json(calendar));
  await page.done;
  expect(page.state.calendar.data).toEqual(calendar);
  expect(page.calls).toHaveLength(3);
});

for (const failure of ['http', 'network', 'json', 'shape', 'foreign']) {
  test(`fast-path ${failure} failure falls back without losing independent resources`, async () => {
    const page = mount(async (url) => {
      if (url !== fastUrl) return Response.json(payloads[url]);
      if (failure === 'http') return new Response(null, { status: 502 });
      if (failure === 'network') throw new TypeError('Network unavailable');
      if (failure === 'json') return new Response('not JSON');
      if (failure === 'foreign')
        return Response.json({
          ...fastData,
          pinned: { ...displayPost, uri: uri.replace(DID, 'did:plc:other') },
        });
      return Response.json({ pinned: null });
    });
    await page.done;
    expectSuccessfulHome(page.state);
    expect(page.calls).toHaveLength(7);
    for (const url of urls)
      expect(page.calls.filter((call) => call.url === url)).toHaveLength(1);
  });
}

test('PDS fallback publishes the profile before its pinned post and counts', async () => {
  const pending = deferred<Response>();
  const page = mount(async (url) =>
    url === profileUrl ? pending.promise : Response.json(payloads[url]),
  );
  await tick();
  expect(page.calls.map((call) => call.url)).toEqual([
    fastUrl,
    calendarUrl,
    languagesUrl,
    profileUrl,
    handleUrl,
  ]);
  expect(page.state.calendar.status).toBe('success');
  expect(page.state.languages.status).toBe('success');
  expect(page.state.handle.status).toBe('success');
  expect(page.state.profile.status).toBe('loading');
  pending.resolve(Response.json({ value: profile }));
  await page.done;
  expectSuccessfulHome(page.state);
  const ready = page.snapshots.find(
    (snapshot) => snapshot.profile.status === 'success',
  );
  expect(ready?.pinned.status).toBe('loading');
  expect(page.snapshots).toHaveLength(6);
  expect(page.snapshots[0]).not.toBe(page.state);
});

for (const [url, key] of [
  [pinnedUrl, 'pinned'],
  [countsUrl, 'counts'],
  [handleUrl, 'handle'],
  [calendarUrl, 'calendar'],
  [languagesUrl, 'languages'],
] as const) {
  test(`fallback ${key} HTTP failure does not discard other successful resources`, async () => {
    const page = mount(async (request) =>
      request === url
        ? new Response('Unavailable', { status: 503 })
        : Response.json(payloads[request]),
    );
    await page.done;
    expect(page.calls).toHaveLength(7);
    expect(page.state[key].status).toBe('error');
    expect(page.state[key].error).toBeTruthy();
    for (const [other, resource] of Object.entries(page.state)) {
      if (other !== key) expect(resource.status).toBe('success');
    }
  });
}

test('profile failure settles dependent state without making pinned/count requests', async () => {
  const page = mount(async (url) => {
    if (url === profileUrl) throw new TypeError('Network unavailable');
    return Response.json(payloads[url]);
  });
  await page.done;
  expect(page.calls).toHaveLength(5);
  expect(page.state.profile.status).toBe('error');
  expect(page.state.pinned.status).toBe('error');
  expect(page.state.counts).toEqual({
    status: 'success',
    data: null,
    error: null,
  });
  expect(page.state.handle.status).toBe('success');
  expect(page.state.calendar.status).toBe('success');
  expect(page.state.languages.status).toBe('success');
});

test('invalid GitHub JSON is isolated from other resources', async () => {
  const page = mount(async (url) =>
    url === calendarUrl
      ? new Response('not JSON')
      : Response.json(payloads[url]),
  );
  await page.done;
  expect(page.state.calendar.status).toBe('error');
  expect(page.state.languages.data).toEqual(languages);
  expect(page.state.pinned.data).toEqual(displayPost);
});

for (const value of [
  null,
  { value: { $type: 'app.bsky.actor.profile', displayName: 'No pin' } },
]) {
  test(`missing PDS profile/pin is a settled empty state (${JSON.stringify(value)})`, async () => {
    const page = mount(async (url) =>
      Response.json(url === profileUrl ? value : payloads[url]),
    );
    await page.done;
    expect(page.calls).toHaveLength(5);
    expect(page.state.profile.status).toBe('success');
    expect(page.state.pinned).toEqual({
      status: 'success',
      data: null,
      error: null,
    });
    expect(page.state.counts).toEqual({
      status: 'success',
      data: null,
      error: null,
    });
  });
}

test('empty GitHub data and missing handle/post settle instead of staying loading', async () => {
  const empty: Record<string, unknown> = {
    [calendarUrl]: { totalContributions: 0, weeks: [] },
    [languagesUrl]: { languages: [], totalSize: 0, reposAnalyzed: 0 },
    [handleUrl]: { handle: '' },
    [pinnedUrl]: { value: null },
  };
  const page = mount(async (url) => Response.json(empty[url] ?? payloads[url]));
  await page.done;
  expect(
    Object.values(page.state).every(
      (resource) => resource.status === 'success',
    ),
  ).toBe(true);
  expect(page.state.calendar.data?.weeks).toEqual([]);
  expect(page.state.languages.data?.languages).toEqual([]);
  expect(page.state.handle.data).toBeNull();
  expect(page.state.pinned.data).toBeNull();
});

test('foreign or malformed PDS pins cannot be rendered with the owner identity', async () => {
  for (const invalid of [
    'at://did:plc:someoneelse/app.bsky.feed.post/pinned',
    `at://${DID}/app.bsky.feed.post/`,
    `at://${DID}/app.bsky.feed.post/pinned/extra`,
  ]) {
    const page = mount(async (url) =>
      Response.json(
        url === profileUrl
          ? {
              value: {
                ...profile,
                pinnedPost: { ...profile.pinnedPost, uri: invalid },
              },
            }
          : payloads[url],
      ),
    );
    await page.done;
    expect(page.calls).toHaveLength(5);
    expect(page.state.pinned.status).toBe('error');
    expect(page.state.counts.status).toBe('success');
    expect(page.state.calendar.status).toBe('success');
  }
});

test('malformed PDS post data is rejected without discarding profile/counts', async () => {
  const page = mount(async (url) =>
    Response.json(
      url === pinnedUrl ? { value: { ...post, text: 123 } } : payloads[url],
    ),
  );
  await page.done;
  expect(page.state.pinned.status).toBe('error');
  expect(page.state.profile.data).toEqual(displayProfile);
  expect(page.state.counts.data).toEqual(counts);
});

test('already cancelled mounts do not request or publish anything', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await loadHome({
    fetch: async () => {
      calls++;
      throw new Error('Must not fetch');
    },
    signal: controller.signal,
    onChange: () => {
      throw new Error('Must not publish');
    },
  });
  expect(calls).toBe(0);
});

test('unmount aborts active fast/GitHub requests without starting fallback', async () => {
  const page = mount(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener(
          'abort',
          () => reject(init.signal?.reason),
          { once: true },
        );
      }),
  );
  expect(page.calls).toHaveLength(3);
  page.controller.abort();
  await page.done;
  expect(page.calls.every((call) => call.signal?.aborted)).toBe(true);
  expect(page.snapshots).toHaveLength(0);
  expect(page.calls).toHaveLength(3);
});

test('late fast-path body readers after unmount cannot publish or start fallback', async () => {
  const body = deferred<unknown>();
  const page = mount(async (url) =>
    url === fastUrl
      ? ({ ok: true, json: () => body.promise } as Response)
      : Response.json(payloads[url]),
  );
  await tick();
  const before = page.snapshots.length;
  page.controller.abort();
  body.resolve(fastData);
  await page.done;
  expect(page.snapshots).toHaveLength(before);
  expect(page.calls).toHaveLength(3);
});

test('late fallback profiles after unmount cannot start pinned/count requests', async () => {
  const pending = deferred<Response>();
  const started = deferred<void>();
  const page = mount(async (url) => {
    if (url === profileUrl) {
      started.resolve();
      return pending.promise;
    }
    return Response.json(payloads[url]);
  });
  await started.promise;
  const before = page.snapshots.length;
  page.controller.abort();
  pending.resolve(Response.json({ value: profile }));
  await page.done;
  expect(page.calls).toHaveLength(5);
  expect(page.snapshots).toHaveLength(before);
  expect(
    page.calls.find((call) => call.url === profileUrl)?.signal?.aborted,
  ).toBe(true);
});

test('unmount after PDS profile aborts pinned/counts and ignores late bodies', async () => {
  const pendingBody = deferred<unknown>();
  const started = deferred<void>();
  const page = mount(async (url) => {
    if (url === pinnedUrl || url === countsUrl) {
      if (url === countsUrl) started.resolve();
      return { ok: true, json: () => pendingBody.promise } as Response;
    }
    return Response.json(payloads[url]);
  });
  await started.promise;
  expect(page.calls).toHaveLength(7);
  const before = page.snapshots.length;
  page.controller.abort();
  pendingBody.resolve({ value: post, ...counts });
  await page.done;
  expect(page.snapshots).toHaveLength(before);
  expect(
    page.calls
      .filter((call) => call.url === pinnedUrl || call.url === countsUrl)
      .every((call) => call.signal?.aborted),
  ).toBe(true);
});

test('fast-path deadline starts fallback and ignores non-cooperative late responses', async () => {
  const pending = deferred<Response>();
  const page = mount(
    async (url) =>
      url === fastUrl ? pending.promise : Response.json(payloads[url]),
    { fastPath: 2 },
  );
  await page.done;
  expectSuccessfulHome(page.state);
  expect(page.calls.find((call) => call.url === fastUrl)?.signal?.aborted).toBe(
    true,
  );
  const before = page.snapshots.length;
  pending.resolve(Response.json({ ...fastData, handle: 'late.example' }));
  await tick();
  expect(page.snapshots).toHaveLength(before);
  expect(page.state.handle.data).toBe('eliza.vg');
});

for (const slow of [profileUrl, pinnedUrl, countsUrl, handleUrl]) {
  test(`fallback deadline bounds ${slow}, including stalled JSON bodies`, async () => {
    const pending = deferred<unknown>();
    const page = mount(
      async (url) =>
        url === slow
          ? ({ ok: true, json: () => pending.promise } as Response)
          : Response.json(payloads[url]),
      { fallback: 2 },
    );
    await page.done;
    expect(
      Object.values(page.state).some(
        (resource) => resource.status === 'loading',
      ),
    ).toBe(false);
    expect(page.state.calendar.data).toEqual(calendar);
    expect(page.state.languages.data).toEqual(languages);
    expect(page.calls.find((call) => call.url === slow)?.signal?.aborted).toBe(
      true,
    );
    const before = page.snapshots.length;
    pending.resolve(payloads[slow]);
    await tick();
    expect(page.snapshots).toHaveLength(before);
  });
}

test('separate mounts keep isolated state without global client caching', async () => {
  const first = mount(async (url) =>
    Response.json(url === fastUrl ? fastData : payloads[url]),
  );
  const second = mount(async (url) =>
    Response.json(
      url === fastUrl
        ? { ...fastData, handle: 'second.example' }
        : payloads[url],
    ),
  );
  await Promise.all([first.done, second.done]);
  expect(first.calls).toHaveLength(3);
  expect(second.calls).toHaveLength(3);
  expect(first.state.handle.data).toBe('eliza.vg');
  expect(second.state.handle.data).toBe('second.example');
  expect(first.state).not.toBe(second.state);
  expect(createHomeState()).not.toBe(createHomeState());
});
