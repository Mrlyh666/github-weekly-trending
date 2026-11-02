# GitHub 周榜 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个静态网站，每周自动抓取 GitHub（总榜 + 10 个语言分榜），按「语言 × 领域」分类展示本周涨星最快的项目。

**Architecture:** 每周由 GitHub Actions 定时执行一个 Node 采集脚本，抓取 trending 页面与 `/repos` API，计算周增量、确定性分类，把结果写成 `data/weeks/<周>.json` 提交回仓库；Astro 在构建期把这些 JSON 编译进静态页，由 GitHub Pages 托管。所有计算发生在采集期与构建期，前端零服务端逻辑。

**Tech Stack:** Node 20（ESM）、Astro、cheerio、vitest、GitHub Actions + GitHub Pages。

**Spec:** `docs/superpowers/specs/2026-11-02-github-weekly-trending-design.md`

## Global Constraints

- Node 20，纯 ESM（`import`/`export`），无 TypeScript、无 CommonJS。
- 依赖仅限 `astro`、`cheerio`（运行时）+ `vitest`（开发）；HTTP 一律用内置 `fetch`，不引第三方 HTTP 客户端，不引 UI 框架。
- 领域固定 12 类：`ai`、`frontend`、`backend`、`infra`、`db`、`devtools`、`mobile`、`security`、`devops`、`data`、`lang`、`other`。
- 语言分榜固定 10 个：`python`、`typescript`、`javascript`、`rust`、`go`、`java`、`cpp`、`csharp`、`php`、`swift`。
- 采集 = 总榜 + 语言分榜；按 `repo` 去重；总榜优先、再按出现分榜数排序；上限 80 条。
- `starsGained` = 本周 `stars` − 上周同仓库 `stars`；拿不到上周数据时为 `null`。
- 周标识 `YYYY-Www`，ISO 8601 周编号。
- 界面中文；项目描述保留英文原文，不翻译、不概括；不使用任何大模型。
- 数据文件结构见 Spec §8：`data/weeks/<week>.json` 的 `projects[]` 字段为 `repo, url, description, language, stars, starsGained, forks, topics, domain, boards, rank`；另有 `data/weeks/index.json`（`{ weeks: [...], latest }`）。
- 部署 GitHub Pages，仓库公开，定时 `cron: '0 0 * * 1'`（UTC）。
- 采集需读环境变量 `GITHUB_TOKEN`，失败时逐条降级而非整批中断。
- 分类必须确定性、可测试，禁止网络调用与随机数。

## Review Focus

1. **ISO 周跨年边界**：12 月末/1 月初的日期必须归到正确的 ISO 周（如 `2017-01-01` → `2016-W52`、`2021-01-01` → `2020-W53`）。→ Task 2 测试。
2. **trending 行缺字段**：某行没有描述或没有语言时，解析必须产出空字符串/`undefined` 而非抛异常。→ Task 4 测试。
3. **上周数据缺失或仓库首现**：`starsGained` 必须为 `null`，页面显示「首周收录」，不能 crash。→ Task 6、Task 9 测试。
4. **单仓库 API 失败**（404/限流）：该条保留 `repo`/`url`、数值置 `null`，不能中断整批采集。→ Task 5、Task 7 测试。
5. **空周/数据文件缺失**：`projects` 为空或 JSON 文件不存在时，页面显示「本周暂无数据」而非白屏。→ Task 9 测试。

---

## Task 1: 工程脚手架

**Files:**
- Create: `package.json`, `astro.config.mjs`, `vitest.config.js`, `.gitignore`, `src/pages/index.astro`, `src/styles/global.css`
- Test: `tests/smoke.test.js`

**Interfaces:**
- Produces: npm scripts `dev`、`build`、`preview`、`test`、`fetch`；后续所有任务依赖 `npm test` 与 `npm run build` 可运行。

- [ ] **Step 1: 写 `package.json`**

