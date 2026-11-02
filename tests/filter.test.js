import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterProjects } from '../src/filter/index.js';

const projects = [
  { repo: 'a/one', description: 'A Rust CLI tool', language: 'Rust', domain: 'devtools', stars: 100, starsGained: 10 },
  { repo: 'b/two', description: 'A Python web framework', language: 'Python', domain: 'backend', stars: 500, starsGained: null },
  { repo: 'c/three', description: 'A Rust web app', language: 'Rust', domain: 'frontend', stars: 300, starsGained: 30 },
];

test('filters by language, case-insensitive', () => {
  const out = filterProjects(projects, { languages: ['rust'] });
  assert.deepEqual(
    out.map((p) => p.repo).sort(),
    ['a/one', 'c/three'].sort(),
  );
});

test('filters by domain', () => {
  const out = filterProjects(projects, { domains: ['frontend'] });
  assert.deepEqual(out.map((p) => p.repo), ['c/three']);
});

test('combines language and domain filters', () => {
  const out = filterProjects(projects, { languages: ['rust'], domains: ['devtools'] });
  assert.deepEqual(out.map((p) => p.repo), ['a/one']);
});

test('sorts by starsGained descending with null last', () => {
  const out = filterProjects(projects, { sort: 'gained' });
  assert.deepEqual(out.map((p) => p.repo), ['c/three', 'a/one', 'b/two']);
});

test('sorts by stars descending', () => {
  const out = filterProjects(projects, { sort: 'stars' });
  assert.deepEqual(out.map((p) => p.repo), ['b/two', 'c/three', 'a/one']);
});

test('searches name or description case-insensitively', () => {
  const out = filterProjects(projects, { query: 'rust' });
  assert.equal(out.length, 2);
  const repos = new Set(out.map((p) => p.repo));
  assert.ok(repos.has('a/one'));
  assert.ok(repos.has('c/three'));
});

test('returns empty array when nothing matches', () => {
  assert.deepEqual(filterProjects(projects, { languages: ['Go'] }), []);
});

test('returns a new array and never mutates its input', () => {
  const before = JSON.parse(JSON.stringify(projects));
  const out = filterProjects(projects);
  assert.ok(out !== projects);
  assert.deepEqual(projects, before);
});