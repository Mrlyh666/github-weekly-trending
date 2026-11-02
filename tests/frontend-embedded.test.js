import { test } from 'node:test';
import assert from 'node:assert/strict';

// Same minimal DOM stub as frontend-boot.test.js, but with an embedded boot
// payload: main.js must render from it without touching the network at all.

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

const bootEl = new El('script');
bootEl.textContent = JSON.stringify({
  index: { weeks: ['2026-W45'], latest: '2026-W45' },
  week: {
    week: '2026-W45',
    generatedAt: '2026-11-02T00:00:00Z',
    sources: { trending: 'ok', api: 'ok' },
    projects: [
      { rank: 1, repo: 'a/one', url: 'https://github.com/a/one', description: 'AI', language: 'Go', stars: 10, starsGained: 5, forks: 1, topics: [], domain: 'ai', boards: ['overall'] },
      { rank: 2, repo: 'b/two', url: 'https://github.com/b/two', description: 'web', language: 'Rust', stars: 9, starsGained: null, forks: 1, topics: [], domain: 'frontend', boards: ['overall'] },
    ],
  },
});
byId['boot-data'] = bootEl;

globalThis.document = {
  getElementById: (id) => (byId[id] ??= new El('div')),
  createElement: (tag) => new El(tag),
  querySelectorAll: (sel) => (sel === '#sort-toggle .chip' ? sortChips : []),
};
globalThis.location = { search: '', pathname: '/github-weekly-trending/' };
globalThis.history = { replaceState() {} };

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls++;
  throw new Error('network must not be used when boot data is embedded');
};

function walk(el, out = []) {
  out.push(el);
  for (const c of el.children) walk(c, out);
  return out;
}

test('renders straight from embedded boot data with zero fetches', async () => {
  await import('../main.js');
  await new Promise((r) => setTimeout(r, 20));

  const nodes = walk(byId['list']);
  const cards = nodes.filter((n) => n.className === 'card');
  const headers = nodes.filter((n) => n.className === 'section-title');

  assert.equal(fetchCalls, 0);
  assert.equal(cards.length, 2);
  assert.equal(headers.length, 2);
  assert.equal(byId['empty'].hidden, true);
  assert.equal(byId['week-select'].children[0].value, '2026-W45');
});