```json
{
  "name": "github-weekly-trending",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "fetch": "node scripts/fetch.mjs"
  },
  "dependencies": { "astro": "^4.15.0", "cheerio": "^1.0.0" },
  "devDependencies": { "vitest": "^2.1.0" }
}
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`
Expected: 退出码 0，`node_modules/` 生成。

- [ ] **Step 3: 写最小 `astro.config.mjs`、`vitest.config.js`、`.gitignore`、占位页与全局样式**

`astro.config.mjs`：默认导出 `{}`（base 配置留到 Task 10）。`vitest.config.js`：`export default { test: { environment: 'node' } }`。`.gitignore`：`node_modules/`、`dist/`、`.astro/`。`src/pages/index.astro` 输出一个 `<h1>GitHub 周榜</h1>`；`src/styles/global.css` 只放深色背景 reset。

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 退出码 0，`dist/index.html` 存在且含 `GitHub 周榜`。

- [ ] **Step 5: 写 smoke 测试并验证**

`tests/smoke.test.js`：`import { describe, it, expect } from 'vitest'`，一个 `1 + 1 === 2` 的断言。
Run: `npm test`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git init -b main
git add -A && git commit -m "chore: scaffold Astro + vitest project"
```

---

## Task 2: ISO 周编号

**Files:**
- Create: `src/collect/week.js`
- Test: `tests/week.test.js`

**Interfaces:**
- Produces: `isoWeek(date: Date) -> string`，如 `'2026-W45'`。

- [ ] **Step 1: 写失败测试**

```js
import { isoWeek } from '../src/collect/week.js';
expect(isoWeek(new Date('2026-11-02'))).toBe('2026-W45');
expect(isoWeek(new Date('2017-01-01'))).toBe('2016-W52'); // 周日归上一年的最后一周
expect(isoWeek(new Date('2021-01-01'))).toBe('2020-W53'); // 周五归上一年第 53 周
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/week.test.js`
Expected: FAIL（`isoWeek` 未定义）。

- [ ] **Step 3: 实现 `isoWeek`**

用标准 ISO 8601 周编号算法（周一为一周起点、含该年第一个周四的周为 W01）。注意 `Date.prototype.getDay()` 的周日=0 与 ISO 的差异，以及年末落入下一年 W01 的情况。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/week.test.js`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/collect/week.js tests/week.test.js
git commit -m "feat: add ISO week number utility"
```

---

## Task 3: 领域分类器

**Files:**
- Create: `src/classify/taxonomy.js`, `src/classify/index.js`
- Test: `tests/classify.test.js`

**Interfaces:**
- Produces: `classify({ name, description, topics }) -> string`（返回 12 个领域键之一）；`TAXONOMY`（供测试与后续迭代使用）。
- Consumes: 无。

- [ ] **Step 1: 写失败测试（表驱动，≥ 20 条，覆盖 12 类 + `other`）**

```js
import { classify } from '../src/classify/index.js';
const cases = [
  [{ name: 'ollama/ollama', description: 'Get up and running with Llama', topics: ['llm', 'local-first'] }, 'ai'],
  [{ name: 'pytorch/pytorch', description: 'Tensors and neural networks', topics: ['deep-learning', 'ml'] }, 'ai'],
  [{ name: 'vercel/next.js', description: 'The React Framework', topics: ['react', 'framework'] }, 'frontend'],
  [{ name: 'tailwindlabs/tailwindcss', description: 'Utility-first CSS framework', topics: ['css', 'tailwind'] }, 'frontend'],
  [{ name: 'fastapi/fastapi', description: 'FastAPI framework', topics: ['python', 'api'] }, 'backend'],
  [{ name: 'grpc/grpc', description: 'A high performance RPC framework', topics: ['rpc', 'microservices'] }, 'backend'],
  [{ name: 'kubernetes/kubernetes', description: 'Production-Grade Container Orchestration', topics: ['kubernetes', 'container-orchestration'] }, 'infra'],
  [{ name: 'envoyproxy/envoy', description: 'Cloud-native proxy', topics: ['proxy', 'edge'] }, 'infra'],
  [{ name: 'postgres/postgres', description: 'PostgreSQL database', topics: ['database', 'sql'] }, 'db'],
  [{ name: 'redis/redis', description: 'In-memory data structure store', topics: ['database', 'in-memory'] }, 'db'],
  [{ name: 'cli/cli', description: "GitHub's official CLI", topics: ['github', 'cli'] }, 'devtools'],
  [{ name: 'microsoft/vscode', description: 'VS Code editor', topics: ['editor', 'vscode'] }, 'devtools'],
  [{ name: 'flutter/flutter', description: 'UI toolkit for mobile', topics: ['flutter', 'mobile'] }, 'mobile'],
  [{ name: 'keycloak/keycloak', description: 'Identity and access management', topics: ['security', 'authentication', 'oidc'] }, 'security'],
  [{ name: 'hashicorp/vault', description: 'Manage secrets and protect sensitive data', topics: ['security', 'secrets'] }, 'security'],
  [{ name: 'prometheus/prometheus', description: 'Monitoring system and time series database', topics: ['monitoring', 'observability'] }, 'devops'],
  [{ name: 'apache/spark', description: 'Unified engine for large-scale data', topics: ['big-data', 'analytics'] }, 'data'],
  [{ name: 'v8/v8', description: 'The JavaScript engine', topics: ['javascript', 'runtime', 'compiler'] }, 'lang'],
  [{ name: 'rust-lang/rust', description: 'The Rust language', topics: ['rust', 'language', 'compiler'] }, 'lang'],
  [{ name: 'example/mystery', description: 'nothing matches anything here', topics: ['foo'] }, 'other'],
];
for (const [input, expected] of cases) expect(classify(input)).toBe(expected);
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/classify.test.js`
Expected: FAIL（`classify` 未定义）。

- [ ] **Step 3: 实现 `classify` 与 `TAXONOMY`**

`taxonomy.js` 导出一个**按优先级有序**的数组，每项 `{ domain, keywords }`；`index.js` 把 `topics.join(' ') + ' ' + description.toLowerCase() + ' ' + name.toLowerCase()` 拼成一段文本，按数组顺序匹配（子串包含即可，topics 本就是 token），首个命中即返回该 `domain`；无命中返回 `'other'`。排序原则：更具体的领域在前——顺序必须是 `ai`、`security`、`db`、`mobile`、`frontend`、`backend`、`devops`、`data`、`infra`、`devtools`、`lang`（`other` 为兜底不下发关键词）。

首版关键词草案（可调，但必须让 Step 1 全部通过）：
- `ai`: llm, gpt, openai, anthropic, machine-learning, deep-learning, neural-network, ml, inference, diffusion, transformer, rag, embeddings, pytorch, tensorflow
- `security`: security, ctf, penetration, encryption, cryptography, vulnerability, exploit, authentication, oauth, oidc, password, secrets, xss, 2fa
- `db`: database, postgres, mysql, sqlite, redis, sql, mongodb, vector-database, olap, duckdb, storage, in-memory
- `mobile`: android, ios, flutter, react-native, swift, kotlin, mobile
- `frontend`: react, vue, nextjs, svelte, css, tailwind, ui, component, frontend, browser, design-system, animation
- `backend`: api, server, backend, rest, graphql, http, framework, microservices, rpc, grpc, nestjs, express, fastapi, django, rails, spring
- `devops`: kubernetes, docker, ci-cd, cicd, observability, monitoring, prometheus, grafana, terraform, iac, sre, deployment
- `data`: 'data-visualization', visualization, dashboard, analytics, etl, big-data, spark, pandas, dataframe, data-science, notebook, chart
- `infra`: 'cloud-native', container, orchestration, serverless, edge, distributed, proxy, gateway, mesh, scheduler, 'message-queue'
- `devtools`: cli, developer-tools, tooling, editor, vscode, ide, linter, formatter, debugger, build-tool, bundler, terminal, git, sdk
- `lang`: compiler, interpreter, runtime, language, programming-language, parser, type-system, virtual-machine, jit, stdlib

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/classify.test.js`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/classify tests/classify.test.js
git commit -m "feat: add deterministic domain classifier"
```

---

## Task 4: trending 页面解析

**Files:**
- Create: `src/collect/parse-trending.js`
- Test: `tests/parse-trending.test.js`, `tests/fixtures/trending-overall.html`, `tests/fixtures/trending-empty-fields.html`

**Interfaces:**
- Produces: `parseTrending(html: string, board: string) -> Array<{ repo: string, url: string, description: string, language?: string }>`；`repo` 形如 `'owner/name'`（不含 `https://github.com/` 前缀），`url` 为完整 `https://github.com/owner/name`。

