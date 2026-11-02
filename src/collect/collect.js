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

// Orchestrates one collection pass. getBoards(board)->html and
// getRepoDetails(repo)->RepoDetails|null are injected so this stays testable
// offline; prevProjects (array of {repo, stars}) supplies the previous
// snapshot for the gain calculation.
export async function collect({ getBoards, getRepoDetails, prevProjects = [] }) {
  const merged = new Map();
  for (const board of BOARDS) {
    let html;
    try {
      html = await getBoards(board);
    } catch {
      continue;
    }
    for (const e of parseTrending(html, board)) {
      const m = merged.get(e.repo) ?? {
        repo: e.repo,
        url: e.url,
        description: e.description,
        language: e.language,
        boards: new Set(),
      };
      m.boards.add(board);
      merged.set(e.repo, m);
    }
  }

  const ordered = [...merged.values()]
    .sort((a, b) => {
      const aTop = a.boards.has('overall') ? 1 : 0;
      const bTop = b.boards.has('overall') ? 1 : 0;
      if (aTop !== bTop) return bTop - aTop;
      return b.boards.size - a.boards.size;
    })
    .slice(0, MAX);

  const withDetails = [];
  for (const m of ordered) {
    const d = await getRepoDetails(m.repo);
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

  return {
    week: isoWeek(new Date()),
    generatedAt: new Date().toISOString(),
    sources: { trending: projects.length > 0 ? 'ok' : 'fallback', api: 'ok' },
    projects,
  };
}