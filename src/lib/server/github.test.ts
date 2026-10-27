// @ts-ignore Bun supplies test/runtime modules without app-wide ambient types.
import { expect, test } from 'bun:test';
import { isolatedModule, useFetchMock } from '../testing';
import type { ContributionCalendar, LanguageStats } from '../github';

interface TestModule {
  testEnv: { GITHUB_TOKEN?: string };
  getContributionCalendar(): Promise<ContributionCalendar>;
  getLanguageStats(): Promise<LanguageStats>;
  GET(event: {
    setHeaders(headers: Record<string, string>): void;
  }): Promise<Response>;
}

// Each build owns its env/constants module; no global mock.module registration.
async function githubModule(
  entry: 'client' | 'contributions' | 'languages' = 'client',
  dev = false,
): Promise<TestModule> {
  const entrypoint = new URL(
    entry === 'client'
      ? './github.ts'
      : `../../routes/api/github/${entry}/+server.ts`,
    import.meta.url,
  );
  const { module } = await isolatedModule(entrypoint, {
    define: { 'import.meta.env.DEV': JSON.stringify(dev) },
    virtual: {
      '$env/dynamic/private': 'export const env = {};',
      '$lib/constants':
        "export const GITHUB_EXCLUDED_REPOS = ['Job-Apps', 'OWNER/Ignored']; export const GITHUB_EXCLUDED_LANGUAGES = ['McFunction', 'Jupyter Notebook'];",
    },
    transform: (source) =>
      source + "\nexport { env as testEnv } from '$env/dynamic/private';",
  });
  return module;
}

const fetchMock = useFetchMock();
function upstream(
  respond: (
    body: { query: string; variables: Record<string, unknown> },
    init: RequestInit,
  ) => Response | Promise<Response>,
) {
  return fetchMock((url, init = {}) => {
    expect(url).toBe('https://api.github.com/graphql');
    return respond(JSON.parse(String(init.body)), init);
  });
}
const calendar: ContributionCalendar = {
  totalContributions: 7,
  weeks: [{ contributionDays: [{ date: '2026-01-01', contributionCount: 7 }] }],
};
function calendarResponse() {
  return Response.json({
    data: {
      viewer: { contributionsCollection: { contributionCalendar: calendar } },
    },
  });
}
function repositories(
  nodes: unknown[] = [],
  hasNextPage = false,
  endCursor: string | null = null,
) {
  return Response.json({
    data: {
      viewer: { repositories: { nodes, pageInfo: { hasNextPage, endCursor } } },
    },
  });
}
function repo(
  name: string,
  nameWithOwner: string,
  edges: [string, number, string | null][],
) {
  return {
    name,
    nameWithOwner,
    languages: {
      edges: edges.map(([name, size, color]) => ({
        size,
        node: { name, color },
      })),
    },
  };
}

