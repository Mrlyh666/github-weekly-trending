// Pure filter + sort for projects. Runs in Node (tests) and in the browser
// (client bundle) identically; uses no Node builtins.
export function filterProjects(
  projects,
  { languages = [], domains = [], sort = 'gained', query = '' } = {},
) {
  const langs = new Set((languages ?? []).map((l) => l.toLowerCase()));
  const doms = new Set(domains ?? []);
  const q = (query ?? '').trim().toLowerCase();

  const filtered = projects.filter((p) => {
    if (langs.size > 0 && !langs.has((p.language ?? '').toLowerCase())) {
      return false;
    }
    if (doms.size > 0 && !doms.has(p.domain)) return false;
    if (q) {
      const hay = `${p.repo} ${p.description ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const key = sort === 'stars' ? (p) => p.stars ?? -Infinity : (p) => p.starsGained ?? -Infinity;
  return filtered.sort((a, b) => key(b) - key(a));
}