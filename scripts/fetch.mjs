import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from '../src/collect/collect.js';
import { getRepoDetails } from '../src/collect/github.js';
import { readPrevWeek, writeWeek, writeIndex } from '../src/collect/store.js';
import { isoWeek } from '../src/collect/week.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'data', 'weeks');

async function getBoards(board) {
  const path = board === 'overall' ? '' : `/${board}`;
  const res = await fetch(`https://github.com/trending${path}?since=weekly`, {
    headers: { 'User-Agent': 'github-weekly-trending' },
  });
  if (!res.ok) throw new Error(`trending ${board}: ${res.status}`);
  return res.text();
}

const token = process.env.GITHUB_TOKEN;

// Fallback sourced from the Search API (see spec §11): repositories created in
// the last 7 days, by stars. Returns trending-shaped entries.
async function searchFallback() {
  const headers = { 'User-Agent': 'github-weekly-trending' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const q = `created:>${since}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=30`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.items ?? []).map((it) => ({
    repo: it.full_name,
    url: it.html_url,
    description: it.description ?? '',
    language: it.language ?? null,
  }));
}
const currentWeek = isoWeek(new Date());
const prevWeekData = readPrevWeek(dataDir, currentWeek);
const prevProjects = prevWeekData?.projects ?? [];

const weekData = await collect({
  getBoards,
  getRepoDetails: (repo) => getRepoDetails(repo, token),
  prevProjects,
  searchFallback,
});

if (weekData.projects.length === 0) {
  console.error('collection produced zero projects; aborting with non-zero exit');
  process.exit(1);
}

writeWeek(dataDir, weekData);

const weeks = readdirSync(dataDir)
  .filter((f) => /^20\d{2}-W\d{2}\.json$/.test(f))
  .map((f) => f.replace(/\.json$/, ''));
writeIndex(dataDir, [...new Set([...weeks, currentWeek])]);

console.log(`collected ${weekData.week}: ${weekData.projects.length} projects`);