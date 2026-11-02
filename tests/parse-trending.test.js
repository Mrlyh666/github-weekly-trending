import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseTrending } from '../src/collect/parse-trending.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(resolve(here, 'fixtures', f), 'utf8');

test('parseTrending extracts rows from a full trending page', () => {
  const rows = parseTrending(read('trending-overall.html'), 'overall');
  assert.ok(rows.length >= 10, `expected >=10 rows, got ${rows.length}`);
  for (const r of rows) {
    assert.match(r.repo, /^[\w.-]+\/[\w.-]+$/);
    assert.match(r.url, /^https:\/\/github\.com\//);
  }
  assert.equal(rows[0].repo, 'gin-gonic/gin');
  assert.equal(rows[0].url, 'https://github.com/gin-gonic/gin');
  assert.equal(rows[0].language, 'Go');
  assert.match(rows[0].description, /Gin is a HTTP web framework/);
});

test('parseTrending tolerates rows with missing description and language', () => {
  const rows = parseTrending(read('trending-empty-fields.html'), 'overall');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].repo, 'owner/repo');
  assert.equal(rows[0].description, '');
  assert.equal(rows[0].language, undefined);
});