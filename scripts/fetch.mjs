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
const currentWeek = isoWeek(new Date());
const prevWeekData = readPrevWeek(dataDir, currentWeek);
const prevProjects = prevWeekData?.projects ?? [];

const weekData = await collect({
  getBoards,
  getRepoDetails: (repo) => getRepoDetails(repo, token),
  prevProjects,
});

writeWeek(dataDir, weekData);

const weeks = readdirSync(dataDir)
  .filter((f) => /^20\d{2}-W\d{2}\.json$/.test(f))
  .map((f) => f.replace(/\.json$/, ''));
writeIndex(dataDir, [...new Set([...weeks, currentWeek])]);

console.log(`collected ${weekData.week}: ${weekData.projects.length} projects`);