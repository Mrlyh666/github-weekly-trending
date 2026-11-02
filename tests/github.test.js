import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRepoDetails } from '../src/collect/github.js';

test('getRepoDetails maps API fields', async () => {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        stargazers_count: 100,
        forks_count: 5,
        topics: ['a'],
        description: 'd',
        language: 'Rust',
      }),
    };
  };
  const d = await getRepoDetails('octo/repo');
  assert.deepEqual(d, {
    repo: 'octo/repo',
    stars: 100,
    forks: 5,
    topics: ['a'],
    description: 'd',
    language: 'Rust',
  });
  assert.equal(calls[0].url, 'https://api.github.com/repos/octo/repo');
  assert.equal(calls[0].opts.headers.Accept, 'application/vnd.github+json');
});

test('getRepoDetails sends a bearer token when provided', async () => {
  let headers;
  globalThis.fetch = async (url, opts) => {
    headers = opts.headers;
    return { ok: true, json: async () => ({}) };
  };
  await getRepoDetails('octo/repo', 'TOKEN');
  assert.equal(headers.Authorization, 'Bearer TOKEN');
});

test('getRepoDetails returns null on 404', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  assert.equal(await getRepoDetails('octo/repo'), null);
});

test('getRepoDetails returns null when the JSON body is unparseable', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new Error('invalid JSON');
    },
  });
  assert.equal(await getRepoDetails('octo/repo'), null);
});

test('getRepoDetails returns null on network error', async () => {
  globalThis.fetch = async () => {
    throw new Error('ECONNRESET');
  };
  assert.equal(await getRepoDetails('octo/repo'), null);
});