test('GitHub reads runtime token per request, sends required headers and preserves calendar shape/date range', async () => {
  const client = await githubModule();
  let expectedToken = 'first-token';
  const mock = upstream(({ query, variables }, init) => {
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Authorization: `Bearer ${expectedToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'jeanmachine.dev',
      'X-GitHub-Api-Version': '2022-11-28',
    });
    expect(query).toContain('contributionsCollection(from: $from, to: $to)');
    expect(query).toContain('contributionCount');
    const from = new Date(String(variables.from));
    const to = new Date(String(variables.to));
    const expectedFrom = new Date(to);
    expectedFrom.setFullYear(expectedFrom.getFullYear() - 1);
    expect(from.toISOString()).toBe(expectedFrom.toISOString());
    expect(Math.abs(Date.now() - to.getTime())).toBeLessThan(5000);
    return calendarResponse();
  });
  client.testEnv.GITHUB_TOKEN = expectedToken;
  expect(await client.getContributionCalendar()).toEqual(calendar);
  expectedToken = 'rotated-token';
  client.testEnv.GITHUB_TOKEN = expectedToken;
  expect(await client.getContributionCalendar()).toEqual(calendar);
  delete client.testEnv.GITHUB_TOKEN;
  await expect(client.getContributionCalendar()).rejects.toThrow(
    'GITHUB_TOKEN is not configured',
  );
  await expect(client.getLanguageStats()).rejects.toThrow(
    'GITHUB_TOKEN is not configured',
  );
  expect(mock).toHaveBeenCalledTimes(2);
});

test('GitHub language pagination aggregates/sorts bytes and excludes names, owner/name and languages case-insensitively', async () => {
  const client = await githubModule();
  client.testEnv.GITHUB_TOKEN = 'test-token';
  let page = 0;
  const mock = upstream(({ query, variables }) => {
    expect(query).toContain('first: 100');
    expect(query).toContain('ownerAffiliations: [OWNER]');
    expect(query).toContain('isFork: false');
    expect(query).toContain('after: $cursor');
    if (page++ === 0) {
      expect(variables).toEqual({});
      return repositories(
        [
          repo('JOB-APPS', 'owner/JOB-APPS', [['Rust', 999, '#f00']]),
          repo('ignored', 'owner/IGNORED', [['Rust', 999, '#f00']]),
          repo('first', 'owner/first', [
            ['TypeScript', 30, null],
            ['Rust', 20, '#abc'],
            ['MCFUNCTION', 900, null],
          ]),
        ],
        true,
        'next +cursor',
      );
    }
    expect(variables).toEqual({ cursor: 'next +cursor' });
    return repositories([
      repo('second', 'owner/second', [
        ['TypeScript', 50, '#def'],
        ['JUPYTER NOTEBOOK', 1000, null],
      ]),
      repo('empty', 'owner/empty', []),
    ]);
  });
  expect(await client.getLanguageStats()).toEqual({
    languages: [
      { name: 'TypeScript', size: 80, color: '#def', percent: 80 },
      { name: 'Rust', size: 20, color: '#abc', percent: 20 },
    ],
    totalSize: 100,
    reposAnalyzed: 3,
  });
  expect(mock).toHaveBeenCalledTimes(2);
});

test('GitHub empty/all-excluded/zero-byte languages avoid invalid percentages and retain repo counts', async () => {
  const client = await githubModule();
  client.testEnv.GITHUB_TOKEN = 'test-token';
  let nodes: unknown[] = [];
  upstream(() => repositories(nodes));
  expect(await client.getLanguageStats()).toEqual({
    languages: [],
    totalSize: 0,
    reposAnalyzed: 0,
  });
  nodes = [repo('kept', 'owner/kept', [['mcfunction', 10, null]])];
  expect(await client.getLanguageStats()).toEqual({
    languages: [],
    totalSize: 0,
    reposAnalyzed: 1,
  });
  nodes = [repo('kept', 'owner/kept', [['TypeScript', 0, null]])];
  expect(await client.getLanguageStats()).toEqual({
    languages: [{ name: 'TypeScript', size: 0, color: null, percent: 0 }],
    totalSize: 0,
    reposAnalyzed: 1,
  });
});

for (const cursors of [[null], [''], ['repeat', 'repeat'], ['a', 'b', 'a']]) {
  test(`GitHub rejects pagination with no cursor progress: ${JSON.stringify(cursors)}`, async () => {
    const client = await githubModule();
    client.testEnv.GITHUB_TOKEN = 'test-token';
    let page = 0;
    const mock = upstream(() => {
      if (page >= cursors.length) throw new Error('Unexpected extra page');
      return repositories([], true, cursors[page++]);
    });
    await expect(client.getLanguageStats()).rejects.toThrow(
      'GitHub repository pagination made no progress',
    );
    expect(mock).toHaveBeenCalledTimes(cursors.length);
  });
}

test('GitHub HTTP errors include bounded details; GraphQL and missing-data failures are deliberate errors', async () => {
  const client = await githubModule();
  client.testEnv.GITHUB_TOKEN = 'test-token';
  let response = new Response('x'.repeat(250), { status: 403 });
  upstream(() => response.clone());
  await expect(client.getContributionCalendar()).rejects.toThrow(
    `GitHub API returned 403: ${'x'.repeat(200)}`,
  );
  response = Response.json({
    errors: [{ message: 'Rate limited' }],
    data: { viewer: {} },
  });
  await expect(client.getLanguageStats()).rejects.toThrow('Rate limited');
  for (const value of [null, {}, { data: null }, { errors: [] }]) {
    response = Response.json(value);
    await expect(client.getContributionCalendar()).rejects.toThrow(
      'GitHub API returned no data',
    );
  }
  response = new Response('not JSON');
  await expect(client.getLanguageStats()).rejects.toThrow();
});

for (const entry of ['contributions', 'languages'] as const) {
  for (const dev of [true, false]) {
    test(`GitHub ${entry} handler returns JSON and ${dev ? 'development' : 'production'} cache policy`, async () => {
      const route = await githubModule(entry, dev);
      route.testEnv.GITHUB_TOKEN = 'handler-token';
      upstream(() =>
        entry === 'contributions' ? calendarResponse() : repositories(),
      );
      const headers: Record<string, string> = {};
      const response = await route.GET({
        setHeaders: (value) => Object.assign(headers, value),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        entry === 'contributions'
          ? calendar
          : { languages: [], totalSize: 0, reposAnalyzed: 0 },
      );
      expect(response.headers.get('content-type')).toContain(
        'application/json',
      );
      expect(headers).toEqual({
        'cache-control': dev ? 'no-store' : 'max-age=1800',
      });
    });
  }

  test(`GitHub ${entry} handler returns 500 JSON without a success cache header for token/HTTP/GraphQL/JSON/network errors`, async () => {
    const route = await githubModule(entry);
    const headers: Record<string, string> = {};
    const event = {
      setHeaders: (value: Record<string, string>) =>
        Object.assign(headers, value),
    };
    let mode = 'token';
    const mock = upstream(() => {
      if (mode === 'network') throw new TypeError('Network unavailable');
      if (mode === 'http') return new Response('Unavailable', { status: 503 });
      if (mode === 'graphql')
        return Response.json({ errors: [{ message: 'GraphQL failed' }] });
      if (mode === 'json') return new Response('bad JSON');
      return Response.json(null);
    });
    let response = await route.GET(event);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'GITHUB_TOKEN is not configured',
    });
    expect(mock).not.toHaveBeenCalled();
    route.testEnv.GITHUB_TOKEN = 'handler-token';
    for (mode of ['http', 'graphql', 'json', 'null', 'network']) {
      response = await route.GET(event);
      expect(response.status).toBe(500);
      expect(typeof (await response.json()).error).toBe('string');
      expect(headers).toEqual({});
    }
  });
}
