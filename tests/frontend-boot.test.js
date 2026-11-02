import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal DOM stub: enough surface for main.js to boot and render without a
// browser. This reproduces the real init flow (fetch index -> resolve week ->
// fetch week -> render list) so a boot regression like "currentWeek is null"
// fails here instead of only on the deployed site.

class El {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this._text = '';
    this.className = '';
    this.hidden = false;
    this.value = '';
    this.dataset = {};
    this.listeners = {};
    this.classList = { toggle() {}, add() {}, contains: () => false };
  }
  get textContent() {
    return this._text;
  }
  set textContent(v) {
    this._text = String(v);
  }
  set innerHTML(v) {
    if (v === '') this.children = [];
  }
  appendChild(c) {
    this.children.push(c);
    return c;
  }
  append(...cs) {
    for (const c of cs) this.children.push(c);
  }
  addEventListener(type, fn) {
    (this.listeners[type] ??= []).push(fn);
  }
}

const byId = {};
const sortChips = [];
{
  const t = new El('div');
  for (const s of ['gained', 'stars']) {
    const b = new El('button');
    b.dataset.sort = s;
    sortChips.push(b);
    t.appendChild(b);
  }
  byId['sort-toggle'] = t;
}

globalThis.document = {
  getElementById: (id) => (byId[id] ??= new El('div')),
  createElement: (tag) => new El(tag),
  querySelectorAll: (sel) => (sel === '#sort-toggle .chip' ? sortChips : []),
};
globalThis.location = { search: '', pathname: '/github-weekly-trending/' };
globalThis.history = { replaceState() {} };

const DATA = {
  './data/weeks/index.json': { weeks: ['2026-W45'], latest: '2026-W45' },
  './data/weeks/2026-W45.json': {
    week: '2026-W45',
    generatedAt: '2026-11-02T00:00:00Z',
    sources: { trending: 'ok', api: 'ok' },
    projects: [
      { rank: 1, repo: 'a/one', url: 'https://github.com/a/one', description: 'An AI tool', language: 'Go', stars: 100, starsGained: 10, forks: 1, topics: ['llm'], domain: 'ai', boards: ['overall'] },
      { rank: 2, repo: 'b/two', url: 'https://github.com/b/two', description: 'A web thing', language: 'Rust', stars: 50, starsGained: null, forks: 1, topics: [], domain: 'frontend', boards: ['overall', 'rust'] },
      { rank: 3, repo: 'c/three', url: 'https://github.com/c/three', description: 'DB', language: 'Go', stars: 30, starsGained: 5, forks: 1, topics: ['database'], domain: 'ai', boards: ['go'] },
    ],
  },
};

globalThis.fetch = async (url) => ({
  ok: !!DATA[url],
  json: async () => DATA[url],
});

function walk(el, out = []) {
  out.push(el);
  for (const c of el.children) walk(c, out);
  return out;
}

test('main.js boots with no query string and renders every project', async () => {
  await import('../main.js');
  await new Promise((r) => setTimeout(r, 100));

  const list = byId['list'];
  const nodes = walk(list);
  const cards = nodes.filter((n) => n.className === 'card');
  const headers = nodes.filter((n) => n.className === 'section-title');

  assert.equal(cards.length, 3);
  assert.equal(headers.length, 2); // ai, frontend
  assert.equal(byId['empty'].hidden, true);

  // ...and it really is the resolved week, not a null fetch.
  assert.equal(byId['week-select'].children.length, 1);
  assert.equal(byId['week-select'].children[0].value, '2026-W45');
});