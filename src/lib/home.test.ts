// @ts-ignore Bun supplies test/runtime modules without app-wide ambient types.
import { expect, test } from 'bun:test';
import { DID } from './constants';
import { createHomeState, loadHome, type HomeState } from './home';
import type { ContributionCalendar, LanguageStats } from './github';

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
  pinnedPost: { uri, cid: 'test-cid' },
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
const payloads: Record<string, unknown> = {
  [profileUrl]: { value: profile },
  [pinnedUrl]: { value: post },
  [countsUrl]: counts,
  [handleUrl]: { handle: 'eliza.vg' },
  [calendarUrl]: calendar,
  [languagesUrl]: languages,
};

type Fetcher = Parameters<typeof loadHome>[0]['fetch'];
type Reply = (url: string, init: RequestInit) => Promise<Response>;

function mount(reply: Reply = async (url) => Response.json(payloads[url])) {
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

test('one page owner requests every resource once and publishes successful data', async () => {
  const page = mount();
  await page.done;
  expect(page.calls).toHaveLength(6);
  for (const url of urls) {
    expect(page.calls.filter((call) => call.url === url)).toHaveLength(1);
  }
  expect(
    page.calls.every((call) => call.signal === page.controller.signal),
  ).toBe(true);
  expect(page.snapshots).toHaveLength(6);
  expect(
    Object.values(page.state).every(
      (resource) => resource.status === 'success',
    ),
  ).toBe(true);
  expect(page.state.profile.data).toEqual(profile);
  expect(page.state.pinned.data).toEqual({ post, uri });
  expect(page.state.counts.data).toEqual(counts);
  expect(page.state.handle.data).toBe('eliza.vg');
  expect(page.state.calendar.data).toEqual(calendar);
  expect(page.state.languages.data).toEqual(languages);
  expect(page.snapshots[0]).not.toBe(page.state);
  const profileSnapshot = page.snapshots.find(
    (snapshot) => snapshot.profile.status === 'success',
  );
  expect(profileSnapshot).toBeTruthy();
  expect(profileSnapshot?.pinned.status).toBe('loading');
});

test('GitHub and handle requests progress while the shared profile is pending', async () => {
  const pending = deferred<Response>();
  const page = mount(async (url) =>
    url === profileUrl ? pending.promise : Response.json(payloads[url]),
  );
  expect(page.calls.map((call) => call.url)).toEqual([
    profileUrl,
    handleUrl,
    calendarUrl,
    languagesUrl,
  ]);
  // Wait for the independently completing resources, not the profile.
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(page.state.calendar.status).toBe('success');
  expect(page.state.languages.status).toBe('success');
  expect(page.state.handle.status).toBe('success');
  expect(page.state.profile.status).toBe('loading');
  expect(page.state.pinned.status).toBe('loading');
  pending.resolve(Response.json({ value: profile }));
  await page.done;
  expect(page.calls).toHaveLength(6);
});

for (const [url, key] of [
  [pinnedUrl, 'pinned'],
  [countsUrl, 'counts'],
  [handleUrl, 'handle'],
  [calendarUrl, 'calendar'],
  [languagesUrl, 'languages'],
] as const) {
  test(`${key} HTTP failure does not discard other successful resources`, async () => {
    const page = mount(async (request) =>
      request === url
        ? new Response('Unavailable', { status: 503 })
        : Response.json(payloads[request]),
    );
    await page.done;
    expect(page.calls).toHaveLength(6);
    expect(page.state[key].status).toBe('error');
    expect(page.state[key].error).toBeTruthy();
    for (const [other, resource] of Object.entries(page.state)) {
      if (other !== key) expect(resource.status).toBe('success');
    }
  });
}

test('profile network failure settles dependent state without making pinned/count requests', async () => {
  const page = mount(async (url) => {
    if (url === profileUrl) throw new TypeError('Network unavailable');
    return Response.json(payloads[url]);
  });
  await page.done;
  expect(page.calls).toHaveLength(4);
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

test('invalid JSON is isolated from the other resources', async () => {
  const page = mount(async (url) =>
    url === calendarUrl
      ? new Response('not JSON', { status: 200 })
      : Response.json(payloads[url]),
  );
  await page.done;
  expect(page.state.calendar.status).toBe('error');
  expect(page.state.languages.data).toEqual(languages);
  expect(page.state.pinned.data).toEqual({ post, uri });
});

for (const value of [null, { value: { displayName: 'No pin' } }]) {
  test(`missing profile/pin is a settled empty state (${JSON.stringify(value)})`, async () => {
    const page = mount(async (url) =>
      Response.json(url === profileUrl ? value : payloads[url]),
    );
    await page.done;
    expect(page.calls).toHaveLength(4);
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

test('empty GitHub data and handle/post records settle instead of staying loading', async () => {
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

test('foreign or malformed pins cannot be rendered with the public Post owner identity', async () => {
  for (const invalid of [
    'at://did:plc:someoneelse/app.bsky.feed.post/pinned',
    `at://${DID}/app.bsky.feed.post/`,
    `at://${DID}/app.bsky.feed.post/pinned/extra`,
  ]) {
    const page = mount(async (url) =>
      Response.json(
        url === profileUrl
          ? { value: { ...profile, pinnedPost: { uri: invalid } } }
          : payloads[url],
      ),
    );
    await page.done;
    expect(page.calls).toHaveLength(4);
    expect(page.state.pinned.status).toBe('error');
    expect(page.state.counts.status).toBe('success');
    expect(page.state.calendar.status).toBe('success');
  }
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

test('unmount aborts every active request without publishing error states', async () => {
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
  expect(page.calls).toHaveLength(4);
  page.controller.abort();
  await page.done;
  expect(page.calls.every((call) => call.signal?.aborted)).toBe(true);
  expect(page.snapshots).toHaveLength(0);
  expect(page.calls).toHaveLength(4);
});

test('late profile responses after unmount neither publish nor start dependent requests', async () => {
  const pending = deferred<Response>();
  const page = mount(() => pending.promise);
  page.controller.abort();
  pending.resolve(Response.json({ value: profile }));
  await page.done;
  expect(page.calls).toHaveLength(4);
  expect(page.snapshots).toHaveLength(0);
});

test('unmount after profile aborts pinned/count requests and ignores late body readers', async () => {
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
  expect(page.calls).toHaveLength(6);
  const before = page.snapshots.length;
  page.controller.abort();
  pendingBody.resolve({ value: post, ...counts });
  await page.done;
  expect(page.snapshots).toHaveLength(before);
  expect(page.calls.every((call) => call.signal?.aborted)).toBe(true);
});

test('separate mounts have isolated state and never cache globally across navigation', async () => {
  const first = mount();
  const second = mount(async (url) =>
    Response.json(
      url === handleUrl ? { handle: 'second.example' } : payloads[url],
    ),
  );
  await Promise.all([first.done, second.done]);
  expect(first.calls).toHaveLength(6);
  expect(second.calls).toHaveLength(6);
  expect(first.state.handle.data).toBe('eliza.vg');
  expect(second.state.handle.data).toBe('second.example');
  expect(first.state).not.toBe(second.state);
  expect(createHomeState()).not.toBe(createHomeState());
});
