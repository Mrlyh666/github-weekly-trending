import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { collect } from '../src/collect/collect.js';

const here = dirname(fileURLToPath(import.meta.url));
const overallHtml = readFileSync(
  resolve(here, 'fixtures', 'trending-overall.html'),
  'utf8',
);
const pythonHtml =
  '<article class="Box-row"><h2 class="h3 lh-condensed"><a href="/pallets/flask">pallets / <span class="text-normal">flask</span></a></h2><p class="col-9">The Python micro framework.</p><div><span itemprop="programmingLanguage">Python</span></div></article>';

function makeFakes() {
  const details = {
    'gin-gonic/gin': { repo: 'gin-gonic/gin', stars: 83010, forks: 100, topics: ['web-framework'], description: 'Gin web framework', language: 'Go' },
    'pallets/flask': { repo: 'pallets/flask', stars: 72000, forks: 100, topics: ['web', 'framework'], description: 'Flask', language: 'Python' },
    'denoland/deno': { repo: 'denoland/deno', stars: 92700, forks: 100, topics: ['runtime'], description: 'Deno', language: 'Rust' },
    // zlib-searcher deliberately omitted -> getRepoDetails returns null.
    'microsoft/typescript': { repo: 'microsoft/typescript', stars: 100000, forks: 100, topics: ['language'], description: 'TS', language: 'TypeScript' },
    'compose-spec/compose-spec': { repo: 'compose-spec/compose-spec', stars: 5200, forks: 100, topics: ['spec'], description: 'Compose spec', language: 'Shell' },
    'keycloak/keycloak': { repo: 'keycloak/keycloak', stars: 22100, forks: 100, topics: ['security'], description: 'IAM', language: 'Java' },
    'kubernetes/kubernetes': { repo: 'kubernetes/kubernetes', stars: 110000, forks: 100, topics: ['kubernetes'], description: 'K8s', language: 'Go' },
    'zed-industries/zed': { repo: 'zed-industries/zed', stars: 41900, forks: 100, topics: ['editor'], description: 'Zed', language: 'Rust' },
    'microsoft/vscode': { repo: 'microsoft/vscode', stars: 160000, forks: 100, topics: ['editor'], description: 'VSCode', language: 'TypeScript' },
  };
  const getBoards = async (board) => {
    if (board === 'overall') return overallHtml;
    if (board === 'python') return pythonHtml;
    return '';
  };
  const getRepoDetails = async (repo) => details[repo] ?? null;
  return { getBoards, getRepoDetails };
}

test('collect dedupes, classifies, computes gain and ranks', async () => {
  const { getBoards, getRepoDetails } = makeFakes();
  const prev = [{ repo: 'gin-gonic/gin', stars: 80010 }];
  const result = await collect({ getBoards, getRepoDetails, prevProjects: prev });

  assert.match(result.week, /^2026-W\d{2}$/);
  assert.equal(result.sources.trending, 'ok');
  assert.equal(result.projects.length, 10);

  const repos = result.projects.map((p) => p.repo);
  assert.equal(new Set(repos).size, 10);
  assert.deepEqual(
    result.projects.map((p) => p.rank),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );

  const flask = result.projects.find((p) => p.repo === 'pallets/flask');
  assert.ok(flask.boards.includes('overall'));
  assert.ok(flask.boards.includes('python'));

  const gin = result.projects[0];
  assert.equal(gin.repo, 'gin-gonic/gin');
  assert.equal(gin.starsGained, 3000);
  assert.equal(gin.rank, 1);

  const zlib = result.projects.find(
    (p) => p.repo === 'zlib-searcher/zlib-searcher',
  );
  assert.equal(zlib.stars, null);
  assert.equal(zlib.forks, null);
  assert.deepEqual(zlib.topics, []);
  assert.match(zlib.url, /^https:\/\/github\.com\//);

  for (const p of result.projects) {
    assert.equal(typeof p.domain, 'string');
    assert.ok(p.domain.length > 0);
  }
});