- [ ] **Step 1: 存一份真实快照作 fixture**

Run: `curl.exe -sL https://github.com/trending?since=weekly -o tests/fixtures/trending-overall.html`
Expected: 文件 > 50 KB（含多个 `<article class="Box-row">`）。

- [ ] **Step 2: 手写一个「字段缺失」的合成 fixture**

`tests/fixtures/trending-empty-fields.html` 只放一个最小 `article`：有 `h2 > a[href="/owner/repo"]`，但没有描述 `<p>`，也没有 `[itemprop="programmingLanguage"]`。

- [ ] **Step 3: 写失败测试**

```js
import { parseTrending } from '../src/collect/parse-trending.js';
const html = readFile('fixtures/trending-overall.html');
const rows = parseTrending(html, 'overall');
expect(rows.length).toBeGreaterThanOrEqual(10);
expect(rows[0].repo).toMatch(/^[\w.-]+\/[\w.-]+$/);
expect(rows[0].url).toMatch(/^https:\/\/github\.com\//);
const empty = parseTrending(readFile('fixtures/trending-empty-fields.html'), 'overall');
expect(empty[0].description).toBe('');
expect(empty[0].language).toBeUndefined();
```

- [ ] **Step 4: 运行确认失败**

Run: `npx vitest run tests/parse-trending.test.js`
Expected: FAIL。

