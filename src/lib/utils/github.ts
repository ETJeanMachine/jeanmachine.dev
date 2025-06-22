interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
  repository: string;
}

interface GitHubEvent {
  type: string;
  repo: {
    name: string;
    url: string;
  };
  payload: {
    commits?: Array<{
      sha: string;
      message: string;
      author: {
        name: string;
        email: string;
      };
      url: string;
    }>;
  };
  created_at: string;
}

export async function fetchRecentCommits(
  username: string = "etjeanmachine",
  limit: number = 10,
): Promise<GitHubCommit[]> {
  try {
    const response = await fetch(
      `https://api.github.com/users/${username}/events`,
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const events: GitHubEvent[] = await response.json();

    const commits: GitHubCommit[] = [];

    for (const event of events) {
      if (event.type === "PushEvent" && event.payload.commits) {
        for (const commit of event.payload.commits) {
          commits.push({
            sha: commit.sha,
            message: commit.message,
            author: {
              name: commit.author.name,
              email: commit.author.email,
              date: event.created_at,
            },
            url: commit.url,
            repository: event.repo.name,
          });

          if (commits.length >= limit) {
            return commits;
          }
        }
      }
    }

    return commits;
  } catch (error) {
    console.error("Failed to fetch commits:", error);
    throw error;
  }
}
