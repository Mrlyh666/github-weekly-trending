// Fetch a single repository's details from the GitHub REST API.
// Returns null when the repo is not found, the request is rate-limited, or the
// network fails — the collector turns null into a stub instead of aborting.
export async function getRepoDetails(repo, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'github-weekly-trending',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let j;
  try {
    j = await res.json();
  } catch {
    return null;
  }
  return {
    repo,
    stars: j.stargazers_count ?? null,
    forks: j.forks_count ?? null,
    topics: j.topics ?? [],
    description: j.description ?? '',
    language: j.language ?? null,
  };
}