- [ ] **Step 5: 实现 `parseTrending`**

用 `cheerio.load(html)` 遍历 `article.Box-row`：`repo`/`url` 取自 `h2 a[href]` 的 `href`（剥掉前导 `/` 作为 repo，拼 `https://github.com` 作 url）；描述取行内 `<p>` 文本（trim，无则 `''`）；语言取 `[itemprop="programmingLanguage"]` 文本（无则省略字段）。第二参数 `board` 原样透传但此函数不写入结果——由 Task 7 的 `collect` 使用。

- [ ] **Step 6: 运行确认通过**

Run: `npx vitest run tests/parse-trending.test.js`
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add src/collect/parse-trending.js tests/parse-trending.test.js tests/fixtures
git commit -m "feat: parse GitHub trending HTML"
```

---

## Task 5: 仓库详情获取

**Files:**
- Create: `src/collect/github.js`
- Test: `tests/github.test.js`

**Interfaces:**
- Produces: `getRepoDetails(repo: string, token?: string) -> Promise<RepoDetails | null>`，其中 `RepoDetails = { repo, stars: number, forks: number, topics: string[], description: string, language: string | null }`。404、网络失败、非 2xx 返回 `null`。

- [ ] **Step 1: 写失败测试（mock `fetch`）**

```js
import { getRepoDetails } from '../src/collect/github.js';
// ok 分支：stubGlobal fetch 返回 { ok:true, json: async () => ({ stargazers_count: 100, forks_count: 5, topics:['a'], description:'d', language:'Rust' }) }
const d = await getRepoDetails('octo/repo');
expect(d).toMatchObject({ repo:'octo/repo', stars:100, forks:5, topics:['a'], description:'d', language:'Rust' });
// 带 token：断言 fetch 第二参数 headers.Authorization === 'Bearer TOKEN'
// 失败分支：fetch 返回 { ok:false, status:404 } → expect(await getRepoDetails('octo/repo')).toBeNull()
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/github.test.js`
Expected: FAIL。

- [ ] **Step 3: 实现 `getRepoDetails`**

`fetch(\`https://api.github.com/repos/${repo}\`)`，`Accept: application/vnd.github+json`；有 `token` 时加 `Authorization: Bearer ${token}`。非 2xx 或抛错返回 `null`。字段映射：`stargazers_count`→stars、`forks_count`→forks、`topics`→topics、`description`→description、`language`→language。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/github.test.js`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/collect/github.js tests/github.test.js
git commit -m "feat: fetch repo details from GitHub API"
```

---

## Task 6: 周增量计算

**Files:**
- Create: `src/collect/delta.js`
- Test: `tests/delta.test.js`

**Interfaces:**
- Produces: `computeStarsGained(prevProjects: Array<{ repo, stars }>, currentProjects: Array<{ repo, stars }>) -> currentProjects 的副本，每项追加 starsGained: number | null`。
- Consumes: 无。

- [ ] **Step 1: 写失败测试**

```js
// 两个项目上周都在：增量 = 本周 - 上周
// prev=[{repo:'a/b',stars:10}], current=[{repo:'a/b',stars:13}] → starsGained 3
// 项目上周不存在（首现）：starsGained 为 null
// prev 为空数组：所有 current 的 starsGained 为 null
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/delta.test.js`
Expected: FAIL。

- [ ] **Step 3: 实现 `computeStarsGained`**

先由 `prevProjects` 建 `Map<repo, stars>`，`map` 当前项目，`starsGained = prevMap.has(repo) ? stars - prevMap.get(repo) : null`。不修改入参。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/delta.test.js`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/collect/delta.js tests/delta.test.js
git commit -m "feat: compute weekly star gain from snapshots"
```

---

## Task 7: 采集组装与存储

**Files:**
- Create: `src/collect/collect.js`, `src/collect/store.js`, `scripts/fetch.mjs`
- Test: `tests/collect.test.js`, `tests/store.test.js`

**Interfaces:**
- Produces:
  - `collect({ getBoards, getRepoDetails }) -> Promise<weekData>`，其中 `getBoards(board: string) -> Promise<string>`（HTML），`getRepoDetails(repo) -> Promise<RepoDetails|null>`。`weekData` 结构与 Spec §8 的 `2026-W45.json` 一致（含 `week, generatedAt, sources, projects[]`，`projects[]` 已带 `domain, boards, rank, starsGained`）。
  - `readPrevWeek(dir: string, currentWeek: string) -> prevWeekData | null`：读 `dir/index.json`，找不到当前周之前的周（含 index 不存在）返回 `null`。
  - `writeWeek(dir: string, weekData) -> void`；`writeIndex(dir: string, weeks: string[]) -> void`。
- Consumes: Task 2 `isoWeek`、Task 3 `classify`、Task 4 `parseTrending`、Task 6 `computeStarsGained`。

- [ ] **Step 1: 写 store 失败测试（tmpdir）**

```js
// writeWeek + readPrevWeek 往返：写 2026-W44、2026-W45，改 index.json，readPrevWeek('2026-W45') 返回 W44 数据
// readPrevWeek 在只有当前周或空目录时返回 null
// writeIndex 后 index.json 含 { weeks:[...], latest }
```

- [ ] **Step 2: 写 collect 失败测试（注入 fake）**

```js
// getBoards 按 board 返回两个 fixture HTML；getRepoDetails 返回固定假数据（其中一个返回 null）
// 断言：去重正确；总数截断到 80；总榜优先在前；每个项目有 domain；starsGained 正确（无上周时全 null）；
// rank 按 starsGained 降序从 1 递增；sources.trending === 'ok'；boards 记录了出现在哪些榜
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run tests/collect.test.js tests/store.test.js`
Expected: FAIL。

- [ ] **Step 4: 实现 `store.js` 与 `collect.js`**

`store.js`：`writeWeek` 序列化 `JSON.stringify(weekData, null, 2)` 写 `dir/<week>.json`；`writeIndex` 写 `{ weeks, latest: weeks.at(-1) }`；`readPrevWeek` 读 index、取 `latest` 之前最后一个存在的 `<week>.json`。
`collect.js`：boards = `['overall', 'python', 'typescript', 'javascript', 'rust', 'go', 'java', 'cpp', 'csharp', 'php', 'swift']`；对每个 board `getBoards` → `parseTrending`；按 `repo` 去重、累计 `boards`；排序（`overall` 优先，再按出现 board 数降序）截断 80；对每个 repo `getRepoDetails`，失败/`null` 时保留 `{ repo, url }`、数值字段置 `null`；跑 `classify`、`computeStarsGained`（用 `readPrevWeek` 的结果）；按 `starsGained` 降序（`null` 排末尾）、再按总 `stars` 降序排序，填 `rank`；`week = isoWeek(new Date())`、`generatedAt = new Date().toISOString()`、`sources = { trending: boards 全部解析成功的计数>0 ? 'ok' : 'fallback', api: 'ok' }`。

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run tests/collect.test.js tests/store.test.js`
Expected: PASS。

- [ ] **Step 6: 写 `scripts/fetch.mjs`（真实接线，薄层）**

无单测（依赖网络）——它只做三件事：定义真实 `getBoards`（`fetch('https://github.com/trending' + (board==='overall' ? '' : '/'+board) + '?since=weekly')`，非 2xx 抛错）、真实 `getRepoDetails`（复用 Task 5）、调用 `collect` 后用 `writeWeek`/`writeIndex` 写回 `data/weeks/`。

- [ ] **Step 7: 提交**

```bash
git add src/collect/collect.js src/collect/store.js scripts/fetch.mjs tests/collect.test.js tests/store.test.js
git commit -m "feat: orchestrate weekly collection and storage"
```

---

## Task 8: 前端筛选逻辑

**Files:**
- Create: `src/filter/index.js`
- Test: `tests/filter.test.js`

**Interfaces:**
- Produces: `filterProjects(projects, { languages = [], domains = [], sort = 'gained', query = '' }) -> projects`（纯函数，返回新数组）。`sort` 取值 `'gained' | 'stars'`。

- [ ] **Step 1: 写失败测试**

```js
// 语言筛选：languages:['Rust'] 只留 language==='Rust'
// 领域筛选：domains:['ai','db'] 留 domain 命中者
// 组合：语言与领域同时满足
// 排序：sort:'gained' 按 starsGained 降序且 null 在末尾；sort:'stars' 按 stars 降序
// 搜索：query 命中 name 或 description（不分大小写）
// 全部默认参数：返回浅拷贝、顺序不变
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/filter.test.js`
Expected: FAIL。

- [ ] **Step 3: 实现 `filterProjects`**

链式 `filter` + `sort`；`null` 的 `starsGained` 在降序里排末位（`(a.starsGained ?? -Infinity) - (b.starsGained ?? -Infinity)` 取反即实现）。`query` 用小写拼接比较。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/filter.test.js`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/filter/index.js tests/filter.test.js
git commit -m "feat: add pure filter and sort for projects"
```

---

## Task 9: Astro 页面

**Files:**
- Create: `src/components/ProjectCard.astro`, `src/components/FilterBar.astro`, `src/layouts/Base.astro`, `src/scripts/main.js`（客户端挂载筛选）、放一个种子数据 `data/weeks/2026-W45.json` + `data/weeks/index.json`
- Modify: `src/pages/index.astro`, `src/styles/global.css`

**Interfaces:**
- Produces: 构建出的单页；页面从 `data/weeks/` 读取所有周，渲染当周列表；客户端 `main.js` 复用 Task 8 `filterProjects` 完成筛选/排序/搜索，并把状态写进 URL query。
- Consumes: Task 8 `filterProjects`。

- [ ] **Step 1: 种子数据**

手写 `data/weeks/2026-W45.json`（2~3 个假项目，字段齐全，含 `starsGained: null` 的「首周收录」样例）与 `data/weeks/index.json`（`{weeks:['2026-W45'], latest:'2026-W45'}`），供构建与本次测试用；后续被真实采集覆盖。

- [ ] **Step 2: 实现页面与组件**

`index.astro` 构建期 `import.meta.glob('../data/weeks/*.json')` 读取数据；顶部输出周选择器（默认 `index.latest`）、语言/领域 chips、排序与搜索框；列表未选领域时按领域分组、组内按 `starsGained` 降序；卡片显示排名、仓库名（链到 `url`）、英文描述、语言、`+N ⭐`（`null` 显示「首周收录」）、总 ⭐、领域标签。客户端 `main.js` 从 URL query 还原筛选，调用 `filterProjects` 重排 DOM。`global.css` 完成深色主题与卡片样式。

- [ ] **Step 3: 构建验证（含真实仓库名）**

Run: `npm run build`，然后断言 `dist/index.html` 含种子数据里的仓库名与「首周收录」字样。
Expected: 命中。

- [ ] **Step 4: 空状态测试（Review Focus 5）**

临时把种子 `projects` 改为 `[]`，重新 `npm run build`，断言 `dist/index.html` 含「本周暂无数据」。测完恢复种子。

- [ ] **Step 5: 提交**

```bash
git add src/pages src/components src/layouts src/scripts src/styles src/filter data
git commit -m "feat: render weekly trending page with filters"
```

---

## Task 10: GitHub Actions 定时 + 部署 + README

**Files:**
- Create: `.github/workflows/weekly.yml`, `README.md`
- Modify: `astro.config.mjs`（读取 `process.env.SITE_BASE`，默认 `/`）

**Interfaces:**
- Produces: 每周自动「采集 → 提交数据 → 构建 → 部署 Pages」的完整流水线。

- [ ] **Step 1: 写 workflow**

```yaml
name: weekly
on:
  schedule:
    - cron: "0 0 * * 1"
  workflow_dispatch:
permissions:
  contents: write
  pages: write
  id-token: write
jobs:
  collect-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run fetch
        env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
      - run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add data && git commit -m "data: collect $(date -u +%Y-W%V)" || echo "no changes"
          git push
      - run: npm run build
        env: { SITE_BASE: "/${{ github.event.repository.name }}" }
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 改 `astro.config.mjs` 支持 base**

```js
export default { base: process.env.SITE_BASE || '/' };
```

- [ ] **Step 3: 本地端到端干跑验证**

Run: `npm run fetch`（需 `GITHUB_TOKEN` 环境变量），再 `SITE_BASE=/repo npm run build`
Expected: `npm run fetch` 产出非空 `data/weeks/<当前周>.json`；构建成功。

- [ ] **Step 4: 写 README**

记录：是什么、本地 `npm install && npm run dev`、`npm run fetch`、部署到 GitHub Pages 的步骤（建仓 → 开启 Pages 用 Actions 方式 → 手动 dispatch 一次）。

- [ ] **Step 5: 提交**

```bash
git add .github/workflows/weekly.yml README.md astro.config.mjs
git commit -m "chore: add weekly actions workflow and README"
```

---

## Self-Review 结论（写完后核对）

- **Spec coverage**：§2 目标 1-6 由 Task 7/9/10 覆盖；§8 数据模型由 Task 7 覆盖；§9 分类由 Task 3；§10 选型由 Task 1/4/5/10；§11 采集流程与失败回退由 Task 4/5/7（`sources` 字段）；§13 验收标准 1-8 分别落点于 Task 7、4、6、3、9、9、9、10。
- **Review Focus**：5 条均已在对应任务写了测试或验证步骤，无遗漏。
- **比例**：计划以签名与测试断言为主，未誊抄实现代码（关键词表是唯一成段数据，属 spec 决定项）。
- **类型一致性**：`RepoDetails`、`parseTrending` 返回值、`computeStarsGained` 的 `{repo, stars}` 形状、`filterProjects` 参数在 Task 5-9 间一致；`collect` 消费 `parseTrending` 数组项字段与 Task 4 产出一致。