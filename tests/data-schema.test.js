import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const weeksDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'weeks');

test('index.json exposes weeks and latest', () => {
  const index = JSON.parse(readFileSync(join(weeksDir, 'index.json'), 'utf8'));
  assert.ok(Array.isArray(index.weeks));
  assert.ok(typeof index.latest === 'string' || index.latest === null);
});

test('every week file matches the project schema', () => {
  const files = readdirSync(weeksDir).filter(
    (f) => f.endsWith('.json') && f !== 'index.json',
  );
  const required = ['repo', 'url', 'description', 'language', 'stars', 'starsGained', 'forks', 'topics', 'domain', 'boards', 'rank'];
  for (const f of files) {
    const week = JSON.parse(readFileSync(join(weeksDir, f), 'utf8'));
    assert.match(week.week, /^20\d{2}-W\d{2}$/);
    assert.ok(Array.isArray(week.projects), `${f}: projects must be an array`);
    for (const p of week.projects) {
      for (const k of required) assert.ok(k in p, `${f}/${p.repo}: missing ${k}`);
      assert.ok(Array.isArray(p.topics), `${f}/${p.repo}: topics array`);
      assert.ok(Array.isArray(p.boards), `${f}/${p.repo}: boards array`);
      assert.equal(typeof p.rank, 'number', `${f}/${p.repo}: rank number`);
    }
  }
});