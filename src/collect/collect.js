import { isoWeek } from './week.js';
import { parseTrending } from './parse-trending.js';
import { classify } from '../classify/index.js';
import { computeStarsGained } from './delta.js';

const BOARDS = [
  'overall',
  'python',
  'typescript',
  'javascript',
  'rust',
  'go',
  'java',
  'cpp',
  'csharp',
  'php',
  'swift',
];
const MAX = 80;

function addEntry(merged, e, board) {
  const m = merged.get(e.repo) ?? {
    repo: e.repo,
    url: e.url,
    description: e.description,
    language: e.language,
    boards: new Set(),
  };
  if (board) m.boards.add(board);
  merged.set(e.repo, m);
}

// Orchestrates one collection pass. getBoards(board)->html,
// getRepoDetails(repo)->RepoDetails|null, prevProjects (array of {repo, stars}),
// and searchFallback () -> [{repo,url,description,language}] are all injected so
// this stays testable offline. searchFallback runs only when the trending
// boards yield nothing.
export async function collect({
  getBoards,
  getRepoDetails,
  prevProjects = [],
  searchFallback,
} = {}) {
  const merged = new Map();

  let fromTrending = 0;
  for (const board of BOARDS) {
    let html;
    try {
      html = await getBoards(board);
    } catch {
      continue;
    }
    for (const e of parseTrending(html, board)) {
      fromTrending += 1;
      addEntry(merged, e, board);
    }
  }

  let sourceTrending;
  if (fromTrending > 0) {
    sourceTrending = 'ok';
  } else if (searchFallback) {
    let entries = [];
    try {
      entries = (await searchFallback()) ?? [];
    } catch {
      entries = [];
    }
    for (const e of entries) addEntry(merged, e, null);
    sourceTrending = merged.size > 0 ? 'fallback' : 'failed';
  } else {
    sourceTrending = 'failed';
  }

  const ordered = [...merged.values()]
    .sort((a, b) => {
      const aTop = a.boards.has('overall') ? 1 : 0;
      const bTop = b.boards.has('overall') ? 1 : 0;
      if (aTop !== bTop) return bTop - aTop;
      return b.boards.size - a.boards.size;
    })
    .slice(0, MAX);

  let detailsOk = 0;
  let detailsNull = 0;
  const withDetails = [];
  for (const m of ordered) {
    const d = await getRepoDetails(m.repo);
    if (d) detailsOk += 1;
    else detailsNull += 1;
    withDetails.push({
      repo: m.repo,
      url: m.url,
      description: d ? d.description || m.description : m.description ?? '',
      language: d ? d.language ?? m.language ?? null : m.language ?? null,
      stars: d ? d.stars : null,
      forks: d ? d.forks : null,
      topics: d ? d.topics : [],
      boards: [...m.boards],
    });
  }

  const withDomain = withDetails.map((p) => ({
    ...p,
    domain: classify({
      name: p.repo,
      description: p.description ?? '',
      topics: p.topics,
    }),
  }));

  const withGain = computeStarsGained(prevProjects, withDomain).sort((a, b) => {
    const ag = a.starsGained ?? -Infinity;
    const bg = b.starsGained ?? -Infinity;
    if (bg !== ag) return bg - ag;
    return (b.stars ?? -Infinity) - (a.stars ?? -Infinity);
  });

  const projects = withGain.map((p, i) => ({ rank: i + 1, ...p }));

  let sourceApi;
  if (ordered.length === 0) sourceApi = 'failed';
  else if (detailsNull === 0) sourceApi = 'ok';
  else if (detailsOk > 0) sourceApi = 'degraded';
  else sourceApi = 'failed';

  return {
    week: isoWeek(new Date()),
    generatedAt: new Date().toISOString(),
    sources: { trending: sourceTrending, api: sourceApi },
    projects,
  };
}