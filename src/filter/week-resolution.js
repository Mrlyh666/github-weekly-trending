// Pure helpers for reading the URL state and resolving the active week.
// Shared by the browser entry (main.js) and Node tests; no browser globals.

export function parseQuery(search) {
  const p = new URLSearchParams(search);
  return {
    week: p.get('week'),
    languages: (p.get('lang') || '').split(',').filter(Boolean),
    domains: (p.get('domain') || '').split(',').filter(Boolean),
    sort: p.get('sort') === 'stars' ? 'stars' : 'gained',
    query: p.get('q') || '',
  };
}

// Prefer an explicitly requested week; otherwise the newest known week.
export function resolveWeek(urlWeek, weeks, latest) {
  if (urlWeek && weeks.includes(urlWeek)) return urlWeek;
  return latest ?? weeks.at(-1) ?? null;
}