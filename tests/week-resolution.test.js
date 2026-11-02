import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery, resolveWeek } from '../src/filter/week-resolution.js';

test('parseQuery returns defaults for an empty search string', () => {
  const q = parseQuery('');
  assert.equal(q.week, null);
  assert.deepEqual(q.languages, []);
  assert.deepEqual(q.domains, []);
  assert.equal(q.sort, 'gained');
  assert.equal(q.query, '');
});

test('parseQuery reads week, lang, domain, sort and query', () => {
  const q = parseQuery('?week=2026-W45&lang=Go,Rust&domain=ai&sort=stars&q=cli');
  assert.equal(q.week, '2026-W45');
  assert.deepEqual(q.languages, ['Go', 'Rust']);
  assert.deepEqual(q.domains, ['ai']);
  assert.equal(q.sort, 'stars');
  assert.equal(q.query, 'cli');
});

test('resolveWeek returns the URL week when it is known', () => {
  assert.equal(
    resolveWeek('2026-W45', ['2026-W44', '2026-W45'], '2026-W45'),
    '2026-W45',
  );
});

test('resolveWeek falls back to latest when the URL week is unknown', () => {
  assert.equal(
    resolveWeek('2026-W99', ['2026-W44', '2026-W45'], '2026-W45'),
    '2026-W45',
  );
});

test('resolveWeek falls back to latest when no URL week is given', () => {
  assert.equal(resolveWeek(null, ['2026-W44', '2026-W45'], '2026-W45'), '2026-W45');
});

test('resolveWeek returns null when there are no weeks at all', () => {
  assert.equal(resolveWeek(null, [], null), null);
});