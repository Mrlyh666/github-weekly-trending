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
  const idx = weeks.indexOf(currentWeek);
  if (idx <= 0) return null;
  const prevWeek = weeks[idx - 1];
  const path = join(dir, `${prevWeek}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}