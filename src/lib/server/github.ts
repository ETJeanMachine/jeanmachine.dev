import {
  GITHUB_EXCLUDED_LANGUAGES,
  GITHUB_EXCLUDED_REPOS,
} from '$lib/constants';
import { env } from '$env/dynamic/private';

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

export interface ContributionDay {
  date: string;
  contributionCount: number;
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

export interface LanguageStat {
  name: string;
  size: number;
  color: string | null;
  percent: number;
}

export interface LanguageStats {
  languages: LanguageStat[];
  totalSize: number;
  reposAnalyzed: number;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

async function githubGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const token = env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is not configured');
  }
  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`);
  }
  const payload: GraphQLResponse<T> = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }
  if (!payload.data) {
    throw new Error('GitHub API returned no data');
  }
  return payload.data;
}

export async function getContributionCalendar(): Promise<ContributionCalendar> {
  const to = new Date();
  const from = new Date(to);
  from.setFullYear(from.getFullYear() - 1);

  const data = await githubGraphQL<{
    viewer: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: ContributionWeek[];
        };
      };
    };
  }>(
    `
    query($from: DateTime!, $to: DateTime!) {
      viewer {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `,
    { from: from.toISOString(), to: to.toISOString() },
  );

  return data.viewer.contributionsCollection.contributionCalendar;
}

export async function getLanguageStats(): Promise<LanguageStats> {
  const excludedRepos = new Set(
    GITHUB_EXCLUDED_REPOS.map((repo) => repo.toLowerCase()),
  );
  const excludedLanguages = new Set(
    GITHUB_EXCLUDED_LANGUAGES.map((lang) => lang.toLowerCase()),
  );
  const query = `
    query($cursor: String) {
      viewer {
        repositories(
          first: 100
          after: $cursor
          ownerAffiliations: [OWNER]
          isFork: false
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            name
            nameWithOwner
            languages(first: 100, orderBy: { field: SIZE, direction: DESC }) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
          }
        }
      }
    }
  `;

  interface RepoNode {
    name: string;
    nameWithOwner: string;
    languages: {
      edges: { size: number; node: { name: string; color: string | null } }[];
    };
  }

  const sizes = new Map<string, { size: number; color: string | null }>();
  let reposAnalyzed = 0;
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await githubGraphQL<{
      viewer: {
        repositories: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: RepoNode[];
        };
      };
    }>(query, { cursor });

    const repositories = data.viewer.repositories;
    for (const repo of repositories.nodes) {
      if (
        excludedRepos.has(repo.name.toLowerCase()) ||
        excludedRepos.has(repo.nameWithOwner.toLowerCase())
      ) {
        continue;
      }
      reposAnalyzed += 1;
      for (const edge of repo.languages.edges) {
        if (excludedLanguages.has(edge.node.name.toLowerCase())) {
          continue;
        }
        const entry = sizes.get(edge.node.name) ?? {
          size: 0,
          color: edge.node.color,
        };
        entry.size += edge.size;
        if (edge.node.color) entry.color = edge.node.color;
        sizes.set(edge.node.name, entry);
      }
    }

    hasNextPage = repositories.pageInfo.hasNextPage;
    cursor = repositories.pageInfo.endCursor;
  }

  const totalSize = [...sizes.values()].reduce(
    (sum, lang) => sum + lang.size,
    0,
  );
  const languages: LanguageStat[] = [...sizes.entries()]
    .map(([name, { size, color }]) => ({
      name,
      size,
      color,
      percent: totalSize > 0 ? (size / totalSize) * 100 : 0,
    }))
    .sort((a, b) => b.size - a.size);

  return { languages, totalSize, reposAnalyzed };
}
