import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function writeWeek(dir, weekData) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${weekData.week}.json`),
    JSON.stringify(weekData, null, 2),
  );
}

export function writeIndex(dir, weeks) {
  mkdirSync(dir, { recursive: true });
  const sorted = [...weeks].sort();
  writeFileSync(
    join(dir, 'index.json'),
    JSON.stringify({ weeks: sorted, latest: sorted.at(-1) ?? null }, null, 2),
  );
}

export function readPrevWeek(dir, currentWeek) {
  const indexPath = join(dir, 'index.json');
  if (!existsSync(indexPath)) return null;
  const { weeks } = JSON.parse(readFileSync(indexPath, 'utf8'));
  // At collection time the current week is NOT yet indexed, so return the
  // newest existing week strictly older than it (ISO weeks sort lexically).
  const prevWeek = weeks.filter((w) => w < currentWeek).sort().at(-1);
  if (!prevWeek) return null;
  const path = join(dir, `${prevWeek}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}