import { filterProjects } from './src/filter/index.js';
import { parseQuery, resolveWeek } from './src/filter/week-resolution.js';

const DOMAIN_LABELS = {
  ai: 'AI/大模型',
  frontend: '前端',
  backend: '后端',
  infra: '基础设施',
  db: '数据库',
  devtools: '开发工具',
  mobile: '移动端',
  security: '安全',
  devops: 'DevOps',
  data: '数据/可视化',
  lang: '语言/运行时',
  other: '其他',
};

const state = {
  weeks: [],
  currentWeek: null,
  weekData: null,
  languages: [],
  domains: [],
  sort: 'gained',
  query: '',
};

function fmt(n) {
  if (n == null) return '—';
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function writeStateToUrl() {
  const p = new URLSearchParams();
  if (state.currentWeek) p.set('week', state.currentWeek);
  if (state.languages.length) p.set('lang', state.languages.join(','));
  if (state.domains.length) p.set('domain', state.domains.join(','));
  if (state.sort === 'stars') p.set('sort', 'stars');
  if (state.query) p.set('q', state.query);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function toggle(arr, v) {
  const i = arr.indexOf(v);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(v);
}

function distinct(arr) {
  return [...new Set(arr.filter((x) => x != null && x !== ''))].sort();
}

function renderChips(containerId, items, selected, onToggle) {
  const c = document.getElementById(containerId);
  c.innerHTML = '';
  for (const { value, label } of items) {
    const b = document.createElement('button');
    b.className = 'chip' + (selected.includes(value) ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      onToggle(value);
      writeStateToUrl();
      renderFilters();
      renderList();
    });
    c.appendChild(b);
  }
}

function renderWeekSelector() {
  const sel = document.getElementById('week-select');
  sel.innerHTML = '';
  for (const w of [...state.weeks].sort().reverse()) {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = w;
    if (w === state.currentWeek) opt.selected = true;
    sel.appendChild(opt);
  }
  if (state.weekData?.generatedAt) {
    document.getElementById('updated-at').textContent =
      `更新于 ${state.weekData.generatedAt.slice(0, 10)}`;
  } else {
    document.getElementById('updated-at').textContent = '';
  }
}

function renderFilters() {
  const projects = state.weekData?.projects ?? [];
  const languages = distinct(projects.map((p) => p.language)).map((v) => ({
    value: v,
    label: v,
  }));
  renderChips('lang-chips', languages, state.languages, (v) => toggle(state.languages, v));

  const domains = distinct(projects.map((p) => p.domain)).map((v) => ({
    value: v,
    label: DOMAIN_LABELS[v] || v,
  }));
  renderChips('domain-chips', domains, state.domains, (v) => toggle(state.domains, v));

  document.querySelectorAll('#sort-toggle .chip').forEach((b) => {
    b.classList.toggle('active', b.dataset.sort === state.sort);
  });

  document.getElementById('query').value = state.query;
}

function sectionHeader(title) {
  const h = document.createElement('h2');
  h.className = 'section-title';
  h.textContent = title;
  return h;
}

function card(p) {
  const article = document.createElement('article');
  article.className = 'card';

  const top = document.createElement('div');
  top.className = 'card-top';

  const rank = document.createElement('span');
  rank.className = 'rank';
  rank.textContent = `#${p.rank}`;

  const repo = document.createElement('a');
  repo.className = 'repo';
  repo.href = p.url;
  repo.target = '_blank';
  repo.rel = 'noopener';
  repo.textContent = p.repo;

  const lang = document.createElement('span');
  lang.className = 'lang';
  lang.textContent = p.language ?? '';

  top.append(rank, repo, lang);

  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = p.description || '';
  desc.hidden = !p.description;

  const meta = document.createElement('div');
  meta.className = 'meta';

  const gain = document.createElement('span');
  gain.className = 'gain';
  gain.textContent = p.starsGained == null ? '首周收录' : `+${fmt(p.starsGained)} ⭐`;

  const stars = document.createElement('span');
  stars.className = 'stars';
  stars.textContent = `总 ⭐ ${fmt(p.stars)}`;

  meta.append(gain, stars);

  article.append(top, desc, meta);
  return article;
}

function renderList() {
  const list = document.getElementById('list');
  const empty = document.getElementById('empty');
  list.innerHTML = '';

  if (!state.weekData || state.weekData.projects.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const projects = filterProjects(state.weekData.projects, {
    languages: state.languages,
    domains: state.domains,
    sort: state.sort,
    query: state.query,
  });

  if (projects.length === 0) {
    const el = document.createElement('p');
    el.className = 'no-match';
    el.textContent = '没有符合筛选条件的项目';
    list.appendChild(el);
    return;
  }

  if (state.domains.length === 0) {
    const groups = new Map();
    for (const p of projects) {
      if (!groups.has(p.domain)) groups.set(p.domain, []);
      groups.get(p.domain).push(p);
    }
    const order = [...groups.keys()].sort(
      (a, b) => (a === 'other') - (b === 'other'),
    );
    for (const domain of order) {
      list.appendChild(sectionHeader(DOMAIN_LABELS[domain] || domain));
      for (const p of groups.get(domain)) list.appendChild(card(p));
    }
  } else {
    for (const p of projects) list.appendChild(card(p));
  }
}

function renderSources() {
  const el = document.getElementById('sources');
  if (!el) return;
  if (!state.weekData) {
    el.textContent = '';
    return;
  }
  const t = state.weekData.sources?.trending;
  const a = state.weekData.sources?.api;
  const notes = [];
  if (t === 'fallback') notes.push('榜单来自 Search API 回退');
  else if (t === 'failed') notes.push('榜单抓取失败');
  if (a === 'degraded') notes.push('部分仓库详情缺失');
  else if (a === 'failed') notes.push('仓库详情不可用');
  el.textContent = notes.length ? ` · ${notes.join('；')}` : '';
}

async function init() {
  for (const b of document.querySelectorAll('#sort-toggle .chip')) {
    b.addEventListener('click', () => {
      state.sort = b.dataset.sort === 'stars' ? 'stars' : 'gained';
      writeStateToUrl();
      renderFilters();
      renderList();
    });
  }
  document.getElementById('query').addEventListener('input', (e) => {
    state.query = e.target.value.trim();
    writeStateToUrl();
    renderList();
  });
  document.getElementById('week-select').addEventListener('change', (e) => {
    state.currentWeek = e.target.value;
    writeStateToUrl();
    load();
  });

  await load();
}

async function load() {
  state.weekData = null;
  renderWeekSelector();
  renderFilters();
  renderList();
  renderSources();

  const res = await fetch(`./data/weeks/${state.currentWeek}.json`);
  state.weekData = res.ok ? await res.json() : null;

  renderWeekSelector();
  renderFilters();
  renderList();
  renderSources();
}

const query = parseQuery(location.search);
state.languages = query.languages;
state.domains = query.domains;
state.sort = query.sort;
state.query = query.query;

fetch('./data/weeks/index.json')
  .then((r) => r.json())
  .then((index) => {
    state.weeks = index.weeks ?? [];
    state.currentWeek = resolveWeek(query.week, state.weeks, index.latest);
    init();
  })
  .catch(() => init());