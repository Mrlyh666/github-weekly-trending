import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStarsGained } from '../src/collect/delta.js';

test('computes the gain when a repo exists in both weeks', () => {
  const prev = [{ repo: 'a/b', stars: 10 }];
  const current = [{ repo: 'a/b', stars: 13 }];
  const [out] = computeStarsGained(prev, current);
  assert.equal(out.stars, 13);
  assert.equal(out.starsGained, 3);
});

test('marks a first-seen repo with null gain', () => {
  const prev = [{ repo: 'a/b', stars: 10 }];
  const current = [{ repo: 'c/d', stars: 5 }];
  assert.equal(computeStarsGained(prev, current)[0].starsGained, null);
});

test('returns null gain for all when the previous week is empty', () => {
  const current = [
    { repo: 'a/b', stars: 10 },
    { repo: 'c/d', stars: 2 },
  ];
  const out = computeStarsGained([], current);
  assert.deepEqual(
    out.map((p) => p.starsGained),
    [null, null],
  );
});

test('does not mutate its inputs', () => {
  const prev = [{ repo: 'a/b', stars: 10 }];
  const current = [{ repo: 'a/b', stars: 13 }];
  computeStarsGained(prev, current);
  assert.equal('starsGained' in current[0], false);
});